import type { Context } from '@netlify/functions';
import { getStore } from '@netlify/blobs';
import Anthropic from '@anthropic-ai/sdk';
import { ServerClient } from 'postmark';
import { Octokit } from '@octokit/rest';
import {
  extractSpecialsFromImage,
  parseExtractionResult,
  ALLOWED_IMAGE_TYPES,
  MAX_IMAGE_BYTES,
  PENDING_STORE,
  type Special,
} from './lib/specials';

const TEXT_MODEL = 'claude-haiku-4-5-20251001';
const SPECIALS_DATA_PATH = 'src/data/specials.json';
const REPLY_TO_ADDRESS = 'specials-bot@parse.copperlineeatery.com';
const PENDING_TTL_MS = 24 * 60 * 60 * 1000;

// Auto-publish trusted-sender photos that score at or above this confidence threshold.
// Set AUTO_PUBLISH_THRESHOLD env var to override (0 = always manual, 100 = always manual).
const AUTO_PUBLISH_THRESHOLD = parseInt(process.env.AUTO_PUBLISH_THRESHOLD || '85', 10);

function getReviewerEmails(): string[] {
  return (process.env.REVIEWER_EMAILS || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

const YES_PATTERN = /^\s*(?:yes|publish|confirm|y)\b(?:\s+(?:please|thanks|thx))*\s*[.!]*\s*$/i;
const NO_PATTERN = /^\s*(?:no|nope|n|cancel|stop|decline|discard|nevermind|never\s*mind)\b(?:\s+(?:please|thanks|thx))*\s*[.!]*\s*$/i;

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
  image?: PendingImage;
  reviewerMode?: boolean;   // true = confirmation went to reviewers, not back to submitter
  submittedBy?: string;     // original public submitter's address (reviewer-mode email path)
  submissionSource?: 'email' | 'web';
  confidence?: number;
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
  const inReplyTo = headerValue(inbound, 'In-Reply-To') || '';
  // Accept both `<batch-uuid@...>` (standard) and `batch-uuid@...` (angle-brackets stripped by some servers).
  const batchMatch = inReplyTo.match(/<?\s*batch-([a-f0-9-]+)@/i);
  const trusted = isTrustedSender(sender);

  console.log(`Routing: sender=${sender}, inReplyTo=${inReplyTo.slice(0, 120)}, batchMatch=${batchMatch?.[1] ?? 'null'}, trusted=${trusted}`);

  await purgeOldPendingBatches().catch((e) => console.warn('purge failed (non-fatal):', e));

  // Batch replies are authenticated by UUID — skip the sender gate.
  // Unknown senders with no batch reply are treated as public photo submissions
  // (confirmation goes to reviewers, not back to the submitter).
  if (!batchMatch && !trusted) {
    await handleNewPhoto(inbound, false).catch((e) =>
      console.error('Public photo handler error:', e),
    );
    return new Response('OK', { status: 200 });
  }

  try {
    if (batchMatch) {
      await handleConfirmationReply(batchMatch[1], inbound);
    } else {
      await handleNewPhoto(inbound, true);
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

function isTrustedSender(sender: string): boolean {
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
  const onWroteMatch = body.match(/\n+On [\s\S]{0,300}?wrote:[ \t]*\n?/);
  if (onWroteMatch?.index !== undefined) body = body.slice(0, onWroteMatch.index);
  const outlookMatch = body.match(/\n+(From:|-+\s*Original Message\s*-+)/i);
  if (outlookMatch?.index !== undefined) body = body.slice(0, outlookMatch.index);
  body = body
    .split('\n')
    .filter((line) => !line.trim().startsWith('>'))
    .join('\n');
  const sigIdx = body.search(/\n--\s*\n/);
  if (sigIdx >= 0) body = body.slice(0, sigIdx);
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
  const textSource =
    inbound.TextBody && inbound.TextBody.trim()
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

async function handleNewPhoto(inbound: PostmarkInbound, trusted: boolean) {
  const image = (inbound.Attachments || []).find((a) =>
    (ALLOWED_IMAGE_TYPES as readonly string[]).includes(a.ContentType),
  );

  if (!image) {
    if (trusted) {
      await safeReply(
        inbound,
        "I didn't find a supported image attached (JPEG, PNG, GIF, or WebP). Please reply with a photo of the specials board.",
      );
    }
    return;
  }

  if (image.ContentLength > MAX_IMAGE_BYTES) {
    if (trusted) {
      await safeReply(
        inbound,
        `That image is too large (${(image.ContentLength / 1024 / 1024).toFixed(1)} MB, max 5 MB). Please resize and resend.`,
      );
    }
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set');

  const result = await extractSpecialsFromImage({
    content: image.Content,
    contentType: image.ContentType,
    apiKey,
  });

  console.log(
    `Vision result: confidence=${result.confidence}%, specials=${result.specials.length}, trusted=${trusted}`,
  );

  if (result.specials.length === 0) {
    if (trusted) {
      await safeReply(
        inbound,
        "I couldn't read any specials from that image. Please send a clearer photo.",
      );
    }
    return;
  }

  const sourceImage: PendingImage = {
    content: image.Content,
    contentType: image.ContentType,
    name: image.Name || 'specials-photo',
  };

  // Auto-publish for trusted senders above the confidence threshold.
  if (trusted && result.confidence >= AUTO_PUBLISH_THRESHOLD) {
    console.log(
      `Auto-publishing ${result.specials.length} specials (confidence ${result.confidence}% >= ${AUTO_PUBLISH_THRESHOLD}%)`,
    );
    await commitSpecialsToRepo(result.specials);
    await safeReply(
      inbound,
      [
        `Auto-published ${result.specials.length} special${result.specials.length === 1 ? '' : 's'} (confidence ${result.confidence}%). Live in ~30 seconds.`,
        '',
        result.specials.map((s: Special, i: number) => {
          const parts = [`${i + 1}. ${s.name}`];
          if (s.price) parts.push(`   ${s.price.startsWith('$') ? s.price : '$' + s.price}`);
          if (s.description) parts.push(`   ${s.description}`);
          return parts.join('\n');
        }).join('\n'),
        '',
        'If anything looks wrong, send a corrected photo to republish.',
      ].join('\n'),
    );
    return;
  }

  // Below threshold or public sender: create a pending batch for manual review.
  const sender = (inbound.FromFull?.Email || inbound.From || '').toLowerCase();
  const reviewerMode = !trusted;
  const batchId = crypto.randomUUID();

  const pending: PendingBatch = {
    batchId,
    specials: result.specials,
    originalSender: sender,
    originalMessageId: inbound.MessageID,
    createdAt: new Date().toISOString(),
    image: sourceImage,
    reviewerMode,
    submittedBy: reviewerMode ? sender : undefined,
    submissionSource: 'email',
    confidence: result.confidence,
  };

  await getStore(PENDING_STORE).setJSON(batchId, pending);

  const confidenceNote =
    trusted && result.confidence < AUTO_PUBLISH_THRESHOLD
      ? `\n(Confidence: ${result.confidence}% — below the ${AUTO_PUBLISH_THRESHOLD}% auto-publish threshold. Manual review needed.)`
      : '';

  if (reviewerMode) {
    // Public sender: route confirmation to reviewers.
    const reviewerEmails = getReviewerEmails();
    if (reviewerEmails.length === 0) {
      console.warn('REVIEWER_EMAILS not set — cannot route public submission');
      return;
    }
    const contextLine = `A photo was submitted by ${sender || 'an unknown sender'}.`;
    const itemCount = result.specials.length;
    const lowCountWarning = itemCount <= 3
      ? `\n⚠️ Only ${itemCount} item${itemCount === 1 ? '' : 's'} extracted — the photo may not show the full board. Check the image above before publishing.`
      : '';
    await sendDirectEmail({
      to: reviewerEmails.join(', '),
      subject: `Specials Submission — ${itemCount} item${itemCount === 1 ? '' : 's'} — Review Required`,
      body: buildEmailBody(result.specials, contextLine + '\n' + `I extracted ${itemCount} special${itemCount === 1 ? '' : 's'}:` + confidenceNote + lowCountWarning),
      messageId: `<batch-${batchId}@copperlineeatery.com>`,
      image: sourceImage,
    });
  } else {
    // Trusted sender below threshold: send YES-gate back to them.
    await sendReply(inbound, {
      subject: replySubject(inbound.Subject),
      body: buildConfirmationEmailBody(result.specials) + confidenceNote,
      messageId: `<batch-${batchId}@copperlineeatery.com>`,
      image: sourceImage,
    });
  }
}

async function handleConfirmationReply(batchId: string, inbound: PostmarkInbound) {
  const store = getStore(PENDING_STORE);
  const pending = (await store.get(batchId, { type: 'json' })) as PendingBatch | null;

  if (!pending) {
    await safeReply(
      inbound,
      "That batch has already been published, discarded, or expired. If you need to update specials again, send a fresh photo or use the specials form.",
    );
    return;
  }

  const body = extractReplyBody(inbound);

  if (!body) {
    await safeReply(
      inbound,
      'I got an empty reply (no text body found in your message). Reply YES to publish, NO to discard, or send corrections like "Change item 2 to $14, remove item 4".',
    );
    return;
  }

  // Test YES/NO against the first non-empty line only.
  // Email signatures without the `-- ` delimiter survive stripEmailQuoting and would
  // otherwise cause "YES\nIan Chamberland\n..." to fall through to the corrections flow.
  const firstLine = body.split('\n').map((l) => l.trim()).find((l) => l.length > 0) || '';
  console.log(`Reply body (batch=${batchId}, len=${body.length}): ${body.slice(0, 200)}`);
  console.log(`First line for intent detection: ${JSON.stringify(firstLine)}`);

  if (YES_PATTERN.test(firstLine)) {
    await commitSpecialsToRepo(pending.specials);
    await store.delete(batchId);
    const count = pending.specials.length;
    await safeReply(
      inbound,
      `Published ${count} special${count === 1 ? '' : 's'}. The site will rebuild and go live in about 30 seconds.`,
    );
    return;
  }

  if (NO_PATTERN.test(firstLine)) {
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
    reviewerMode: pending.reviewerMode,
    submittedBy: pending.submittedBy,
    submissionSource: pending.submissionSource,
    confidence: pending.confidence,
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
  return parseExtractionResult(textBlock.text).specials;
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
    "Or reply with corrections (e.g. \"Change item 2 to $14, remove item 4\") and I'll revise the list.",
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

// Send a reply to the inbound email's sender (or an optional override address).
async function sendReply(
  inbound: PostmarkInbound,
  opts: { subject: string; body: string; messageId?: string; image?: PendingImage; to?: string },
) {
  const headers: Array<{ Name: string; Value: string }> = [];
  if (opts.messageId) headers.push({ Name: 'Message-ID', Value: opts.messageId });
  if (inbound.MessageID) {
    const ref = inbound.MessageID.startsWith('<') ? inbound.MessageID : `<${inbound.MessageID}>`;
    headers.push({ Name: 'In-Reply-To', Value: ref });
    headers.push({ Name: 'References', Value: ref });
  }

  await sendDirectEmail({
    to: opts.to || inbound.FromFull?.Email || inbound.From,
    subject: opts.subject,
    body: opts.body,
    messageId: opts.messageId,
    image: opts.image,
    extraHeaders: headers,
  });
}

// Send an email to an arbitrary address (no inbound context required).
async function sendDirectEmail(opts: {
  to: string;
  subject: string;
  body: string;
  messageId?: string;
  image?: PendingImage;
  extraHeaders?: Array<{ Name: string; Value: string }>;
}) {
  const token = process.env.POSTMARK_SERVER_TOKEN;
  const from = process.env.SPECIALS_FROM_ADDRESS;
  if (!token || !from) throw new Error('POSTMARK_SERVER_TOKEN or SPECIALS_FROM_ADDRESS not set');

  const headers: Array<{ Name: string; Value: string }> = [...(opts.extraHeaders || [])];
  if (opts.messageId && !headers.find((h) => h.Name === 'Message-ID')) {
    headers.push({ Name: 'Message-ID', Value: opts.messageId });
  }

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
    To: opts.to,
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
