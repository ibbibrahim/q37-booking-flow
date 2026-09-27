import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import ExcelJS from 'exceljs';
import {
  AlignmentType,
  Document,
  ExternalHyperlink,
  ImageRun,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx';
import type { DtlBookingReport, DtlBookingReportEntry } from '../types/dtl';
import qbcLightUrl from '../../assets/QBC-light.png';
import qbcLightArUrl from '../../assets/QBC-light-ar.png';

const ARABIC_MONTHS = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
];

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/**
 * One header line per month ("Month:"), followed by one line per booking on its own row:
 * "- DD/MM/YYYY - HH:mm - (price)". Prices can differ within the same guest row when they
 * attended multiple programs, so each line carries its own price rather than one per month.
 */
function groupEntriesByMonthArabic(entries: DtlBookingReportEntry[]): string[] {
  const sorted = [...entries].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const buckets = new Map<string, DtlBookingReportEntry[]>();
  for (const entry of sorted) {
    const d = new Date(entry.date);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const list = buckets.get(key) ?? [];
    list.push(entry);
    buckets.set(key, list);
  }

  const lines: string[] = [];
  for (const [key, monthEntries] of buckets.entries()) {
    const [, monthStr] = key.split('-');
    const monthName = ARABIC_MONTHS[Number(monthStr)];
    lines.push(`${monthName}:`);
    for (const entry of monthEntries) {
      const d = new Date(entry.date);
      const dateStr = `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
      const timeStr = `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
      lines.push(`- ${dateStr} - ${timeStr} - (${entry.price.toFixed(0)})`);
    }
  }
  return lines;
}

function monthYearLabel(iso: string): string {
  const d = new Date(iso);
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  return `${monthNames[d.getMonth()]}_${d.getFullYear()}`;
}

function deriveMonthToken(from: string | null, to: string | null): string {
  if (!from && !to) return 'All_Time';
  if (from && !to) return monthYearLabel(from);
  if (!from && to) return monthYearLabel(to);
  const fromLabel = monthYearLabel(from!);
  const toLabel = monthYearLabel(to!);
  return fromLabel === toLabel ? fromLabel : `${fromLabel}_to_${toLabel}`;
}

function buildFileBaseName(report: DtlBookingReport): string {
  return `QBC_DTL_${deriveMonthToken(report.from, report.to)}`;
}

function formatRangeLabel(report: DtlBookingReport): string {
  if (!report.from && !report.to) return 'All time';
  const fmt = (iso: string) => new Date(iso).toLocaleDateString('en-GB');
  if (report.from && report.to) return `${fmt(report.from)} – ${fmt(report.to)}`;
  return fmt((report.from ?? report.to)!);
}

function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

async function fetchAsArrayBuffer(url: string): Promise<ArrayBuffer | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.arrayBuffer();
  } catch {
    return null;
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const PDF_HTML_CANVAS_SCALE = 2;

function addCanvasToPdf(doc: jsPDF, canvas: HTMLCanvasElement, marginMm: number): void {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const imgWidthMm = pageWidth - 2 * marginMm;
  const totalImgHeightMm = (canvas.height * imgWidthMm) / canvas.width;
  const availableMm = pageHeight - 2 * marginMm;

  if (totalImgHeightMm <= availableMm) {
    doc.addImage(canvas.toDataURL('image/png', 1.0), 'PNG', marginMm, marginMm, imgWidthMm, totalImgHeightMm);
    return;
  }

  const maxSlicePx = Math.ceil((availableMm * canvas.width) / imgWidthMm);
  let yOffsetPx = 0;
  let isFirst = true;
  while (yOffsetPx < canvas.height) {
    const sliceHeightPx = Math.min(maxSlicePx, canvas.height - yOffsetPx);
    const slice = document.createElement('canvas');
    slice.width = canvas.width;
    slice.height = sliceHeightPx;
    const ctx = slice.getContext('2d');
    if (!ctx) break;
    ctx.drawImage(canvas, 0, yOffsetPx, canvas.width, sliceHeightPx, 0, 0, canvas.width, sliceHeightPx);
    const sliceH = (sliceHeightPx * imgWidthMm) / canvas.width;
    if (!isFirst) doc.addPage();
    doc.addImage(slice.toDataURL('image/png', 1.0), 'PNG', marginMm, marginMm, imgWidthMm, sliceH);
    yOffsetPx += sliceHeightPx;
    isFirst = false;
  }
}

function buildPdfDom(report: DtlBookingReport): HTMLDivElement {
  const rowsHtml = report.rows
    .map((r, i) => {
      const dates = groupEntriesByMonthArabic(r.entries).map(escapeHtml).join('<br/>');
      const doc = (label: string, link: string | null) =>
        link ? `<a href="${link}" target="_blank">${label}</a>` : '—';
      return `<tr>
        <td>${i + 1}</td>
        <td class="name-cell">${escapeHtml(r.name)}</td>
        <td>${r.bookingCount}</td>
        <td>${escapeHtml(r.programNames.join(' + '))}</td>
        <td class="dates-cell">${dates}</td>
        <td>${r.amount.toFixed(2)}</td>
        <td></td>
        <td>${r.imageLink ? `<img class="thumb" src="${r.imageLink}" crossorigin="anonymous" />` : '—'}</td>
        <td>${doc('View', r.passportLink)}</td>
        <td>${doc('View', r.ibanLink)}</td>
      </tr>`;
    })
    .join('');

  const wrapper = document.createElement('div');
  wrapper.className = 'dtl-pdf-root';
  wrapper.innerHTML = `
<style>
@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@400;600&family=Inter:wght@400;600&display=swap');
.dtl-pdf-root {
  box-sizing: border-box;
  width: 1400px;
  padding: 24px 28px 32px;
  background: #fff;
  color: #111827;
  font-family: 'Inter', 'Noto Sans Arabic', 'Segoe UI', Tahoma, sans-serif;
  font-size: 11px;
  line-height: 1.4;
  direction: rtl;
}
.dtl-pdf-root * { box-sizing: border-box; }
.pdf-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 2px solid #1e40af;
}
.pdf-logo-group { display: flex; align-items: center; gap: 8px; }
.pdf-logo { height: 48px; width: auto; object-fit: contain; }
.pdf-logo-divider { width: 1px; height: 36px; background: #ccc; flex-shrink: 0; }
.pdf-title-block { flex: 1; text-align: center; }
.pdf-title { margin: 0; font-size: 20px; font-weight: 600; }
.pdf-sub { margin: 6px 0 0; font-size: 12px; color: #4b5563; }
.pdf-table-wrap { border: 1px solid #d1d5db; border-radius: 4px; overflow: hidden; margin-bottom: 16px; }
.pdf-table { width: 100%; border-collapse: collapse; table-layout: fixed; }
.pdf-table thead th {
  background: #1d4ed8;
  color: #fff;
  font-weight: 600;
  padding: 8px 6px;
  border: 1px solid #1e3a8a;
  vertical-align: middle;
  font-size: 10px;
}
.pdf-table tbody td {
  border: 1px solid #e5e7eb;
  padding: 8px 6px;
  vertical-align: middle;
  text-align: center;
  word-break: break-word;
}
.pdf-table .name-cell { font-weight: 600; }
.pdf-table .dates-cell { text-align: right; font-size: 10px; }
.pdf-table a { color: #1d4ed8; }
.thumb { width: 32px; height: 32px; object-fit: cover; border-radius: 4px; }
.pdf-footer-row td { font-weight: 700; background: #eff6ff; }
.pdf-footer { margin-top: 12px; text-align: center; font-size: 9px; color: #9ca3af; }
</style>
<div class="pdf-header">
  <div class="pdf-logo-group">
    <img class="pdf-logo" src="${qbcLightUrl}" alt="QBC" crossorigin="anonymous" />
    <div class="pdf-logo-divider"></div>
    <img class="pdf-logo" src="${qbcLightArUrl}" alt="كيو بي سي" crossorigin="anonymous" />
  </div>
  <div class="pdf-title-block">
    <h1 class="pdf-title">DTL Booking Report</h1>
    <p class="pdf-sub">${escapeHtml(formatRangeLabel(report))}</p>
  </div>
  <div style="width:120px"></div>
</div>
<div class="pdf-table-wrap">
  <table class="pdf-table">
    <thead>
      <tr>
        <th>#</th>
        <th>اسم الضيف</th>
        <th>عدد الظهور</th>
        <th>اسم البرنامج</th>
        <th>التاريخ</th>
        <th>المبلغ المستحق</th>
        <th>ملاحظه</th>
        <th>الصورة</th>
        <th>جواز السفر</th>
        <th>الآيبان</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml}
      <tr class="pdf-footer-row">
        <td colspan="5">الإجمالي</td>
        <td>${report.grandTotal.toFixed(2)}</td>
        <td colspan="3"></td>
      </tr>
    </tbody>
  </table>
</div>
<p class="pdf-footer">Generated ${escapeHtml(new Date().toLocaleString())}</p>
`;
  return wrapper;
}

export async function exportDtlReportToPdf(report: DtlBookingReport): Promise<void> {
  const root = buildPdfDom(report);
  root.style.position = 'fixed';
  root.style.left = '-10000px';
  root.style.top = '0';
  root.style.zIndex = '-1';
  document.body.appendChild(root);

  try {
    const imgEls = root.querySelectorAll('img');
    await Promise.all(
      Array.from(imgEls).map(async (el) => {
        const imgEl = el as HTMLImageElement;
        if (!imgEl.src) return;
        try {
          await imgEl.decode();
        } catch {
          await new Promise<void>((resolve) => {
            imgEl.onload = () => resolve();
            imgEl.onerror = () => resolve();
          });
        }
      }),
    );

    await document.fonts.ready;
    await new Promise((r) => setTimeout(r, 200));

    const canvas = await html2canvas(root, {
      scale: PDF_HTML_CANVAS_SCALE,
      useCORS: true,
      allowTaint: false,
      backgroundColor: '#ffffff',
      logging: false,
    });

    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    addCanvasToPdf(doc, canvas, 10);
    doc.save(`${buildFileBaseName(report)}.pdf`);
  } finally {
    document.body.removeChild(root);
  }
}

export async function exportDtlReportToExcel(report: DtlBookingReport): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Q37 Workflow';
  const sheet = workbook.addWorksheet('DTL Report', {
    views: [{ rightToLeft: true, showGridLines: true }],
  });

  const headers = ['#', 'اسم الضيف', 'عدد الظهور', 'اسم البرنامج', 'التاريخ', 'المبلغ المستحق', 'ملاحظه', 'الصورة', 'جواز السفر', 'الآيبان'];
  const lastCol = headers.length;

  sheet.getRow(1).height = 44;
  const [bufferEn, bufferAr] = await Promise.all([
    fetch(qbcLightUrl).then((r) => r.arrayBuffer()),
    fetch(qbcLightArUrl).then((r) => r.arrayBuffer()),
  ]);
  const imageIdEn = workbook.addImage({ buffer: bufferEn, extension: 'png' });
  const imageIdAr = workbook.addImage({ buffer: bufferAr, extension: 'png' });
  sheet.addImage(imageIdEn, { tl: { col: 0, row: 0 }, ext: { width: 100, height: 36 } });
  sheet.addImage(imageIdAr, { tl: { col: 1.4, row: 0 }, ext: { width: 96, height: 36 } });

  const titleRow = 3;
  const subRow = 4;
  const headerRow = 6;
  let currentRow = 7;

  sheet.mergeCells(titleRow, 1, titleRow, lastCol);
  const titleCell = sheet.getCell(titleRow, 1);
  titleCell.value = 'DTL Booking Report';
  titleCell.font = { bold: true, size: 16 };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };

  sheet.mergeCells(subRow, 1, subRow, lastCol);
  const subCell = sheet.getCell(subRow, 1);
  subCell.value = formatRangeLabel(report);
  subCell.font = { size: 11, color: { argb: 'FF4B5563' } };
  subCell.alignment = { horizontal: 'center', vertical: 'middle' };

  headers.forEach((h, i) => {
    const cell = sheet.getCell(headerRow, i + 1);
    cell.value = h;
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1D4ED8' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  });

  const thinBorder = {
    top: { style: 'thin' as const, color: { argb: 'FFD1D5DB' } },
    left: { style: 'thin' as const, color: { argb: 'FFD1D5DB' } },
    bottom: { style: 'thin' as const, color: { argb: 'FFD1D5DB' } },
    right: { style: 'thin' as const, color: { argb: 'FFD1D5DB' } },
  };

  async function addLinkOrImage(rowNum: number, colNum: number, link: string | null, asThumb: boolean) {
    const cell = sheet.getCell(rowNum, colNum);
    if (!link) {
      cell.value = '—';
      return;
    }
    if (asThumb) {
      const buf = await fetchAsArrayBuffer(link);
      if (buf) {
        const imgId = workbook.addImage({ buffer: buf, extension: 'png' });
        sheet.addImage(imgId, {
          tl: { col: colNum - 1 + 0.1, row: rowNum - 1 + 0.1 },
          ext: { width: 28, height: 28 },
        });
        return;
      }
    }
    cell.value = { text: 'View', hyperlink: link };
    cell.font = { color: { argb: 'FF1D4ED8' }, underline: true };
  }

  for (const r of report.rows) {
    const rowIndex = currentRow;
    sheet.getCell(rowIndex, 1).value = rowIndex - headerRow;
    sheet.getCell(rowIndex, 2).value = r.name;
    sheet.getCell(rowIndex, 3).value = r.bookingCount;
    sheet.getCell(rowIndex, 4).value = r.programNames.join(' + ');
    const datesCell = sheet.getCell(rowIndex, 5);
    datesCell.value = groupEntriesByMonthArabic(r.entries).join('\n');
    datesCell.alignment = { wrapText: true, horizontal: 'right', vertical: 'middle' };
    sheet.getCell(rowIndex, 6).value = r.amount;
    sheet.getCell(rowIndex, 7).value = '';

    await addLinkOrImage(rowIndex, 8, r.imageLink, true);
    await addLinkOrImage(rowIndex, 9, r.passportLink, false);
    await addLinkOrImage(rowIndex, 10, r.ibanLink, false);

    for (let c = 1; c <= lastCol; c++) {
      const cell = sheet.getCell(rowIndex, c);
      cell.border = thinBorder;
      if (c !== 5) cell.alignment = cell.alignment ?? { horizontal: 'center', vertical: 'middle' };
    }
    sheet.getRow(rowIndex).height = 32;
    currentRow += 1;
  }

  sheet.mergeCells(currentRow, 1, currentRow, 5);
  const totalLabelCell = sheet.getCell(currentRow, 1);
  totalLabelCell.value = 'الإجمالي';
  totalLabelCell.font = { bold: true };
  totalLabelCell.alignment = { horizontal: 'center', vertical: 'middle' };
  const totalValueCell = sheet.getCell(currentRow, 6);
  totalValueCell.value = report.grandTotal;
  totalValueCell.font = { bold: true };
  for (let c = 1; c <= lastCol; c++) {
    sheet.getCell(currentRow, c).border = thinBorder;
    sheet.getCell(currentRow, c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFF6FF' } };
  }

  sheet.columns = [
    { width: 6 }, { width: 22 }, { width: 12 }, { width: 18 },
    { width: 34 }, { width: 16 }, { width: 16 }, { width: 10 }, { width: 12 }, { width: 12 },
  ];

  const buf = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  triggerBlobDownload(blob, `${buildFileBaseName(report)}.xlsx`);
}

async function docxLinkOrImageCell(label: string, link: string | null, asImage: boolean): Promise<TableCell> {
  if (!link) {
    return new TableCell({ children: [new Paragraph({ text: '—', alignment: AlignmentType.CENTER })] });
  }
  if (asImage) {
    const buf = await fetchAsArrayBuffer(link);
    if (buf) {
      return new TableCell({
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new ImageRun({ type: 'png', data: buf, transformation: { width: 32, height: 32 } })],
          }),
        ],
      });
    }
  }
  return new TableCell({
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new ExternalHyperlink({
            link,
            children: [new TextRun({ text: label, style: 'Hyperlink' })],
          }),
        ],
      }),
    ],
  });
}

function docxTextCell(text: string, opts?: { bold?: boolean; rtl?: boolean }): TableCell {
  return new TableCell({
    children: [
      new Paragraph({
        alignment: opts?.rtl ? AlignmentType.RIGHT : AlignmentType.CENTER,
        bidirectional: opts?.rtl,
        children: [new TextRun({ text, bold: opts?.bold })],
      }),
    ],
  });
}

function docxMultilineCell(lines: string[]): TableCell {
  return new TableCell({
    children: lines.length
      ? lines.map((line) => new Paragraph({ alignment: AlignmentType.RIGHT, bidirectional: true, children: [new TextRun({ text: line })] }))
      : [new Paragraph({ text: '—' })],
  });
}

export async function exportDtlReportToDocx(report: DtlBookingReport): Promise<void> {
  const headers = ['#', 'اسم الضيف', 'عدد الظهور', 'اسم البرنامج', 'التاريخ', 'المبلغ المستحق', 'ملاحظه', 'الصورة', 'جواز السفر', 'الآيبان'];

  const headerRow = new TableRow({
    tableHeader: true,
    children: headers.map((h) => docxTextCell(h, { bold: true, rtl: true })),
  });

  const dataRows: TableRow[] = [];
  for (let i = 0; i < report.rows.length; i++) {
    const r = report.rows[i];
    const imageCell = await docxLinkOrImageCell('View', r.imageLink, true);
    const passportCell = await docxLinkOrImageCell('View', r.passportLink, false);
    const ibanCell = await docxLinkOrImageCell('View', r.ibanLink, false);

    dataRows.push(
      new TableRow({
        children: [
          docxTextCell(String(i + 1)),
          docxTextCell(r.name, { rtl: true }),
          docxTextCell(String(r.bookingCount)),
          docxTextCell(r.programNames.join(' + '), { rtl: true }),
          docxMultilineCell(groupEntriesByMonthArabic(r.entries)),
          docxTextCell(r.amount.toFixed(2)),
          docxTextCell(''),
          imageCell,
          passportCell,
          ibanCell,
        ],
      }),
    );
  }

  const totalRow = new TableRow({
    children: [
      new TableCell({ columnSpan: 5, children: [new Paragraph({ alignment: AlignmentType.RIGHT, bidirectional: true, children: [new TextRun({ text: 'الإجمالي', bold: true })] })] }),
      docxTextCell(report.grandTotal.toFixed(2), { bold: true }),
      new TableCell({ columnSpan: 4, children: [new Paragraph('')] }),
    ],
  });

  const table = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [headerRow, ...dataRows, totalRow],
  });

  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: 'DTL Booking Report', bold: true, size: 32 })],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: formatRangeLabel(report), size: 22, color: '4B5563' })],
          }),
          new Paragraph({ text: '' }),
          table,
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  triggerBlobDownload(blob, `${buildFileBaseName(report)}.docx`);
}
