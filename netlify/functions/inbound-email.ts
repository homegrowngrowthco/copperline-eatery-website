import type { Context } from '@netlify/functions';
import { getStore } from '@netlify/blobs';
import Anthropic from '@anthropic-ai/sdk';
import { ServerClient } from 'postmark';
import { Octokit } from '@octokit/rest';

const VISION_MODEL = 'claude-sonnet-4-6';
const TEXT_MODEL = 'claude-haiku-4-5-20251001';
const VISION_PROMPT =
  'Extract all specials from this menu board image. Return only valid JSON in this format: { "specials": [ { "name": string, "description": string, "price": string } ] }. If a field is not visible, use null.';
const SPECIALS_DATA_PATH = 'src/data/specials.json';
const PENDING_STORE = 'pending-specials';
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] as const;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const REPLY_TO_ADDRESS = 'specials-bot@parse.copperlineeatery.com';
const PENDING_TTL_MS = 24 * 60 * 60 * 1000;

const YES_PATTERN = /^\s*(?:yes|publish|confirm|y)\b(?:\s+(?:please|thanks|thx))*\s*[.!]*\s*$/i;
const NO_PATTERN = /^\s*(?:no|nope|n|cancel|stop|decline|discard|nevermind|never\s*mind)\b(?:\s+(?:please|thanks|thx))*\s*[.!]*\s*$/i;

type AllowedImageType = (typeof ALLOWED_IMAGE_TYPES)[number];

interface Special {
  name: string;
  description: string | null;
  price: string | null;
}

interface PendingImage {
  content: string; // base64
  contentType: string;
  name: string;
}

interface PendingBatch {
  batchId: string;
  specials: Special[];
  originalSender: string;
  originalMessageId: string;
  createdAt: string;
  image?: PendingImage; // source photo, re-shown inline in every confirmation round
}

interface PostmarkAttachment {
  Name: string;
  Content: string;
  ContentType: string;
  ContentLength: number;
}

interface PostmarkInbound {
  From: string;
  FromFull?: { Email: string; Name: string };
  Subject?: string;
  MessageID: string;
  TextBody?: string;
  HtmlBody?: string;
  Headers?: Array<{ Name: string; Value: string }>;
  Attachments?: PostmarkAttachment[];
}

export default async (req: Request, _context: Context): Promise<Response> => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  if (!checkBasicAuth(req)) return new Response('Unauthorized', { status: 401 });

  let inbound: PostmarkInbound;
  try {
    inbound = (await req.json()) as PostmarkInbound;
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  const sender = (inbound.FromFull?.Email || inbound.From || '').toLowerCase();
  if (!senderAllowed(sender)) {
    console.warn('Rejected email from non-allowlisted sender:', sender);
    return new Response('OK', { status: 200 });
  }

  await purgeOldPendingBatches().catch((e) => console.warn('purge failed (non-fatal):', e));

  const inReplyTo = headerValue(inbound, 'In-Reply-To') || '';
  const batchMatch = inReplyTo.match(/<batch-([a-f0-9-]+)@/i);

  try {
    if (batchMatch) {
      await handleConfirmationReply(batchMatch[1], inbound);
    } else {
      await handleNewPhoto(inbound);
    }
  } catch (err) {
    console.error('Handler error:', err);
    await safeReply(inbound, `Something went wrong: ${(err as Error).message}. Please try again.`);
  }

  return new Response('OK', { status: 200 });
};

function checkBasicAuth(req: Request): boolean {
  const expectedUser = process.env.POSTMARK_WEBHOOK_USER;
  const expectedPass = process.env.POSTMARK_WEBHOOK_PASS;
  if (!expectedUser || !expectedPass) return false;

  const header = req.headers.get('authorization') || '';
  if (!header.startsWith('Basic ')) return false;

  try {
    const decoded = Buffer.from(header.slice(6), 'base64').toString('utf8');
    const idx = decoded.indexOf(':');
    if (idx === -1) return false;
    return decoded.slice(0, idx) === expectedUser && decoded.slice(idx + 1) === expectedPass;
  } catch {
    return false;
  }
}

function senderAllowed(sender: string): boolean {
  const allowed = (process.env.ALLOWED_SENDER_EMAILS || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return allowed.includes(sender);
}

function headerValue(inbound: PostmarkInbound, name: string): string | null {
  const target = name.toLowerCase();
  const hit = inbound.Headers?.find((h) => h.Name.toLowerCase() === target);
  return hit?.Value ?? null;
}

function stripEmailQuoting(raw: string): string {
  let body = raw;
  // "On <date>, <sender> wrote:" attribution (Gmail/Apple Mail). The line break between
  // "<sender>" and "wrote:" plus a missing trailing newline (when wrote: is the last
  // line after `>`-stripping) means we need [\s\S] not `.`, and \n? not \n.
  const onWroteMatch = body.match(/\n+On [\s\S]{0,300}?wrote:[ \t]*\n?/);
  if (onWroteMatch?.index !== undefined) body = body.slice(0, onWroteMatch.index);
  // Outlook quote header.
  const outlookMatch = body.match(/\n+(From:|-+\s*Original Message\s*-+)/i);
  if (outlookMatch?.index !== undefined) body = body.slice(0, outlookMatch.index);
  body = body
    .split('\n')
    .filter((line) => !line.trim().startsWith('>'))
    .join('\n');
  const sigIdx = body.search(/\n--\s*\n/);
  if (sigIdx >= 0) body = body.slice(0, sigIdx);
  // Common mobile signatures that don't use the standard "-- " separator.
  body = body.replace(/\n+(Sent from my (iPhone|iPad|Android|mobile device|Galaxy)[\s\S]*)$/i, '');
  body = body.replace(/\n+(Get Outlook for (iOS|Android)[\s\S]*)$/i, '');
  return body.trim();
}

function htmlToText(html: string): string {
  if (!html) return '';
  let s = html;
  s = s.replace(/<style[\s\S]*?<\/style>/gi, '');
  s = s.replace(/<script[\s\S]*?<\/script>/gi, '');
  s = s.replace(/<\/(p|div|li|h[1-6]|tr)>/gi, '\n');
  s = s.replace(/<br\s*\/?>/gi, '\n');
  s = s.replace(/<[^>]+>/g, '');
  s = s
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)));
  return s.replace(/[ \t]+/g, ' ').replace(/\n[ \t]+/g, '\n').trim();
}

function extractReplyBody(inbound: PostmarkInbound): string {
  const textSource = inbound.TextBody && inbound.TextBody.trim()
    ? inbound.TextBody
    : htmlToText(inbound.HtmlBody || '');
  return stripEmailQuoting(textSource);
}

async function purgeOldPendingBatches() {
  const store = getStore(PENDING_STORE);
  const { blobs } = await store.list();
  const cutoff = Date.now() - PENDING_TTL_MS;
  let purged = 0;
  for (const blob of blobs) {
    const batch = (await store.get(blob.key, { type: 'json' })) as PendingBatch | null;
    if (!batch?.createdAt || new Date(batch.createdAt).getTime() < cutoff) {
      await store.delete(blob.key);
      purged++;
    }
  }
  if (purged > 0) console.log(`Purged ${purged} orphaned pending batches`);
}

async function handleNewPhoto(inbound: PostmarkInbound) {
  const image = (inbound.Attachments || []).find((a) =>
    (ALLOWED_IMAGE_TYPES as readonly string[]).includes(a.ContentType),
  );
  if (!image) {
    await safeReply(
      inbound,
      "I didn't find a supported image attached (JPEG, PNG, GIF, or WebP). Please reply with a photo of the specials board.",
    );
    return;
  }
  if (image.ContentLength > MAX_IMAGE_BYTES) {
    await safeReply(
      inbound,
      `That image is too large (${(image.ContentLength / 1024 / 1024).toFixed(1)} MB, max 5 MB). Please resize and resend.`,
    );
    return;
  }

  const specials = await extractSpecialsFromImage(image);
  if (specials.length === 0) {
    await safeReply(inbound, "I couldn't read any specials from that image. Please send a clearer photo.");
    return;
  }

  const sourceImage: PendingImage = {
    content: image.Content,
    contentType: image.ContentType,
    name: image.Name || 'specials-photo',
  };

  const batchId = crypto.randomUUID();
  const pending: PendingBatch = {
    batchId,
    specials,
    originalSender: inbound.FromFull?.Email || inbound.From,
    originalMessageId: inbound.MessageID,
    createdAt: new Date().toISOString(),
    image: sourceImage,
  };

  await getStore(PENDING_STORE).setJSON(batchId, pending);

  await sendReply(inbound, {
    subject: replySubject(inbound.Subject),
    body: buildConfirmationEmailBody(specials),
    messageId: `<batch-${batchId}@copperlineeatery.com>`,
    image: sourceImage,
  });
}

async function handleConfirmationReply(batchId: string, inbound: PostmarkInbound) {
  const store = getStore(PENDING_STORE);
  const pending = (await store.get(batchId, { type: 'json' })) as PendingBatch | null;

  if (!pending) {
    await safeReply(
      inbound,
      "I couldn't find that pending batch — it may have already been published, declined, or expired. Please send a fresh photo.",
    );
    return;
  }

  const body = extractReplyBody(inbound);
  console.log(`Reply body (batch=${batchId}, len=${body.length}): ${body.slice(0, 200)}`);

  if (!body) {
    await safeReply(
      inbound,
      'I got an empty reply (no text body found in your message). Reply YES to publish, NO to discard, or send corrections like "Change item 2 to $14, remove item 4".',
    );
    return;
  }

  if (YES_PATTERN.test(body)) {
    await commitSpecialsToRepo(pending.specials);
    await store.delete(batchId);
    const count = pending.specials.length;
    await safeReply(
      inbound,
      `Published ${count} special${count === 1 ? '' : 's'}. The site will rebuild and go live in about 30 seconds.`,
    );
    return;
  }

  if (NO_PATTERN.test(body)) {
    await store.delete(batchId);
    await safeReply(inbound, "Got it — discarding those specials, not publishing. Send a fresh photo when you're ready.");
    return;
  }

  let corrected: Special[];
  try {
    corrected = await applyCorrections(pending.specials, body);
  } catch (e) {
    console.error('Corrections failed:', e);
    await safeReply(
      inbound,
      `I couldn't apply those changes (${(e as Error).message}). Reply YES to publish the current list, NO to discard, or rephrase your corrections.`,
    );
    return;
  }

  if (corrected.length === 0) {
    await safeReply(
      inbound,
      "I couldn't apply those changes — the result was empty. Reply YES to publish the current list, NO to discard, or rephrase your corrections.",
    );
    return;
  }

  const newBatchId = crypto.randomUUID();
  const newPending: PendingBatch = {
    batchId: newBatchId,
    specials: corrected,
    originalSender: pending.originalSender,
    originalMessageId: pending.originalMessageId,
    createdAt: pending.createdAt,
    image: pending.image,
  };
  await store.setJSON(newBatchId, newPending);
  await store.delete(batchId);

  await sendReply(inbound, {
    subject: replySubject(inbound.Subject),
    body: buildCorrectedEmailBody(corrected),
    messageId: `<batch-${newBatchId}@copperlineeatery.com>`,
    image: pending.image,
  });
}

async function extractSpecialsFromImage(attachment: PostmarkAttachment): Promise<Special[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set');

  const anthropic = new Anthropic({ apiKey });
  const response = await anthropic.messages.create({
    model: VISION_MODEL,
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: attachment.ContentType as AllowedImageType,
              data: attachment.Content,
            },
          },
          { type: 'text', text: VISION_PROMPT },
        ],
      },
    ],
  });

  const textBlock = response.content.find((c) => c.type === 'text');
  if (!textBlock || textBlock.type !== 'text') throw new Error('Vision response had no text block');
  return parseSpecialsJson(textBlock.text);
}

async function applyCorrections(current: Special[], userReply: string): Promise<Special[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set');

  const prompt = [
    'You help restaurant staff revise a list of daily specials.',
    '',
    'CURRENT_SPECIALS (JSON):',
    JSON.stringify({ specials: current }, null, 2),
    '',
    'STAFF_REPLY:',
    userReply,
    '',
    "Apply the staff's changes to CURRENT_SPECIALS and return ONLY valid JSON in this shape (no commentary, no markdown fences):",
    '{ "specials": [ { "name": string, "description": string | null, "price": string | null } ] }',
    '',
    'Rules:',
    '- Apply specific edits the staff describes (rename, re-price, remove, add, reorder).',
    '- Preserve original order unless the staff explicitly asks to reorder.',
    '- Preserve price format (keep or drop "$" as the staff wrote it).',
    '- If the staff reply is unclear or contains no concrete edits, return CURRENT_SPECIALS unchanged.',
  ].join('\n');

  const anthropic = new Anthropic({ apiKey });
  const response = await anthropic.messages.create({
    model: TEXT_MODEL,
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  });

  const textBlock = response.content.find((c) => c.type === 'text');
  if (!textBlock || textBlock.type !== 'text') throw new Error('Correction response had no text block');
  return parseSpecialsJson(textBlock.text);
}

function parseSpecialsJson(text: string): Special[] {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error(`No JSON in response: ${text.slice(0, 200)}`);

  let parsed: { specials?: unknown };
  try {
    parsed = JSON.parse(jsonMatch[0]);
  } catch (e) {
    throw new Error(`Invalid JSON: ${(e as Error).message}`);
  }
  if (!Array.isArray(parsed.specials)) throw new Error('Response missing "specials" array');

  return parsed.specials
    .filter((s: unknown): s is { name: unknown; description?: unknown; price?: unknown } => {
      return (
        !!s &&
        typeof s === 'object' &&
        typeof (s as { name: unknown }).name === 'string' &&
        !!(s as { name: string }).name.trim()
      );
    })
    .map((s) => ({
      name: String(s.name).trim(),
      description: s.description ? String(s.description).trim() : null,
      price: s.price ? String(s.price).trim() : null,
    }));
}

async function commitSpecialsToRepo(specials: Special[]) {
  const token = process.env.GITHUB_TOKEN;
  const repoEnv = process.env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH || 'master';
  if (!token || !repoEnv) throw new Error('GITHUB_TOKEN or GITHUB_REPO not set');

  const [owner, repo] = repoEnv.split('/');
  if (!owner || !repo) throw new Error(`GITHUB_REPO must be "owner/repo", got: ${repoEnv}`);

  const octokit = new Octokit({ auth: token });

  let sha: string | undefined;
  try {
    const { data } = await octokit.repos.getContent({ owner, repo, path: SPECIALS_DATA_PATH, ref: branch });
    if (!Array.isArray(data) && 'sha' in data) sha = data.sha;
  } catch (e) {
    const status = (e as { status?: number }).status;
    if (status !== 404) throw e;
  }

  const payload = { updatedAt: new Date().toISOString(), specials };
  const content = Buffer.from(JSON.stringify(payload, null, 2) + '\n').toString('base64');

  await octokit.repos.createOrUpdateFileContents({
    owner,
    repo,
    path: SPECIALS_DATA_PATH,
    branch,
    sha,
    message: `chore(specials): update daily specials (${specials.length} items)`,
    content,
  });
}

function buildConfirmationEmailBody(specials: Special[]): string {
  return buildEmailBody(
    specials,
    `I extracted ${specials.length} special${specials.length === 1 ? '' : 's'} from your photo:`,
  );
}

function buildCorrectedEmailBody(specials: Special[]): string {
  return buildEmailBody(
    specials,
    `Updated specials (${specials.length} item${specials.length === 1 ? '' : 's'}):`,
  );
}

function buildEmailBody(specials: Special[], header: string): string {
  const lines = specials.map((s, i) => {
    const parts = [`${i + 1}. ${s.name}`];
    if (s.price) parts.push(`   Price: ${s.price.startsWith('$') ? s.price : '$' + s.price}`);
    if (s.description) parts.push(`   ${s.description}`);
    return parts.join('\n');
  });
  return [
    header,
    '',
    ...lines,
    '',
    'Reply YES to publish on the website.',
    'Reply NO to discard.',
    'Or reply with corrections (e.g. "Change item 2 to $14, remove item 4") and I\'ll revise the list.',
  ].join('\n');
}

function replySubject(original: string | undefined): string {
  const base = original || 'Specials';
  return base.toLowerCase().startsWith('re:') ? base : `Re: ${base}`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Build an HTML body that shows the source photo at the top (so staff can
// eyeball the extraction against the board) followed by the plain-text body.
function buildHtmlBody(body: string, cid: string): string {
  const textHtml = escapeHtml(body).replace(/\n/g, '<br>');
  return [
    '<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#222;">',
    `<p style="margin:0 0 12px;">Here's the photo I read (check it against the list below):</p>`,
    `<img src="cid:${cid}" alt="Specials board photo" style="max-width:100%;height:auto;border:1px solid #ddd;border-radius:6px;margin-bottom:16px;" />`,
    `<div>${textHtml}</div>`,
    '</div>',
  ].join('\n');
}

async function sendReply(
  inbound: PostmarkInbound,
  opts: { subject: string; body: string; messageId?: string; image?: PendingImage },
) {
  const token = process.env.POSTMARK_SERVER_TOKEN;
  const from = process.env.SPECIALS_FROM_ADDRESS;
  if (!token || !from) throw new Error('POSTMARK_SERVER_TOKEN or SPECIALS_FROM_ADDRESS not set');

  const headers: Array<{ Name: string; Value: string }> = [];
  if (opts.messageId) headers.push({ Name: 'Message-ID', Value: opts.messageId });
  if (inbound.MessageID) {
    const ref = inbound.MessageID.startsWith('<') ? inbound.MessageID : `<${inbound.MessageID}>`;
    headers.push({ Name: 'In-Reply-To', Value: ref });
    headers.push({ Name: 'References', Value: ref });
  }

  // When a source image is provided, attach it inline (referenced by ContentID)
  // and render an HTML body that displays it above the text. The TextBody stays
  // as the plain-text fallback for clients that don't render HTML.
  let htmlBody: string | undefined;
  let attachments: Array<{ Name: string; Content: string; ContentType: string; ContentID: string }> | undefined;
  if (opts.image) {
    const cid = `specials-source-${(opts.messageId || 'photo').replace(/[^a-zA-Z0-9]/g, '')}`;
    htmlBody = buildHtmlBody(opts.body, cid);
    attachments = [
      {
        Name: opts.image.name,
        Content: opts.image.content,
        ContentType: opts.image.contentType,
        ContentID: `cid:${cid}`,
      },
    ];
  }

  const client = new ServerClient(token);
  await client.sendEmail({
    From: from,
    ReplyTo: REPLY_TO_ADDRESS,
    To: inbound.FromFull?.Email || inbound.From,
    Subject: opts.subject,
    TextBody: opts.body,
    HtmlBody: htmlBody,
    Attachments: attachments,
    Headers: headers.length > 0 ? headers : undefined,
    MessageStream: 'outbound',
  });
}

async function safeReply(inbound: PostmarkInbound, body: string) {
  try {
    await sendReply(inbound, { subject: replySubject(inbound.Subject), body });
  } catch (e) {
    console.error('Failed to send reply:', e);
  }
}
