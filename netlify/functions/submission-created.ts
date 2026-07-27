// Netlify event-triggered function: fires on every verified form submission
// (the filename `submission-created` is the trigger; Netlify only invokes it
// internally, it is not publicly routable). Replaces the unreadable built-in
// form notification for the quote builder with a formatted email via Postmark.
//
// Only `catering-quote` submissions are handled; every other form falls
// through to whatever notifications are configured in the Netlify dashboard.
// Always answers 200: a lead is already safely stored in Netlify Forms, so a
// formatting or send failure must never make the platform treat the
// submission as failed. Errors are logged for the function log instead.
import type { Context } from '@netlify/functions';
import { ServerClient } from 'postmark';

interface SubmissionPayload {
  form_name?: string;
  number?: number;
  data?: Record<string, string>;
}

function esc(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
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

function pushIf(rows: Row[], label: string, value: string | undefined): void {
  if (value && value.trim() !== '') rows.push([label, value.trim()]);
}

export interface QuoteEmail {
  subject: string;
  html: string;
  text: string;
}

// Pure formatter, exported so scripts/fn-check.mjs can assert on the output
// without sending anything.
export function renderQuoteEmail(data: Record<string, string>): QuoteEmail {
  const name = data['name']?.trim() || 'Unknown name';
  const guests = data['guest-count']?.trim() || '';
  const total = data['estimated-total']?.trim() || '';
  const eventDate = data['event-date']?.trim() || '';

  const subjectBits = [name];
  if (guests) subjectBits.push(`${guests} guests`);
  if (eventDate) subjectBits.push(formatDate(eventDate));
  if (total) subjectBits.push(`est. ${total}`);
  const subject = `New catering quote: ${subjectBits.join(', ')}`;

  const contact: Row[] = [];
  pushIf(contact, 'Name', data['name']);
  pushIf(contact, 'Phone', data['phone']);
  pushIf(contact, 'Email', data['email']);

  const event: Row[] = [];
  pushIf(event, 'Date', eventDate ? formatDate(eventDate) : '');
  pushIf(event, 'Guests', guests);
  pushIf(event, 'Town/City', data['event-town']);
  pushIf(event, 'Event type', data['event-type']);
  pushIf(event, 'Service', data['service-style']);

  // menu-selection is the builder's own summary text: a package headline,
  // then "Course: picks" lines, then a blank line, then totals. The totals
  // half duplicates the hidden money fields, so only the menu half is used.
  const selection = (data['menu-selection'] || '').replace(/\r\n/g, '\n');
  const menuLines = selection
    .split('\n\n')[0]
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '');
  const packageLine = menuLines[0] || data['package'] || '';
  const courseLines = menuLines.slice(1);

  const estimate: Row[] = [];
  pushIf(estimate, 'Per person', data['per-person']);
  pushIf(estimate, 'Food subtotal', data['food-subtotal']);
  pushIf(estimate, 'Service charge', data['service-charge']);
  pushIf(estimate, 'Tax', data['tax']);
  pushIf(estimate, 'Estimated total', data['estimated-total']);

  const extras: Row[] = [];
  pushIf(extras, 'Allergies / dietary', data['allergies']);
  pushIf(extras, 'Notes', data['notes']);

  // ---- plain text ----
  const textParts: string[] = [`New catering quote request from ${name}`, ''];
  const textSection = (title: string, rows: Row[]) => {
    if (rows.length === 0) return;
    textParts.push(title.toUpperCase());
    rows.forEach(([label, value]) => textParts.push(`  ${label}: ${value}`));
    textParts.push('');
  };
  textSection('Contact', contact);
  textSection('Event', event);
  if (packageLine) {
    textParts.push('MENU');
    textParts.push(`  ${packageLine}`);
    courseLines.forEach((line) => textParts.push(`  ${line}`));
    textParts.push('');
  }
  textSection('Estimate', estimate);
  textSection('Kitchen notes', extras);
  textParts.push('All prices are estimates. Reply to this email to answer the customer directly.');
  const text = textParts.join('\n');

  // ---- HTML (single column, inline styles, safe in every mail client) ----
  const rowsHtml = (rows: Row[]) =>
    rows
      .map(
        ([label, value]) =>
          `<tr><td style="padding:4px 16px 4px 0;color:#6b6b6b;white-space:nowrap;vertical-align:top;">${esc(label)}</td>` +
          `<td style="padding:4px 0;color:#1f1f1f;">${esc(value).replace(/\n/g, '<br>')}</td></tr>`
      )
      .join('');
  const section = (title: string, body: string) =>
    `<h2 style="margin:24px 0 6px;font-size:14px;letter-spacing:0.06em;text-transform:uppercase;color:#a35c2a;">${esc(title)}</h2>` +
    `<table role="presentation" cellpadding="0" cellspacing="0" style="font-size:15px;line-height:1.5;border-collapse:collapse;">${body}</table>`;

  let html =
    `<div style="font-family:Georgia,'Times New Roman',serif;max-width:560px;margin:0 auto;padding:8px 4px;color:#1f1f1f;">` +
    `<h1 style="font-size:20px;margin:0 0 4px;">New catering quote request</h1>` +
    `<p style="margin:0;color:#6b6b6b;font-size:14px;">Sent from the quote builder on copperlineeatery.com. Reply to this email to answer the customer directly.</p>`;
  if (contact.length) html += section('Contact', rowsHtml(contact));
  if (event.length) html += section('Event', rowsHtml(event));
  if (packageLine) {
    const courseRows = courseLines
      .map((line) => {
        const split = line.indexOf(':');
        return split > 0
          ? ([line.slice(0, split).trim(), line.slice(split + 1).trim()] as Row)
          : (['', line] as Row);
      })
      .filter(([, value]) => value !== '');
    html += section(
      'Menu',
      `<tr><td colspan="2" style="padding:4px 0 8px;font-weight:bold;">${esc(packageLine)}</td></tr>` +
        rowsHtml(courseRows)
    );
  }
  if (estimate.length) {
    const money = rowsHtml(estimate.slice(0, -1));
    const [totalLabel, totalValue] = estimate[estimate.length - 1];
    html += section(
      'Estimate',
      money +
        `<tr><td style="padding:8px 16px 4px 0;font-weight:bold;border-top:1px solid #ddd;">${esc(totalLabel)}</td>` +
        `<td style="padding:8px 0 4px;font-weight:bold;border-top:1px solid #ddd;">${esc(totalValue)}</td></tr>`
    );
  }
  if (extras.length) html += section('Kitchen notes', rowsHtml(extras));
  html +=
    `<p style="margin:24px 0 0;color:#6b6b6b;font-size:13px;">All prices are estimates; nothing is booked yet. The full submission is also stored under Forms in the Netlify dashboard.</p></div>`;

  return { subject, html, text };
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
    const from = process.env.SPECIALS_FROM_ADDRESS;
    const to = (process.env.QUOTE_NOTIFY_EMAILS || process.env.REVIEWER_EMAILS || '').trim();
    if (!token || !from || !to) {
      console.error('quote email skipped: POSTMARK_SERVER_TOKEN, SPECIALS_FROM_ADDRESS, or recipients missing');
      return new Response('Missing email configuration', { status: 200 });
    }

    const email = renderQuoteEmail(data);
    const client = new ServerClient(token);
    const replyTo = (data['email'] || '').trim();
    await client.sendEmail({
      From: from,
      To: to,
      ...(replyTo ? { ReplyTo: replyTo } : {}),
      Subject: email.subject,
      HtmlBody: email.html,
      TextBody: email.text,
      MessageStream: 'outbound',
    });
    console.log(`quote email sent for submission #${payload.number ?? '?'} to ${to}`);
    return new Response('Quote email sent', { status: 200 });
  } catch (err) {
    console.error('quote email failed:', err);
    return new Response('Quote email failed (submission is still stored)', { status: 200 });
  }
};
