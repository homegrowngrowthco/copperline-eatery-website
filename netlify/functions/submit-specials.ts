import type { Context } from '@netlify/functions';
import { getStore } from '@netlify/blobs';
import { ServerClient } from 'postmark';
import {
  extractSpecialsFromImage,
  sanitizeCredit,
  formatCredit,
  ALLOWED_IMAGE_TYPES,
  MAX_IMAGE_BYTES,
  PENDING_STORE,
  type Special,
  type Credit,
} from './lib/specials';

const REPLY_TO_ADDRESS = 'specials-bot@parse.copperlineeatery.com';
const RATE_STORE = 'submit-ratelimit';
const MAX_PER_HOUR = 5;
const ONE_HOUR_MS = 60 * 60 * 1000;

function getReviewerEmails(): string[] {
  return (process.env.REVIEWER_EMAILS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function checkRateLimit(ip: string): Promise<boolean> {
  const store = getStore(RATE_STORE);
  const key = `ip-${ip.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
  const data = (await store
    .get(key, { type: 'json' })
    .catch(() => null)) as { count: number; windowStart: number } | null;

  const now = Date.now();
  if (!data || now - data.windowStart > ONE_HOUR_MS) {
    await store.setJSON(key, { count: 1, windowStart: now });
    return true;
  }
  if (data.count >= MAX_PER_HOUR) return false;
  await store.setJSON(key, { count: data.count + 1, windowStart: data.windowStart });
  return true;
}

function buildReviewerBody(specials: Special[], note: string | null, credit: Credit | null): string {
  const lines = specials.map((s, i) => {
    const parts = [`${i + 1}. ${s.name}`];
    if (s.price) parts.push(`   Price: ${s.price.startsWith('$') ? s.price : '$' + s.price}`);
    if (s.description) parts.push(`   ${s.description}`);
    return parts.join('\n');
  });

  const noteSection = note ? `\nSubmitter's note: "${note}"\n` : '';
  const creditLine = formatCredit(credit);

  return [
    `A customer submitted a photo of the specials board via the website.${noteSection}`,
    `I extracted ${specials.length} special${specials.length === 1 ? '' : 's'}:`,
    '',
    ...lines,
    '',
    `Shoutout: ${creditLine || 'none'}`,
    'Replying YES publishes this photo, and the shoutout above (if any), publicly on the specials page.',
    '',
    'Reply YES to publish on the website.',
    'Reply NO to discard.',
    'Reply with corrections (e.g. "Change item 2 to $14, remove item 4") and I\'ll revise the list.',
    'Reply with a credit (e.g. "credit Sarah from Chicopee" or "no credit") to add or remove the shoutout.',
  ].join('\n');
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
    `<p style="margin:0 0 12px;">Here's the photo submitted (check it against the list below):</p>`,
    `<img src="cid:${cid}" alt="Specials board photo" style="max-width:100%;height:auto;border:1px solid #ddd;border-radius:6px;margin-bottom:16px;" />`,
    `<div>${textHtml}</div>`,
    '</div>',
  ].join('\n');
}

export default async (req: Request, context: Context): Promise<Response> => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const ip = context.ip || 'unknown';
  if (!(await checkRateLimit(ip))) {
    return json({ error: 'Too many submissions. Please try again in an hour.' }, 429);
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return json({ error: 'Invalid form data.' }, 400);
  }

  const file = formData.get('photo') as File | null;
  if (!file || file.size === 0) {
    return json({ error: 'No photo attached. Please select a photo of the specials board.' }, 400);
  }

  const contentType = file.type || 'image/jpeg';
  if (!(ALLOWED_IMAGE_TYPES as readonly string[]).includes(contentType)) {
    return json({ error: 'Unsupported image type. Please use a JPEG, PNG, or WebP photo.' }, 400);
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return json(
      { error: `Photo too large (${(file.size / 1024 / 1024).toFixed(1)} MB, max 5 MB). Try a lower-resolution photo.` },
      400,
    );
  }

  const note = ((formData.get('note') as string | null) || '').trim().slice(0, 500) || null;
  const credit = sanitizeCredit(
    formData.get('name') as string | null,
    formData.get('from') as string | null,
  );

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return json({ error: 'Server configuration error.' }, 500);

  const buffer = Buffer.from(await file.arrayBuffer());
  const base64 = buffer.toString('base64');

  let result;
  try {
    result = await extractSpecialsFromImage({ content: base64, contentType, apiKey });
  } catch (e) {
    console.error('Vision extraction failed:', e);
    return json(
      { error: "Couldn't read the specials from that photo. Please try a clearer photo with good lighting." },
      422,
    );
  }

  console.log(`Web form: confidence=${result.confidence}%, specials=${result.specials.length}, ip=${ip}`);

  if (result.specials.length === 0) {
    return json(
      { error: "Couldn't find any specials in that photo. Make sure the specials board is fully visible and well-lit." },
      422,
    );
  }

  const reviewerEmails = getReviewerEmails();
  if (reviewerEmails.length === 0) {
    console.error('REVIEWER_EMAILS not set — cannot send reviewer notification');
    return json({ error: 'Server configuration error.' }, 500);
  }

  const batchId = crypto.randomUUID();
  const sourceImage = { content: base64, contentType, name: file.name || 'specials-photo.jpg' };

  await getStore(PENDING_STORE).setJSON(batchId, {
    batchId,
    specials: result.specials,
    originalSender: 'web-form',
    originalMessageId: '',
    createdAt: new Date().toISOString(),
    image: sourceImage,
    reviewerMode: true,
    submissionSource: 'web',
    confidence: result.confidence,
    credit,
  });

  // Send reviewer confirmation email with inline photo.
  const token = process.env.POSTMARK_SERVER_TOKEN;
  const from = process.env.SPECIALS_FROM_ADDRESS;
  if (!token || !from) {
    console.error('Postmark env vars not set');
    return json({ error: 'Server configuration error.' }, 500);
  }

  const messageId = `<batch-${batchId}@copperlineeatery.com>`;
  const body = buildReviewerBody(result.specials, note, credit);
  const cid = `specials-source-${batchId.replace(/-/g, '')}`;
  const htmlBody = buildHtmlBody(body, cid);

  try {
    const client = new ServerClient(token);
    await client.sendEmail({
      From: from,
      ReplyTo: REPLY_TO_ADDRESS,
      To: reviewerEmails.join(', '),
      Subject: `Specials Submission — Review Required (${result.specials.length} item${result.specials.length === 1 ? '' : 's'}, ${result.confidence}% confidence)`,
      TextBody: body,
      HtmlBody: htmlBody,
      Attachments: [
        {
          Name: sourceImage.name,
          Content: base64,
          ContentType: contentType,
          ContentID: `cid:${cid}`,
        },
      ],
      Headers: [{ Name: 'Message-ID', Value: messageId }],
      MessageStream: 'outbound',
    });
  } catch (e) {
    console.error('Failed to send reviewer email:', e);
    return json({ error: 'Failed to send notification. Please try again.' }, 500);
  }

  return json({ success: true, count: result.specials.length });
};
