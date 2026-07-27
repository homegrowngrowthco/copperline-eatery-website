// Server-side replica of the on-site print sheet (#printSheet in
// CateringQuoteBuilder.astro + the @media print rules in global.css), so the
// emailed PDF matches what a visitor gets from "Save as PDF". Same fonts the
// site serves (@fontsource Oswald/Merriweather via assets.ts), same logo,
// same layout: centered logo header over a red rule, CATERING ESTIMATE
// title, "Prepared <date>", two-column Your info / Your event with dotted
// row rules, package heading + menu rows, allergies/notes columns, totals
// with the red-ruled estimated total, and the pricing disclaimer.
// CSS px values translate at 1px = 0.75pt.
import fontkit from '@pdf-lib/fontkit';
import { PDFDocument, PDFFont, PDFPage, rgb } from 'pdf-lib';
import { ADDRESS, EMAIL, PHONE_DISPLAY } from '../../../src/data/restaurant';
import {
  LOGO_JPG,
  MERRIWEATHER_400,
  MERRIWEATHER_700,
  OSWALD_400,
  OSWALD_700,
} from './assets';

export type Row = [string, string];

export interface QuoteModel {
  name: string;
  preparedOn: string;
  contact: Row[];
  event: Row[];
  packageLine: string;
  courseRows: Row[];
  totals: Row[];
  allergies: string;
  notes: string;
}

// Brand palette from global.css :root.
const RED = rgb(0.757, 0.071, 0.122); // #C1121F
const TAN = rgb(0.722, 0.525, 0.043); // #B8860B
const BLACK = rgb(0.102, 0.102, 0.102); // #1A1A1A
const GRAY = rgb(0.4, 0.4, 0.4); // #666666
const DOTS = rgb(0.8, 0.8, 0.8); // #ccc

const PAGE_W = 612;
const PAGE_H = 792;
const MARGIN = 32.4; // @page margin: 0.45in
const CONTENT_W = PAGE_W - MARGIN * 2;
const COL_GAP = 15; // .print-cols gap: 20px
const COL_W = (CONTENT_W - COL_GAP) / 2;
const ROW_GAP = 10.5; // dl row dt/dd gap: 14px

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
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
  doc.setTitle(`Catering Estimate: ${model.name}`);
  doc.registerFontkit(fontkit);
  const oswald = await doc.embedFont(OSWALD_400, { subset: true });
  const oswaldBold = await doc.embedFont(OSWALD_700, { subset: true });
  const merri = await doc.embedFont(MERRIWEATHER_400, { subset: true });
  const merriBold = await doc.embedFont(MERRIWEATHER_700, { subset: true });
  const logo = await doc.embedJpg(LOGO_JPG);

  let page: PDFPage = doc.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H - MARGIN;

  const ensureRoom = (needed: number) => {
    if (y - needed < MARGIN) {
      page = doc.addPage([PAGE_W, PAGE_H]);
      y = PAGE_H - MARGIN;
    }
  };

  const draw = (
    value: string,
    x: number,
    opts: { size: number; font: PDFFont; color?: ReturnType<typeof rgb>; baseline?: number }
  ) => {
    page.drawText(value, {
      x,
      y: (opts.baseline ?? y) - opts.size,
      size: opts.size,
      font: opts.font,
      color: opts.color ?? BLACK,
    });
  };

  const centered = (value: string, opts: { size: number; font: PDFFont; color?: ReturnType<typeof rgb> }) => {
    const w = opts.font.widthOfTextAtSize(value, opts.size);
    draw(value, MARGIN + (CONTENT_W - w) / 2, opts);
  };

  const hline = (
    x1: number,
    x2: number,
    opts: { thickness: number; color: ReturnType<typeof rgb>; dashed?: boolean }
  ) => {
    page.drawLine({
      start: { x: x1, y },
      end: { x: x2, y },
      thickness: opts.thickness,
      color: opts.color,
      ...(opts.dashed ? { dashArray: [1, 2] } : {}),
    });
  };

  // ---- .print-head: logo, NAP, title, date over a 2.5px red rule ----
  const logoW = 142.5; // .print-logo width: 190px
  const logoH = (logo.height / logo.width) * logoW;
  page.drawImage(logo, {
    x: MARGIN + (CONTENT_W - logoW) / 2,
    y: y - logoH,
    width: logoW,
    height: logoH,
  });
  y -= logoH + 1.5;

  y -= 3;
  centered(
    `${ADDRESS.streetAddress}, ${ADDRESS.addressLocality}, ${ADDRESS.addressRegion} ${ADDRESS.postalCode} · ${PHONE_DISPLAY} · ${EMAIL}`,
    { size: 7, font: merri, color: GRAY }
  );
  y -= 7 + 4;

  y -= 3; // .print-title margin-top: 4px
  centered('CATERING ESTIMATE', { size: 16, font: oswaldBold, color: RED });
  y -= 16 + 4;

  centered(`Prepared ${model.preparedOn}`, { size: 8, font: merri, color: GRAY });
  y -= 8 + 4.5; // padding-bottom: 6px

  hline(MARGIN, PAGE_W - MARGIN, { thickness: 1.9, color: RED }); // 2.5px red
  y -= 7.5; // margin-bottom: 10px

  // ---- shared pieces ----
  const h4 = (text: string, x: number, width: number) => {
    y -= 6; // margin-top: 8px
    draw(text.toUpperCase(), x, { size: 9.5, font: oswaldBold });
    y -= 9.5 + 1.5; // padding-bottom: 2px
    hline(x, x + width, { thickness: 0.75, color: TAN });
    y -= 2.25; // margin-bottom: 3px
  };

  // One dl row: dt left (Oswald 8pt uppercase gray), dd right-aligned
  // (Merriweather bold), dotted rule underneath. Returns the y after the row.
  const dlRow = (
    label: string,
    value: string,
    x: number,
    width: number,
    opts: { ddSize?: number; ddColor?: ReturnType<typeof rgb>; dtColor?: ReturnType<typeof rgb>; rule?: boolean } = {}
  ) => {
    const ddSize = opts.ddSize ?? 9.5;
    const dtText = label.toUpperCase();
    const dtWidth = oswald.widthOfTextAtSize(dtText, 8);
    const ddLines = wrapText(value === '' ? 'Not given' : value, merriBold, ddSize, width - dtWidth - ROW_GAP);
    const lineH = ddSize * 1.35;
    y -= 1.1; // row padding-top
    const rowTop = y;
    draw(dtText, x, { size: 8, font: oswald, color: opts.dtColor ?? GRAY, baseline: rowTop - (lineH - 8) / 2 });
    let lineY = rowTop;
    for (const line of ddLines) {
      const w = merriBold.widthOfTextAtSize(line, ddSize);
      draw(line, x + width - w, {
        size: ddSize,
        font: merriBold,
        color: opts.ddColor ?? BLACK,
        baseline: lineY - (lineH - ddSize) / 2,
      });
      lineY -= lineH;
    }
    y = lineY - 1.1; // row padding-bottom
    if (opts.rule !== false) hline(x, x + width, { thickness: 0.75, color: DOTS, dashed: true });
  };

  // ---- .print-cols: Your info | Your event ----
  const colTop = y;
  const leftX = MARGIN;
  const rightX = MARGIN + COL_W + COL_GAP;

  h4('Your info', leftX, COL_W);
  for (const [label, value] of model.contact) dlRow(label, value, leftX, COL_W);
  const leftEnd = y;

  y = colTop;
  h4('Your event', rightX, COL_W);
  for (const [label, value] of model.event) dlRow(label, value, rightX, COL_W);
  y = Math.min(leftEnd, y);

  // ---- package heading (an h4 on the sheet, so uppercase) + menu rows ----
  if (model.packageLine) {
    ensureRoom(30);
    h4(model.packageLine, MARGIN, CONTENT_W);
    for (const [label, value] of model.courseRows) {
      ensureRoom(20);
      dlRow(label, value, MARGIN, CONTENT_W);
    }
  }

  // ---- allergies / notes, side by side like the sheet's print-cols ----
  const freeText: [string, string][] = [];
  if (model.allergies) freeText.push(['Allergies & dietary needs', model.allergies]);
  if (model.notes) freeText.push(['Notes', model.notes]);
  if (freeText.length > 0) {
    ensureRoom(45);
    const blockTop = y;
    const ends: number[] = [];
    freeText.forEach(([title, body], i) => {
      y = blockTop;
      const x = i === 0 ? leftX : rightX;
      h4(title, x, COL_W);
      for (const line of wrapText(body, merri, 9, COL_W)) {
        ensureRoom(13);
        y -= 9 * 1.35;
        draw(line, x, { size: 9, font: merri, baseline: y + 9 * 1.35 });
      }
      ends.push(y);
    });
    y = Math.min(...ends);
  }

  // ---- Estimate totals; last row gets the 2px red top rule + red value ----
  if (model.totals.length > 0) {
    ensureRoom(40 + model.totals.length * 15);
    h4('Estimate', MARGIN, CONTENT_W);
    model.totals.forEach(([label, value], i) => {
      const isTotal = i === model.totals.length - 1;
      if (isTotal) {
        y -= 2.25; // margin-top: 3px
        hline(MARGIN, PAGE_W - MARGIN, { thickness: 1.5, color: RED });
        y -= 3; // padding-top: 4px
        dlRow(label, value, MARGIN, CONTENT_W, { ddSize: 11, ddColor: RED, dtColor: BLACK, rule: false });
      } else {
        dlRow(label, value, MARGIN, CONTENT_W);
      }
    });
  }

  // ---- .print-note: bold lead-in runs straight into the gray sentence ----
  ensureRoom(40);
  y -= 6; // margin-top: 8px
  hline(MARGIN, PAGE_W - MARGIN, { thickness: 0.75, color: TAN });
  y -= 3.75; // padding-top: 5px
  const noteWords: { text: string; bold: boolean }[] = [
    ...'All prices are estimates.'.split(' ').map((text) => ({ text, bold: true })),
    ...'This catering quote does not represent a confirmed booking or invoice. Final menu and pricing will be confirmed with you before booking.'
      .split(' ')
      .map((text) => ({ text, bold: false })),
  ];
  const noteSize = 7.5;
  const noteLineH = noteSize * 1.4;
  let noteLine: { text: string; bold: boolean }[] = [];
  let noteLineW = 0;
  const spaceW = merri.widthOfTextAtSize(' ', noteSize);
  const flushNoteLine = () => {
    y -= noteLineH;
    let x = MARGIN;
    for (const word of noteLine) {
      const font = word.bold ? merriBold : merri;
      draw(word.text, x, {
        size: noteSize,
        font,
        color: word.bold ? BLACK : GRAY,
        baseline: y + noteLineH,
      });
      x += font.widthOfTextAtSize(word.text, noteSize) + spaceW;
    }
    noteLine = [];
    noteLineW = 0;
  };
  for (const word of noteWords) {
    const w = (word.bold ? merriBold : merri).widthOfTextAtSize(word.text, noteSize);
    if (noteLine.length > 0 && noteLineW + spaceW + w > CONTENT_W) flushNoteLine();
    noteLineW += (noteLine.length > 0 ? spaceW : 0) + w;
    noteLine.push(word);
  }
  if (noteLine.length > 0) flushNoteLine();

  return doc.save();
}
