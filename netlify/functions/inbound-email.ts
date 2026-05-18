import type { Context } from '@netlify/functions';
import { getStore } from '@netlify/blobs';
import Anthropic from '@anthropic-ai/sdk';
import { ServerClient } from 'postmark';
import { Octokit } from '@octokit/rest';

const MODEL = 'claude-sonnet-4-6';
const VISION_PROMPT =
  'Extract all specials from this menu board image. Return only valid JSON in this format: { "specials": [ { "name": string, "description": string, "price": string } ] }. If a field is not visible, use null.';
const SPECIALS_DATA_PATH = 'src/data/specials.json';
const PENDING_STORE = 'pending-specials';
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] as const;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

type AllowedImageType = (typeof ALLOWED_IMAGE_TYPES)[number];

interface Special {
  name: string;
  description: string | null;
  price: string | null;
}

interface PendingBatch {
  batchId: string;
  specials: Special[];
  originalSender: string;
  originalMessageId: string;
  createdAt: string;
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
    await safeReply(inbound, `That image is too large (${(image.ContentLength / 1024 / 1024).toFixed(1)} MB, max 5 MB). Please resize and resend.`);
    return;
  }

  const specials = await extractSpecialsFromImage(image);
  if (specials.length === 0) {
    await safeReply(inbound, "I couldn't read any specials from that image. Please send a clearer photo.");
    return;
  }

  const batchId = crypto.randomUUID();
  const pending: PendingBatch = {
    batchId,
    specials,
    originalSender: inbound.FromFull?.Email || inbound.From,
    originalMessageId: inbound.MessageID,
    createdAt: new Date().toISOString(),
  };

  await getStore(PENDING_STORE).setJSON(batchId, pending);

  await sendReply(inbound, {
    subject: replySubject(inbound.Subject),
    body: buildConfirmationEmailBody(specials),
    messageId: `<batch-${batchId}@copperlineeatery.com>`,
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

  const body = (inbound.TextBody || '').trim();
  const confirmed = /^\s*yes\b/i.test(body);

  if (!confirmed) {
    await store.delete(batchId);
    await safeReply(inbound, "Got it — I didn't see 'YES' so I won't publish those specials. Send a fresh photo when you're ready.");
    return;
  }

  await commitSpecialsToRepo(pending.specials);
  await store.delete(batchId);

  const count = pending.specials.length;
  await safeReply(
    inbound,
    `Published ${count} special${count === 1 ? '' : 's'}. The site will rebuild and go live in about 30 seconds.`,
  );
}

async function extractSpecialsFromImage(attachment: PostmarkAttachment): Promise<Special[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set');

  const anthropic = new Anthropic({ apiKey });
  const response = await anthropic.messages.create({
    model: MODEL,
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

  const jsonMatch = textBlock.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error(`No JSON in vision response: ${textBlock.text.slice(0, 200)}`);

  let parsed: { specials?: unknown };
  try {
    parsed = JSON.parse(jsonMatch[0]);
  } catch (e) {
    throw new Error(`Invalid JSON from vision: ${(e as Error).message}`);
  }
  if (!Array.isArray(parsed.specials)) throw new Error('Vision response missing "specials" array');

  return parsed.specials
    .filter((s: unknown): s is { name: unknown; description?: unknown; price?: unknown } => {
      return !!s && typeof s === 'object' && typeof (s as { name: unknown }).name === 'string' && !!(s as { name: string }).name.trim();
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
  const lines = specials.map((s, i) => {
    const parts = [`${i + 1}. ${s.name}`];
    if (s.price) parts.push(`   Price: ${s.price.startsWith('$') ? s.price : '$' + s.price}`);
    if (s.description) parts.push(`   ${s.description}`);
    return parts.join('\n');
  });
  return [
    `I extracted ${specials.length} special${specials.length === 1 ? '' : 's'} from your photo:`,
    '',
    ...lines,
    '',
    'Reply YES to publish them on the website.',
    "Reply with anything else (or don't reply at all) and they will not publish.",
  ].join('\n');
}

function replySubject(original: string | undefined): string {
  const base = original || 'Specials';
  return base.toLowerCase().startsWith('re:') ? base : `Re: ${base}`;
}

async function sendReply(
  inbound: PostmarkInbound,
  opts: { subject: string; body: string; messageId?: string },
) {
  const token = process.env.POSTMARK_SERVER_TOKEN;
  const from = process.env.SPECIALS_FROM_ADDRESS;
  if (!token || !from) throw new Error('POSTMARK_SERVER_TOKEN or SPECIALS_FROM_ADDRESS not set');

  const client = new ServerClient(token);
  await client.sendEmail({
    From: from,
    To: inbound.FromFull?.Email || inbound.From,
    Subject: opts.subject,
    TextBody: opts.body,
    Headers: opts.messageId ? [{ Name: 'Message-ID', Value: opts.messageId }] : undefined,
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
