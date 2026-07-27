// Netlify event-triggered function: fires on every verified form submission
// (the filename `submission-created` is the trigger; Netlify only invokes it
// internally, it is not publicly routable). Replaces the unreadable built-in
// form notification for the quote builder: catering-quote leads arrive as a
// short email with a generated quote-sheet PDF attached, sent via Postmark
// from the catering address (QUOTE_FROM_ADDRESS), not the specials bot.
//
// Only `catering-quote` submissions are handled; every other form falls
// through to whatever notifications are configured in the Netlify dashboard.
// Always answers 200: a lead is already safely stored in Netlify Forms, so a
// formatting or send failure must never make the platform treat the
// submission as failed. Errors are logged for the function log instead.
import type { Context } from '@netlify/functions';
import { ServerClient } from 'postmark';
import { buildQuotePdf } from './lib/quote-pdf';
import type { QuoteModel } from './lib/quote-pdf';

// Re-exported so scripts/fn-check.mjs can exercise the PDF from the bundle.
export { buildQuotePdf };

interface SubmissionPayload {
  form_name?: string;
  number?: number;
  data?: Record<string, string>;
}

// Event dates arrive as YYYY-MM-DD from the <input type="date">. Format by
// parts; `new Date('YYYY-MM-DD')` parses as UTC and can shift the day.
function formatDate(value: string): string {
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return value;
  const date = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

type Row = [string, string];

// Pure parser, exported so scripts/fn-check.mjs can assert on it without
// sending anything. Mirrors the print sheet's fill logic in main.ts:
// contact/event rows always present (the sheet renders empties as
// "Not given"), menu rows only for picked courses, totals straight from the
// builder's own summary text so labels like "Service charge (15%)" match.
export function buildQuoteModel(data: Record<string, string>, preparedOn: string): QuoteModel {
  const field = (key: string) => (data[key] || '').trim();
  const eventDate = field('event-date');

  const contact: Row[] = [
    ['Name', field('name')],
    ['Phone', field('phone')],
    ['Email', field('email')],
  ];
  const event: Row[] = [
    ['Date', eventDate ? formatDate(eventDate) : ''],
    ['Guests', field('guest-count')],
    ['Town', field('event-town')],
    ['Event type', field('event-type')],
    ['Service', field('service-style')],
  ];

  // menu-selection is the builder's summary text: a package headline, then
  // "Course: picks" lines (plus "Comes with:" / "NOTE:" lines the print sheet
  // does not show), then a blank line, then the totals block with the exact
  // labels the sheet prints ("Service charge (15%)", ...).
  const selection = (data['menu-selection'] || '').replace(/\r\n/g, '\n');
  const [menuBlock = '', totalsBlock = ''] = selection.split('\n\n');
  const menuLines = menuBlock
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '');
  const courseRows: Row[] = menuLines
    .slice(1)
    .filter((line) => !/^(comes with|note):/i.test(line))
    .map((line) => {
      const split = line.indexOf(':');
      return split > 0 ? [line.slice(0, split).trim(), line.slice(split + 1).trim()] : ['', line];
    });

  let totals: Row[] = totalsBlock
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.includes(':'))
    .map((line) => {
      const split = line.lastIndexOf(':');
      return [line.slice(0, split).trim(), line.slice(split + 1).trim()] as Row;
    });
  if (totals.length === 0) {
    totals = [
      ['Per person', field('per-person')],
      ['Guests', field('guest-count')],
      ['Food subtotal', field('food-subtotal')],
      ['Service charge', field('service-charge')],
      ['Tax', field('tax')],
      ['Estimated total', field('estimated-total')],
    ].filter(([, v]) => v !== '') as Row[];
  }

  return {
    name: field('name') || 'Unknown name',
    preparedOn,
    contact,
    event,
    packageLine: menuLines[0] || field('package'),
    courseRows,
    totals,
    allergies: field('allergies'),
    notes: field('notes'),
  };
}

export interface QuoteEmail {
  subject: string;
  text: string;
  attachmentName: string;
}

export function renderQuoteEmail(data: Record<string, string>): QuoteEmail {
  const name = data['name']?.trim() || 'Unknown name';
  const guests = data['guest-count']?.trim() || '';
  const total = data['estimated-total']?.trim() || '';
  const eventDate = data['event-date']?.trim() || '';

  const subjectBits = [name];
  if (guests) subjectBits.push(`${guests} guests`);
  if (eventDate) subjectBits.push(formatDate(eventDate));
  if (total) subjectBits.push(`est. ${total}`);

  const lines = [`New catering quote request from ${name}.`, ''];
  if (data['phone']?.trim()) lines.push(`Phone: ${data['phone'].trim()}`);
  if (data['email']?.trim()) lines.push(`Email: ${data['email'].trim()}`);
  if (guests) lines.push(`Guests: ${guests}`);
  if (eventDate) lines.push(`Date: ${formatDate(eventDate)}`);
  if (total) lines.push(`Estimated total: ${total}`);
  lines.push('');
  lines.push('The full quote sheet is attached as a PDF.');
  lines.push('Reply to this email to answer the customer directly.');

  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'quote';
  return {
    subject: `New catering quote: ${subjectBits.join(', ')}`,
    text: lines.join('\n'),
    attachmentName: `catering-quote-${slug}.pdf`,
  };
}

export default async (req: Request, _context: Context): Promise<Response> => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  try {
    const body = (await req.json()) as { payload?: SubmissionPayload };
    const payload = body.payload;
    if (!payload || payload.form_name !== 'catering-quote') {
      return new Response('Ignored: not a catering-quote submission', { status: 200 });
    }

    const data = payload.data ?? {};
    const token = process.env.POSTMARK_SERVER_TOKEN;
    const from = process.env.QUOTE_FROM_ADDRESS || process.env.SPECIALS_FROM_ADDRESS;
    const to = (process.env.QUOTE_NOTIFY_EMAILS || process.env.REVIEWER_EMAILS || '').trim();
    if (!token || !from || !to) {
      console.error('quote email skipped: POSTMARK_SERVER_TOKEN, from address, or recipients missing');
      return new Response('Missing email configuration', { status: 200 });
    }

    // Same "Prepared <date>" line the on-site print sheet stamps.
    const preparedOn = new Date().toLocaleDateString('en-US', {
      timeZone: 'America/New_York',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
    const email = renderQuoteEmail(data);
    const pdf = await buildQuotePdf(buildQuoteModel(data, preparedOn));

    const client = new ServerClient(token);
    const replyTo = (data['email'] || '').trim();
    await client.sendEmail({
      From: `Copperline Catering <${from}>`,
      To: to,
      ...(replyTo ? { ReplyTo: replyTo } : {}),
      Subject: email.subject,
      TextBody: email.text,
      Attachments: [
        {
          Name: email.attachmentName,
          Content: Buffer.from(pdf).toString('base64'),
          ContentType: 'application/pdf',
          ContentID: '',
        },
      ],
      MessageStream: 'outbound',
    });
    console.log(`quote email sent for submission #${payload.number ?? '?'} to ${to} from ${from}`);
    return new Response('Quote email sent', { status: 200 });
  } catch (err) {
    console.error('quote email failed:', err);
    return new Response('Quote email failed (submission is still stored)', { status: 200 });
  }
};
