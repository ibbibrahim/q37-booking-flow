import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFImage, type PDFPage } from 'pdf-lib';
import qbcLogoUrl from '../../assets/QBC-light.png';
import type { HrContract, HrContractEvent, HrEmployee } from '../types/hrApi';

export interface CertificateInput {
  employee: HrEmployee;
  contract: HrContract;
  events: HrContractEvent[];
}

// QBC brand blue, matching the app's own --primary token (hsl(217 91% 60%))
// rather than the contract letterhead's maroon — this certificate is issued
// BY the platform (like DocuSign's own branding on its Certificate of
// Completion), not by the counterparty whose letterhead the contract itself carries.
const BRAND_BLUE = rgb(0.235, 0.514, 0.965);
const INK = rgb(0.13, 0.15, 0.19);
const MUTED = rgb(0.45, 0.47, 0.52);
const LINE = rgb(0.85, 0.86, 0.89);
const ROW_ALT = rgb(0.97, 0.975, 0.985);

const PAGE_WIDTH = 595.32;
const PAGE_HEIGHT = 841.92;
const MARGIN_X = 48;
const TOP_MARGIN = 42;
const BOTTOM_MARGIN = 56;
const ROW_HEIGHT = 16;

const EVENT_LABEL: Record<string, string> = {
  Created: 'Contract created',
  Saved: 'Draft saved',
  Viewed: 'Document viewed',
  Signed: 'Signed',
  Completed: 'Contract completed — fully signed',
  Discarded: 'Draft discarded',
};

const ROLE_LABEL: Record<string, string> = {
  Employee: 'Employee',
  DepartmentHead: 'Department Head',
  FinalSignatory: 'General Manager',
};

function fmt(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  });
}

function truncateToWidth(font: PDFFont, text: string, size: number, maxWidth: number): string {
  if (font.widthOfTextAtSize(text, size) <= maxWidth) return text;
  let out = text;
  while (out.length > 1 && font.widthOfTextAtSize(out + '…', size) > maxWidth) {
    out = out.slice(0, -1);
  }
  return out + '…';
}

/** Greedy word-wrap, capped at `maxLines`. If words remain unplaced once the
 * line cap is hit, the last line gets an explicit ellipsis appended (via
 * truncateToWidth) — silently dropping the leftover words with no visual
 * indicator would make it look like the sentence just ends there. */
function wrapText(font: PDFFont, text: string, size: number, maxWidth: number, maxLines: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let current = '';
  let i = 0;

  while (i < words.length) {
    const word = words[i];
    const candidate = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth || !current) {
      current = candidate;
      i++;
    } else {
      lines.push(current);
      current = '';
      if (lines.length === maxLines) break;
    }
  }
  if (current && lines.length < maxLines) {
    lines.push(current);
  }

  if (i < words.length && lines.length > 0) {
    const lastIdx = lines.length - 1;
    lines[lastIdx] = truncateToWidth(font, `${lines[lastIdx]}…`, size, maxWidth);
  }

  return lines;
}

interface Column {
  header: string;
  width: number;
  mono?: boolean;
}

/** Tracks the current page/y-cursor as content is drawn, adding new pages
 * (with a repeated slim header rule, logo only on page 1) whenever the next
 * chunk of content wouldn't fit above the footer margin. */
class Cursor {
  pdfDoc: PDFDocument;
  font: PDFFont;
  bold: PDFFont;
  mono: PDFFont;
  logoImage: PDFImage;
  page!: PDFPage;
  y = 0;

  constructor(pdfDoc: PDFDocument, font: PDFFont, bold: PDFFont, mono: PDFFont, logoImage: PDFImage) {
    this.pdfDoc = pdfDoc;
    this.font = font;
    this.bold = bold;
    this.mono = mono;
    this.logoImage = logoImage;
  }

  async start() {
    await this.addPage(true);
  }

  private async addPage(isFirst: boolean) {
    this.page = this.pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);

    if (isFirst) {
      const dims = this.logoImage.scale(28 / this.logoImage.height);
      this.page.drawImage(this.logoImage, { x: MARGIN_X, y: PAGE_HEIGHT - TOP_MARGIN - 28, width: dims.width, height: dims.height });
      this.page.drawLine({
        start: { x: MARGIN_X, y: PAGE_HEIGHT - TOP_MARGIN - 44 },
        end: { x: PAGE_WIDTH - MARGIN_X, y: PAGE_HEIGHT - TOP_MARGIN - 44 },
        thickness: 2,
        color: BRAND_BLUE,
      });
      this.y = PAGE_HEIGHT - TOP_MARGIN - 70;
      return;
    }

    this.page.drawLine({
      start: { x: MARGIN_X, y: PAGE_HEIGHT - TOP_MARGIN },
      end: { x: PAGE_WIDTH - MARGIN_X, y: PAGE_HEIGHT - TOP_MARGIN },
      thickness: 1,
      color: LINE,
    });
    this.y = PAGE_HEIGHT - TOP_MARGIN - 20;
  }

  /** Ensures `needed` points of vertical space remain before the footer
   * margin, starting a new page first if not. `onNewPage` re-draws whatever
   * needs to repeat at the top of a continuation page (e.g. a table header). */
  async ensure(needed: number, onNewPage?: () => void) {
    if (this.y - needed < BOTTOM_MARGIN) {
      await this.addPage(false);
      onNewPage?.();
    }
  }

  text(value: string, x: number, size: number, font: PDFFont, color = INK) {
    this.page.drawText(value, { x, y: this.y, size, font, color });
  }
}

function drawTableHeaderRow(cursor: Cursor, cols: Column[]) {
  const totalWidth = cols.reduce((sum, c) => sum + c.width, 0);
  cursor.page.drawRectangle({ x: MARGIN_X, y: cursor.y - 4, width: totalWidth, height: ROW_HEIGHT, color: BRAND_BLUE });
  let cx = MARGIN_X;
  for (const col of cols) {
    cursor.page.drawText(col.header, { x: cx + 4, y: cursor.y, size: 8, font: cursor.bold, color: rgb(1, 1, 1) });
    cx += col.width;
  }
  cursor.y -= ROW_HEIGHT + 2;
}

async function drawTable(cursor: Cursor, title: string, cols: Column[], rows: string[][], emptyLabel: string) {
  await cursor.ensure(18 + ROW_HEIGHT + 20);
  cursor.text(title, MARGIN_X, 9, cursor.bold, BRAND_BLUE);
  cursor.y -= 16;
  drawTableHeaderRow(cursor, cols);

  if (rows.length === 0) {
    await cursor.ensure(ROW_HEIGHT);
    cursor.text(emptyLabel, MARGIN_X, 9, cursor.font, MUTED);
    cursor.y -= ROW_HEIGHT;
    return;
  }

  for (let i = 0; i < rows.length; i++) {
    // eslint-disable-next-line no-await-in-loop
    await cursor.ensure(ROW_HEIGHT, () => drawTableHeaderRow(cursor, cols));

    if (i % 2 === 1) {
      cursor.page.drawRectangle({
        x: MARGIN_X,
        y: cursor.y - 4,
        width: cols.reduce((sum, c) => sum + c.width, 0),
        height: ROW_HEIGHT,
        color: ROW_ALT,
      });
    }

    let cx = MARGIN_X;
    cols.forEach((col, idx) => {
      const useFont = col.mono ? cursor.mono : cursor.font;
      const size = col.mono ? 6.8 : 8.5;
      const value = truncateToWidth(useFont, rows[i][idx], size, col.width - 8);
      cursor.page.drawText(value, { x: cx + 4, y: cursor.y, size, font: useFont, color: INK });
      cx += col.width;
    });
    cursor.y -= ROW_HEIGHT;
  }
  cursor.y -= 12;
}

const SIGNER_COL_A_WIDTH = 190; // identity
const SIGNER_COL_B_WIDTH = 150; // signature image
const SIGNER_COL_GAP = 10;
const SIGNER_CARD_HEIGHT = 96;

// Honest to how our system actually authenticates signers — there's no
// email-link verification step the way DocuSign's "Email, Account
// Authentication" line implies. The Employee signs in person on the
// coordinator's own authenticated session (no separate employee login yet);
// Department Head / GM sign from their own logged-in platform account.
function securityNoteFor(role: string): string {
  return role === 'Employee'
    ? 'Signed in person, witnessed by an HR coordinator'
    : 'Signed via authenticated platform login';
}

async function drawSignerCards(cursor: Cursor, signatures: HrContract['signatures']) {
  await cursor.ensure(18);
  cursor.text('SIGNER EVENTS', MARGIN_X, 9, cursor.bold, BRAND_BLUE);
  cursor.y -= 18;

  if (signatures.length === 0) {
    await cursor.ensure(16);
    cursor.text('No signatures recorded.', MARGIN_X, 9, cursor.font, MUTED);
    cursor.y -= 16;
    return;
  }

  const colAX = MARGIN_X;
  const colBX = colAX + SIGNER_COL_A_WIDTH + SIGNER_COL_GAP;
  const colCX = colBX + SIGNER_COL_B_WIDTH + SIGNER_COL_GAP;
  const colCWidth = PAGE_WIDTH - MARGIN_X - colCX;

  for (let i = 0; i < signatures.length; i++) {
    const s = signatures[i];
    // eslint-disable-next-line no-await-in-loop
    await cursor.ensure(SIGNER_CARD_HEIGHT);
    const top = cursor.y;

    // ---- Column A: who signed ----
    let ay = top;
    cursor.page.drawText(truncateToWidth(cursor.bold, s.signedByName, 10, SIGNER_COL_A_WIDTH), { x: colAX, y: ay, size: 10, font: cursor.bold, color: INK });
    ay -= 13;
    if (s.signedByEmail) {
      cursor.page.drawText(truncateToWidth(cursor.font, s.signedByEmail, 8, SIGNER_COL_A_WIDTH), { x: colAX, y: ay, size: 8, font: cursor.font, color: MUTED });
      ay -= 12;
    }
    cursor.page.drawText(`Role: ${ROLE_LABEL[s.role] ?? s.role}`, { x: colAX, y: ay, size: 8, font: cursor.font, color: MUTED });
    ay -= 12;
    cursor.page.drawText(`Signature Adoption: ${s.signatureMethod}`, { x: colAX, y: ay, size: 8, font: cursor.font, color: MUTED });
    ay -= 12;
    for (const line of wrapText(cursor.font, securityNoteFor(s.role), 7, SIGNER_COL_A_WIDTH, 2)) {
      cursor.page.drawText(line, { x: colAX, y: ay, size: 7, font: cursor.font, color: MUTED });
      ay -= 10;
    }

    // ---- Column B: the actual signature image used ----
    cursor.page.drawText('Signed by:', { x: colBX, y: top, size: 7, font: cursor.bold, color: BRAND_BLUE });
    const imgAreaTop = top - 12;
    const imgAreaHeight = 44;
    if (s.imageUrl) {
      try {
        // eslint-disable-next-line no-await-in-loop
        const imgBytes = await fetch(s.imageUrl).then((r) => r.arrayBuffer());
        const lower = s.imageUrl.toLowerCase();
        const image = lower.endsWith('.jpg') || lower.endsWith('.jpeg')
          // eslint-disable-next-line no-await-in-loop
          ? await cursor.pdfDoc.embedJpg(imgBytes)
          // eslint-disable-next-line no-await-in-loop
          : await cursor.pdfDoc.embedPng(imgBytes);
        const scale = Math.min((SIGNER_COL_B_WIDTH - 4) / image.width, imgAreaHeight / image.height, 1);
        const w = image.width * scale;
        const h = image.height * scale;
        cursor.page.drawImage(image, { x: colBX + (SIGNER_COL_B_WIDTH - w) / 2, y: imgAreaTop - h, width: w, height: h });
      } catch {
        cursor.page.drawText('[signature image unavailable]', { x: colBX, y: imgAreaTop - 20, size: 7, font: cursor.font, color: MUTED });
      }
    } else {
      cursor.page.drawText('[signature image not recorded]', { x: colBX, y: imgAreaTop - 20, size: 7, font: cursor.font, color: MUTED });
    }
    cursor.page.drawText(
      truncateToWidth(cursor.mono, s.verificationId ?? '-', 6.5, SIGNER_COL_B_WIDTH),
      { x: colBX, y: imgAreaTop - imgAreaHeight - 8, size: 6.5, font: cursor.mono, color: MUTED }
    );

    // ---- Column C: when/where ----
    let cy = top;
    cursor.page.drawText('Signed (UTC)', { x: colCX, y: cy, size: 7, font: cursor.bold, color: MUTED });
    cy -= 11;
    cursor.page.drawText(truncateToWidth(cursor.font, fmt(s.signedAt), 8, colCWidth), { x: colCX, y: cy, size: 8, font: cursor.font, color: INK });
    cy -= 18;
    cursor.page.drawText('Using IP Address', { x: colCX, y: cy, size: 7, font: cursor.bold, color: MUTED });
    cy -= 11;
    cursor.page.drawText(s.ipAddress ?? 'Not recorded', { x: colCX, y: cy, size: 8, font: cursor.font, color: INK });

    cursor.y = top - SIGNER_CARD_HEIGHT + 8;
    if (i < signatures.length - 1) {
      cursor.page.drawLine({
        start: { x: MARGIN_X, y: cursor.y },
        end: { x: PAGE_WIDTH - MARGIN_X, y: cursor.y },
        thickness: 0.5,
        color: LINE,
      });
    }
    cursor.y -= 14;
  }
}

/** Builds a one-or-more-page Certificate of Completion for a fully-signed
 * contract — the same purpose as DocuSign's own certificate (an independent,
 * self-contained record of who signed what, when, and from where), styled
 * with QBC's own branding since this document is issued BY the platform. */
export async function generateCertificateOfCompletion(input: CertificateInput): Promise<Uint8Array> {
  const { employee, contract, events } = input;

  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const mono = await pdfDoc.embedFont(StandardFonts.Courier);

  const logoBytes = await fetch(qbcLogoUrl).then((r) => r.arrayBuffer());
  const logoImage = await pdfDoc.embedPng(logoBytes);

  const cursor = new Cursor(pdfDoc, font, bold, mono, logoImage);
  await cursor.start();

  // English-only, same convention DocuSign's own certificates follow even
  // for multi-language envelopes — StandardFonts.Helvetica also can't encode
  // Arabic, and embedding a custom font just for a name isn't worth the
  // weight on a document that's a system-generated record, not the contract
  // itself (which already carries the bilingual content).
  cursor.text('Certificate of Completion', MARGIN_X, 20, bold, INK);
  cursor.y -= 28;
  cursor.text(`Freelance Contract Renewal — ${employee.fullNameEn}`, MARGIN_X, 11, font, MUTED);
  cursor.y -= 26;

  // ---- Envelope info grid ----
  const infoRows: Array<[string, string, boolean?]> = [
    ['Envelope Id', contract.envelopeId, true],
    ['Subject', `Freelance Contract Renewal — ${employee.fullNameEn}`],
    ['Employee', `${employee.fullNameEn} · ${employee.jobTitleEn} · ${employee.departmentNameEn ?? '-'}`],
    ['Source Reference', `Contract #${contract.id}`],
    ['Status', contract.status],
    ['Signatures', String(contract.signatures.length)],
    ['Document Integrity (SHA-256)', contract.sha256Hash ?? 'Not recorded', true],
    ['Completed', fmt(contract.updatedAt)],
  ];

  await cursor.ensure(infoRows.length * 16 + 20);
  cursor.text('ENVELOPE INFORMATION', MARGIN_X, 9, bold, BRAND_BLUE);
  cursor.y -= 14;

  const labelWidth = 165;
  const valueMaxWidth = PAGE_WIDTH - MARGIN_X * 2 - labelWidth;
  for (const [label, value, isMono] of infoRows) {
    // eslint-disable-next-line no-await-in-loop
    await cursor.ensure(16);
    cursor.text(label, MARGIN_X, 9, bold, MUTED);
    const f = isMono ? mono : font;
    const size = isMono ? 7.5 : 9.5;
    cursor.text(truncateToWidth(f, value, size, valueMaxWidth), MARGIN_X + labelWidth, size, f, INK);
    cursor.y -= 16;
  }
  cursor.y -= 12;

  // ---- Signer Events (one card per signer: identity, the actual signature
  // image used, and when/where they signed — DocuSign's own certificate
  // layout, adapted to what our system actually has on record) ----
  await drawSignerCards(cursor, contract.signatures);

  // ---- Envelope History (full audit trail) ----
  const historyCols: Column[] = [
    { header: 'Event', width: 140 },
    { header: 'Timestamp (UTC)', width: 130 },
    { header: 'Actor', width: 140 },
    { header: 'IP Address', width: 89 },
  ];
  const sortedEvents = [...events].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  const historyRows = sortedEvents.map((e) => [
    EVENT_LABEL[e.eventType] ?? e.eventType,
    fmt(e.createdAt),
    e.actorName ?? 'System',
    e.ipAddress ?? '-',
  ]);
  await drawTable(cursor, 'ENVELOPE HISTORY', historyCols, historyRows, 'No events recorded.');

  // ---- Footer note on every page ----
  // Stacked on two lines rather than sharing one with "Page X of Y" — at
  // this font size the note text is wider than the space that would leave
  // before a right-aligned page number, so side-by-side runs them together.
  const generatedAt = fmt(new Date().toISOString());
  const pages = pdfDoc.getPages();
  pages.forEach((p, idx) => {
    p.drawText(
      `Generated automatically by the Q37 Workflow Platform (QBC) on ${generatedAt} — an independent record of the signing process described above.`,
      { x: MARGIN_X, y: BOTTOM_MARGIN - 20, size: 6.5, font, color: MUTED }
    );
    p.drawText(`Page ${idx + 1} of ${pages.length}`, { x: MARGIN_X, y: BOTTOM_MARGIN - 32, size: 6.5, font, color: MUTED });
  });

  return pdfDoc.save();
}
