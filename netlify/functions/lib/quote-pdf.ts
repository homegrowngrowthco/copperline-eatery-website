// Server-side catering quote sheet, rendered with pdf-lib (pure JS, no native
// deps, safe inside a Netlify Function). Mirrors the on-site print sheet:
// header + NAP, contact/event, menu, estimate table, notes, disclaimer.
// The visitor's "Save as PDF" uses the browser print dialog, so the emailed
// copy has to be generated here; it cannot be captured from the client.
import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from 'pdf-lib';
import { ADDRESS, EMAIL, PHONE_DISPLAY } from '../../../src/data/restaurant';

export interface QuoteModel {
  name: string;
  contact: [string, string][];
  event: [string, string][];
  packageLine: string;
  courseLines: string[];
  estimate: [string, string][];
  extras: [string, string][];
  submittedAt: string;
}

const COPPER = rgb(0.64, 0.36, 0.16);
const DARK = rgb(0.12, 0.12, 0.12);
const GRAY = rgb(0.42, 0.42, 0.42);
const RULE = rgb(0.85, 0.85, 0.85);

const PAGE_W = 612;
const PAGE_H = 792;
const MARGIN = 54;
const CONTENT_W = PAGE_W - MARGIN * 2;

function wrap(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split('\n')) {
    const words = paragraph.split(/\s+/).filter((w) => w !== '');
    if (words.length === 0) {
      lines.push('');
      continue;
    }
    let line = '';
    for (const word of words) {
      const candidate = line === '' ? word : `${line} ${word}`;
      if (font.widthOfTextAtSize(candidate, size) <= maxWidth || line === '') {
        line = candidate;
      } else {
        lines.push(line);
        line = word;
      }
    }
    lines.push(line);
  }
  return lines;
}

export async function buildQuotePdf(model: QuoteModel): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(`Catering quote request: ${model.name}`);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  let page = doc.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H - MARGIN;

  const ensureRoom = (needed: number) => {
    if (y - needed < MARGIN) {
      page = doc.addPage([PAGE_W, PAGE_H]);
      y = PAGE_H - MARGIN;
    }
  };

  const text = (
    value: string,
    opts: { x?: number; size?: number; font?: PDFFont; color?: ReturnType<typeof rgb> } = {}
  ) => {
    page.drawText(value, {
      x: opts.x ?? MARGIN,
      y,
      size: opts.size ?? 10,
      font: opts.font ?? font,
      color: opts.color ?? DARK,
    });
  };

  const rule = (color = RULE) => {
    page.drawLine({
      start: { x: MARGIN, y },
      end: { x: PAGE_W - MARGIN, y },
      thickness: 0.75,
      color,
    });
  };

  // ---- header ----
  text('The Copperline Eatery', { size: 20, font: bold, color: COPPER });
  y -= 18;
  text('Catering Quote Request', { size: 12, font: bold });
  y -= 14;
  text(
    `${ADDRESS.streetAddress}, ${ADDRESS.addressLocality}, ${ADDRESS.addressRegion} ${ADDRESS.postalCode}   |   ${PHONE_DISPLAY}   |   ${EMAIL}`,
    { size: 9, color: GRAY }
  );
  y -= 12;
  text(`Submitted ${model.submittedAt} via the quote builder on copperlineeatery.com`, {
    size: 9,
    color: GRAY,
  });
  y -= 10;
  rule();

  const heading = (title: string) => {
    ensureRoom(34);
    y -= 24;
    text(title.toUpperCase(), { size: 10, font: bold, color: COPPER });
    y -= 4;
  };

  const labelValueRows = (rows: [string, string][]) => {
    const valueX = MARGIN + 118;
    const valueW = PAGE_W - MARGIN - valueX;
    for (const [label, value] of rows) {
      const lines = wrap(value, font, 10, valueW);
      ensureRoom(14 * lines.length + 2);
      y -= 14;
      text(label, { size: 9.5, color: GRAY });
      for (let i = 0; i < lines.length; i++) {
        if (i > 0) {
          ensureRoom(13);
          y -= 13;
        }
        text(lines[i], { x: valueX, size: 10 });
      }
    }
  };

  // ---- contact + event ----
  heading('Contact');
  labelValueRows(model.contact);
  heading('Event');
  labelValueRows(model.event);

  // ---- menu ----
  if (model.packageLine) {
    heading('Menu');
    for (const line of wrap(model.packageLine, bold, 11, CONTENT_W)) {
      ensureRoom(16);
      y -= 16;
      text(line, { size: 11, font: bold });
    }
    const courseRows: [string, string][] = model.courseLines.map((line) => {
      const split = line.indexOf(':');
      return split > 0
        ? [line.slice(0, split).trim(), line.slice(split + 1).trim()]
        : ['', line];
    });
    labelValueRows(courseRows.filter(([, value]) => value !== ''));
  }

  // ---- estimate ----
  if (model.estimate.length > 0) {
    heading('Estimate');
    const rows = model.estimate;
    for (let i = 0; i < rows.length; i++) {
      const [label, value] = rows[i];
      const isTotal = i === rows.length - 1;
      ensureRoom(isTotal ? 24 : 16);
      y -= isTotal ? 10 : 0;
      if (isTotal) {
        rule();
        y -= 14;
      } else {
        y -= 15;
      }
      const rowFont = isTotal ? bold : font;
      const size = isTotal ? 11 : 10;
      text(label, { size, font: rowFont, color: isTotal ? DARK : GRAY });
      const width = rowFont.widthOfTextAtSize(value, size);
      text(value, { x: PAGE_W - MARGIN - width, size, font: rowFont });
    }
  }

  // ---- allergies / notes ----
  for (const [label, value] of model.extras) {
    heading(label);
    for (const line of wrap(value, font, 10, CONTENT_W)) {
      ensureRoom(13);
      y -= 13;
      text(line);
    }
  }

  // ---- disclaimer ----
  const disclaimer =
    'All prices are estimates. This quote request does not represent a confirmed booking or invoice. Delivery and on-site staffing are quoted separately; the final menu and pricing are confirmed with the customer before anything is booked.';
  ensureRoom(60);
  y -= 26;
  rule();
  for (const line of wrap(disclaimer, font, 8.5, CONTENT_W)) {
    y -= 12;
    text(line, { size: 8.5, color: GRAY });
  }

  return doc.save();
}
