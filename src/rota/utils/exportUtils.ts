import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import ExcelJS from 'exceljs';
import type { RotaWeek, RotaDepartment, RotaEmployee, RotaAssignment, RotaShiftType } from '../types/rota';
import { formatDateForApi, parseLocalDate, normalizeDateString } from './dateUtils';
import { getAssignmentDisplay, formatShiftTiming } from './rotaUtils';
import logoUrl from '../../assets/Qbusiness_Logo_NEG_POS-02.png';
import q37LogoUrl from '../../assets/q37.png';

/** PDF header logo: Q37 for News and Digital, otherwise Q Business. */
function getPdfExportLogoSrc(department: RotaDepartment): string {
  const name = department.name?.trim().toLowerCase() ?? '';
  if (name === 'news and digital') return q37LogoUrl;
  return logoUrl;
}

/** Format date for display, e.g. "22 Mar 2026" */
const formatDateDisplay = (date: Date | string): string => {
  const d = typeof date === 'string' ? parseLocalDate(date) : new Date(date);
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function hexToRgb(hex: string): [number, number, number] | null {
  const normalized = hex.trim().startsWith('#') ? hex.trim() : `#${hex.trim()}`;
  const m = /^#?([0-9a-f]{6})$/i.exec(normalized);
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Excel ARGB from #RRGGBB */
function hexToArgb(hex: string): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return 'FFFFFFFF';
  return rgbToArgb(rgb);
}

function rgbToArgb(rgb: [number, number, number]): string {
  return (
    'FF' +
    rgb
      .map((x) => Math.min(255, Math.round(x)).toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase()
  );
}

/** Light background tint from shift hex color */
function lightenFillFromHex(hex: string): [number, number, number] {
  const rgb = hexToRgb(hex);
  if (!rgb) return [243, 244, 246];
  return rgb.map((c) => Math.min(255, Math.round(c + (255 - c) * 0.75))) as [
    number,
    number,
    number,
  ];
}

function fillRgbForAssignment(
  assignment: RotaAssignment,
  shiftTypes?: RotaShiftType[]
): [number, number, number] | null {
  if (assignment.isOffDay) return [243, 244, 246];
  const st =
    assignment.shiftType ??
    (assignment.shiftTypeId != null && shiftTypes?.length
      ? shiftTypes.find((s) => s.id === assignment.shiftTypeId)
      : undefined);
  if (st?.color) return lightenFillFromHex(st.color);
  return null;
}

const getCellText = (assignment: RotaAssignment, shiftTypes?: RotaShiftType[]): string => {
  const display = getAssignmentDisplay(assignment, shiftTypes);
  if (!display) return '';
  let text = display.label;
  if (assignment.programName && display.label !== assignment.programName) {
    text += `\n${assignment.programName}`;
  }
  return text;
};

type Grouped = { departmentName: string | null; employees: RotaEmployee[] };

function buildGroupedEmployees(
  department: RotaDepartment,
  employees: RotaEmployee[]
): Grouped[] {
  if (!department.hasSubDepartments) {
    return [
      {
        departmentName: null,
        employees: [...employees],
      },
    ];
  }
  const groups = employees.reduce(
    (acc, emp) => {
      const deptName = emp.departmentName || 'Other';
      if (!acc[deptName]) acc[deptName] = [];
      acc[deptName].push(emp);
      return acc;
    },
    {} as Record<string, RotaEmployee[]>
  );
  return Object.entries(groups).map(([departmentName, emps]) => ({
    departmentName,
    employees: emps,
  }));
}

const PDF_HTML_CANVAS_SCALE = 2;

/**
 * Y-ranges in **canvas pixels** (same space as html2canvas output): each range is
 * [subdept header row top, first employee row bottom] so we never slice between them.
 */
function getPdfSubdeptWithFirstRowRanges(
  root: HTMLElement,
  canvasScale: number
): { top: number; bottom: number }[] {
  const table = root.querySelector('.pdf-table tbody');
  if (!table) return [];
  const rows = Array.from(table.querySelectorAll('tr'));
  const rootRect = root.getBoundingClientRect();
  const ranges: { top: number; bottom: number }[] = [];

  for (let i = 0; i < rows.length; i++) {
    const tr = rows[i];
    if (!tr.classList.contains('subdept-row')) continue;
    const next = rows[i + 1];
    if (!next || next.classList.contains('subdept-row')) continue;

    const r0 = tr.getBoundingClientRect();
    const r1 = next.getBoundingClientRect();
    const topCss = r0.top - rootRect.top;
    const bottomCss = r1.bottom - rootRect.top;
    ranges.push({
      top: topCss * canvasScale,
      bottom: bottomCss * canvasScale,
    });
  }
  return ranges;
}

/**
 * Slice a tall canvas across PDF pages (landscape A4).
 * `keepTogetherRanges` = canvas-pixel bands that must not be split by a page break
 * (e.g. sub-team header + first employee row).
 */
function addCanvasToPdf(
  doc: jsPDF,
  canvas: HTMLCanvasElement,
  marginMm: number,
  keepTogetherRanges?: { top: number; bottom: number }[]
): void {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const imgWidthMm = pageWidth - 2 * marginMm;
  const totalImgHeightMm = (canvas.height * imgWidthMm) / canvas.width;
  const availableMm = pageHeight - 2 * marginMm;

  if (totalImgHeightMm <= availableMm) {
    doc.addImage(
      canvas.toDataURL('image/png', 1.0),
      'PNG',
      marginMm,
      marginMm,
      imgWidthMm,
      totalImgHeightMm
    );
    return;
  }

  const maxSlicePx = Math.ceil((availableMm * canvas.width) / imgWidthMm);
  const ranges = keepTogetherRanges ?? [];

  let yOffsetPx = 0;
  let isFirst = true;
  while (yOffsetPx < canvas.height) {
    let proposedEnd = Math.min(yOffsetPx + maxSlicePx, canvas.height);

    let snapped = true;
    while (snapped) {
      snapped = false;
      for (const { top, bottom } of ranges) {
        if (top < proposedEnd && proposedEnd < bottom) {
          proposedEnd = top;
          snapped = true;
        }
      }
    }

    if (proposedEnd <= yOffsetPx) {
      proposedEnd = Math.min(yOffsetPx + maxSlicePx, canvas.height);
      if (proposedEnd <= yOffsetPx) {
        proposedEnd = Math.min(yOffsetPx + 1, canvas.height);
      }
    }

    const sliceHeightPx = proposedEnd - yOffsetPx;
    const slice = document.createElement('canvas');
    slice.width = canvas.width;
    slice.height = sliceHeightPx;
    const ctx = slice.getContext('2d');
    if (!ctx) break;
    ctx.drawImage(
      canvas,
      0,
      yOffsetPx,
      canvas.width,
      sliceHeightPx,
      0,
      0,
      canvas.width,
      sliceHeightPx
    );
    const sliceH = (sliceHeightPx * imgWidthMm) / canvas.width;
    if (!isFirst) doc.addPage();
    doc.addImage(slice.toDataURL('image/png', 1.0), 'PNG', marginMm, marginMm, imgWidthMm, sliceH);
    yOffsetPx += sliceHeightPx;
    isFirst = false;
  }
}

function shiftTypesLegendHtml(shiftTypes: RotaShiftType[]): string {
  const active = [...shiftTypes]
    .filter((s) => s.isActive)
    .sort((a, b) => a.displayOrder - b.displayOrder || a.label.localeCompare(b.label));
  if (active.length === 0) {
    return '<p class="legend-empty">No shift types defined for this department.</p>';
  }
  const items = active
    .map((st) => {
      const rgb = hexToRgb(st.color) ?? [200, 200, 200];
      const bg = `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`;
      const timing =
        formatShiftTiming(st.startTime, st.endTime) ||
        (st.label.includes('(') ? st.label.replace(/^[^()]*\(([^)]*)\).*/, '$1') : '');
      return `<div class="legend-item">
        <span class="legend-swatch" style="background:${bg}"></span>
        <span class="legend-text"><strong>${escapeHtml(st.label)}</strong>
        ${timing ? `<span class="legend-time">${escapeHtml(timing)}</span>` : ''}</span>
      </div>`;
    })
    .join('');
  return `<div class="legend-wrap"><h3>Shift types</h3><div class="legend-grid">${items}</div></div>`;
}

function buildPdfDom(params: {
  department: RotaDepartment;
  weekStartStr: string;
  weekEndStr: string;
  week: RotaWeek;
  weekStartDate: Date;
  groupedEmployees: Grouped[];
  shiftTypes: RotaShiftType[];
}): HTMLDivElement {
  const { department, weekStartStr, weekEndStr, week, weekStartDate, groupedEmployees, shiftTypes } =
    params;

  const dayHeaders: { short: string; full: string }[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStartDate);
    d.setDate(weekStartDate.getDate() + i);
    const short = d.toLocaleDateString('en-GB', { weekday: 'short' });
    const full = formatDateDisplay(d);
    dayHeaders.push({ short, full });
  }

  let tableBody = '';
  groupedEmployees.forEach((group) => {
    if (group.departmentName) {
      tableBody += `<tr class="subdept-row"><td colspan="8">${escapeHtml(group.departmentName)}</td></tr>`;
    }
    group.employees.forEach((emp) => {
      tableBody += '<tr>';
      tableBody += `<td class="name-cell">${escapeHtml(emp.name)}</td>`;
      for (let i = 0; i < 7; i++) {
        const date = new Date(weekStartDate);
        date.setDate(weekStartDate.getDate() + i);
        const dateStr = formatDateForApi(date);
        const assignment = (week.assignments ?? []).find(
          (a) =>
            a.employeeId === emp.id && normalizeDateString(a.shiftDate) === dateStr
        );
        if (assignment) {
          const text = getCellText(assignment, shiftTypes);
          const fill = fillRgbForAssignment(assignment, shiftTypes);
          const bg = fill ? `background:rgb(${fill[0]},${fill[1]},${fill[2]});` : '';
          const inner = escapeHtml(text).replace(/\n/g, '<br/>');
          tableBody += `<td class="shift-cell" style="${bg}">${inner}</td>`;
        } else {
          tableBody += '<td class="shift-cell empty"></td>';
        }
      }
      tableBody += '</tr>';
    });
  });

  const headCells = dayHeaders
    .map(
      (h) =>
        `<th><span class="dh-short">${escapeHtml(h.short)}</span><span class="dh-date">${escapeHtml(h.full)}</span></th>`
    )
    .join('');

  const wrapper = document.createElement('div');
  wrapper.className = 'rota-pdf-root';
  wrapper.innerHTML = `
<style>
@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@400;600&family=Inter:wght@400;600&display=swap');
.rota-pdf-root {
  box-sizing: border-box;
  width: 1120px;
  padding: 24px 28px 32px;
  background: #fff;
  color: #111827;
  font-family: 'Inter', 'Noto Sans Arabic', 'Segoe UI', Tahoma, sans-serif;
  font-size: 11px;
  line-height: 1.35;
}
.rota-pdf-root * { box-sizing: border-box; }
.pdf-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 2px solid #1e40af;
}
.pdf-logo { height: 52px; width: auto; object-fit: contain; }
.pdf-title-block { flex: 1; text-align: center; }
.pdf-title { margin: 0; font-size: 22px; font-weight: 600; letter-spacing: -0.02em; }
.pdf-sub { margin: 6px 0 0; font-size: 13px; color: #4b5563; }
.pdf-table-wrap {
  border: 1px solid #d1d5db;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 20px;
}
.pdf-table { width: 100%; border-collapse: collapse; table-layout: fixed; }
.pdf-table thead th {
  background: #1d4ed8;
  color: #fff;
  font-weight: 600;
  padding: 10px 6px;
  border: 1px solid #1e3a8a;
  vertical-align: middle;
}
.pdf-table thead th:first-child { width: 140px; }
.dh-short { display: block; font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; }
.dh-date { display: block; font-size: 10px; opacity: 0.95; font-weight: 400; margin-top: 2px; }
.pdf-table tbody td {
  border: 1px solid #e5e7eb;
  padding: 8px 6px;
  vertical-align: middle;
  text-align: center;
  word-break: break-word;
}
.pdf-table .name-cell {
  text-align: left;
  font-weight: 600;
  background: #f9fafb;
}
.pdf-table tr.subdept-row {
  break-after: avoid-page;
  page-break-after: avoid;
}
.pdf-table .subdept-row td {
  background: #e0e7ff;
  color: #312e81;
  font-weight: 600;
  text-align: left;
  padding: 8px 12px;
  border-color: #c7d2fe;
}
.pdf-table .shift-cell.empty { background: #fff; }
.legend-wrap h3 {
  margin: 0 0 10px;
  font-size: 12px;
  font-weight: 600;
  color: #374151;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
.legend-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 16px;
}
.legend-item { display: flex; align-items: center; gap: 8px; min-width: 200px; }
.legend-swatch {
  width: 18px;
  height: 18px;
  border-radius: 4px;
  border: 1px solid rgba(0,0,0,0.12);
  flex-shrink: 0;
}
.legend-text { font-size: 11px; }
.legend-time { color: #6b7280; margin-left: 6px; }
.legend-empty { color: #6b7280; font-size: 11px; margin: 0; }
.pdf-footer {
  margin-top: 16px;
  text-align: center;
  font-size: 9px;
  color: #9ca3af;
}
</style>
<div class="pdf-header">
  <img class="pdf-logo" src="${getPdfExportLogoSrc(department)}" alt="" crossorigin="anonymous" />
  <div class="pdf-title-block">
    <h1 class="pdf-title">${escapeHtml(department.name)} — Weekly rota</h1>
    <p class="pdf-sub">${escapeHtml(weekStartStr)} – ${escapeHtml(weekEndStr)}</p>
  </div>
  <div style="width:120px"></div>
</div>
<div class="pdf-table-wrap">
  <table class="pdf-table">
    <thead>
      <tr>
        <th>Employee</th>
        ${headCells}
      </tr>
    </thead>
    <tbody>
      ${tableBody}
    </tbody>
  </table>
</div>
${shiftTypesLegendHtml(shiftTypes)}
<p class="pdf-footer">Generated ${escapeHtml(new Date().toLocaleString())}</p>
`;

  return wrapper;
}

export async function exportRotaToPDF(
  week: RotaWeek,
  department: RotaDepartment,
  employees: RotaEmployee[],
  shiftTypes: RotaShiftType[] = []
): Promise<void> {
  const weekStartDate = parseLocalDate(week.weekStartDate);
  const weekEndDate = new Date(weekStartDate);
  weekEndDate.setDate(weekStartDate.getDate() + 6);
  const weekStartStr = formatDateDisplay(weekStartDate);
  const weekEndStr = formatDateDisplay(weekEndDate);

  const groupedEmployees = buildGroupedEmployees(department, employees);

  const root = buildPdfDom({
    department,
    weekStartStr,
    weekEndStr,
    week,
    weekStartDate,
    groupedEmployees,
    shiftTypes: shiftTypes.length ? shiftTypes : department.shiftTypes ?? [],
  });

  root.style.position = 'fixed';
  root.style.left = '-10000px';
  root.style.top = '0';
  root.style.zIndex = '-1';
  document.body.appendChild(root);

  try {
    const logoEl = root.querySelector('.pdf-logo') as HTMLImageElement | null;
    if (logoEl?.src) {
      try {
        await logoEl.decode();
      } catch {
        await new Promise<void>((resolve) => {
          logoEl.onload = () => resolve();
          logoEl.onerror = () => resolve();
        });
      }
    }

    await document.fonts.ready;
    await new Promise((r) => setTimeout(r, 200));

    const keepTogetherRanges = getPdfSubdeptWithFirstRowRanges(root, PDF_HTML_CANVAS_SCALE);

    const canvas = await html2canvas(root, {
      scale: PDF_HTML_CANVAS_SCALE,
      useCORS: true,
      allowTaint: false,
      backgroundColor: '#ffffff',
      logging: false,
    });

    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    addCanvasToPdf(doc, canvas, 10, keepTogetherRanges);

    const safeName = department.name.replace(/\s+/g, '_');
    const safeDate = weekStartStr.replace(/\s+/g, '_');
    doc.save(`${safeName}_Rota_${safeDate}.pdf`);
  } finally {
    document.body.removeChild(root);
  }
}

export async function exportRotaToExcel(
  week: RotaWeek,
  department: RotaDepartment,
  employees: RotaEmployee[],
  shiftTypes: RotaShiftType[] = []
): Promise<void> {
  const weekStartDate = parseLocalDate(week.weekStartDate);
  const weekEndDate = new Date(weekStartDate);
  weekEndDate.setDate(weekStartDate.getDate() + 6);
  const weekStartStr = formatDateDisplay(weekStartDate);
  const weekEndStr = formatDateDisplay(weekEndDate);

  const types = shiftTypes.length ? shiftTypes : department.shiftTypes ?? [];
  const groupedEmployees = buildGroupedEmployees(department, employees);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Q37 Workflow';
  const sheet = workbook.addWorksheet('Schedule', {
    views: [{ showGridLines: true }],
  });

  const lastCol = 9;
  const lastColLetter = 'I';

  sheet.mergeCells(`A1:${lastColLetter}1`);
  const titleCell = sheet.getCell('A1');
  titleCell.value = `${department.name} Schedule`;
  titleCell.font = { bold: true, size: 16, color: { argb: 'FF1F2937' } };
  titleCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFFFFFCC' },
  };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  sheet.getRow(1).height = 32;

  sheet.mergeCells(`A2:${lastColLetter}2`);
  const subCell = sheet.getCell('A2');
  subCell.value = `${weekStartStr} – ${weekEndStr}`;
  subCell.font = { size: 12, color: { argb: 'FF4B5563' } };
  subCell.alignment = { horizontal: 'center', vertical: 'middle' };
  sheet.getRow(2).height = 22;

  const headerRow = 4;
  const headers = ['Unit', 'Employee', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  headers.forEach((h, i) => {
    const cell = sheet.getCell(headerRow, i + 1);
    cell.value = h;
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1D4ED8' },
    };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF1E3A8A' } },
      left: { style: 'thin', color: { argb: 'FF1E3A8A' } },
      bottom: { style: 'thin', color: { argb: 'FF1E3A8A' } },
      right: { style: 'thin', color: { argb: 'FF1E3A8A' } },
    };
  });

  const dateRow = 5;
  sheet.getCell(dateRow, 1).value = '';
  sheet.getCell(dateRow, 2).value = '';
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStartDate);
    d.setDate(weekStartDate.getDate() + i);
    const cell = sheet.getCell(dateRow, i + 3);
    cell.value = formatDateDisplay(d);
    cell.font = { size: 10, color: { argb: 'FF1F2937' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFEFF6FF' },
    };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFBFDBFE' } },
      left: { style: 'thin', color: { argb: 'FFBFDBFE' } },
      bottom: { style: 'thin', color: { argb: 'FFBFDBFE' } },
      right: { style: 'thin', color: { argb: 'FFBFDBFE' } },
    };
  }
  sheet.getRow(dateRow).height = 20;

  let currentRow = 6;
  const thinBorder = {
    top: { style: 'thin' as const, color: { argb: 'FF000000' } },
    left: { style: 'thin' as const, color: { argb: 'FF000000' } },
    bottom: { style: 'thin' as const, color: { argb: 'FF000000' } },
    right: { style: 'thin' as const, color: { argb: 'FF000000' } },
  };

  groupedEmployees.forEach((group) => {
    if (group.departmentName) {
      sheet.mergeCells(currentRow, 1, currentRow, lastCol);
      const div = sheet.getCell(currentRow, 1);
      div.value = group.departmentName;
      div.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      div.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFDC2626' },
      };
      div.alignment = { horizontal: 'center', vertical: 'middle' };
      div.border = thinBorder;
      sheet.getRow(currentRow).height = 22;
      currentRow += 1;

      const unitStart = currentRow;
      group.employees.forEach((emp) => {
        const unitCell = sheet.getCell(currentRow, 1);
        unitCell.value = group.departmentName ?? '';
        unitCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        unitCell.border = thinBorder;

        const nameCell = sheet.getCell(currentRow, 2);
        nameCell.value = emp.name;
        nameCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        nameCell.border = thinBorder;

        for (let i = 0; i < 7; i++) {
          const date = new Date(weekStartDate);
          date.setDate(weekStartDate.getDate() + i);
          const dateStr = formatDateForApi(date);
          const assignment = (week.assignments ?? []).find(
            (a) =>
              a.employeeId === emp.id && normalizeDateString(a.shiftDate) === dateStr
          );
          const c = sheet.getCell(currentRow, i + 3);
          c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
          c.border = thinBorder;
          if (assignment) {
            const display = getAssignmentDisplay(assignment, types);
            let val = display?.label ?? '';
            if (assignment.programName && display?.label !== assignment.programName) {
              val += `\n${assignment.programName}`;
            }
            c.value = val;
            const fill = fillRgbForAssignment(assignment, types);
            if (fill) {
              c.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: rgbToArgb(fill) },
              };
            } else if (assignment.isOffDay) {
              c.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFF3F4F6' },
              };
            }
          }
        }
        currentRow += 1;
      });
      const unitEnd = currentRow - 1;
      if (unitEnd >= unitStart) {
        sheet.mergeCells(unitStart, 1, unitEnd, 1);
      }
    } else {
      const blockStart = currentRow;
      group.employees.forEach((emp) => {
        sheet.getCell(currentRow, 1).value = department.name;
        sheet.getCell(currentRow, 1).alignment = {
          horizontal: 'center',
          vertical: 'middle',
          wrapText: true,
        };
        sheet.getCell(currentRow, 1).border = thinBorder;

        sheet.getCell(currentRow, 2).value = emp.name;
        sheet.getCell(currentRow, 2).alignment = {
          horizontal: 'center',
          vertical: 'middle',
          wrapText: true,
        };
        sheet.getCell(currentRow, 2).border = thinBorder;

        for (let i = 0; i < 7; i++) {
          const date = new Date(weekStartDate);
          date.setDate(weekStartDate.getDate() + i);
          const dateStr = formatDateForApi(date);
          const assignment = (week.assignments ?? []).find(
            (a) =>
              a.employeeId === emp.id && normalizeDateString(a.shiftDate) === dateStr
          );
          const c = sheet.getCell(currentRow, i + 3);
          c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
          c.border = thinBorder;
          if (assignment) {
            const display = getAssignmentDisplay(assignment, types);
            let val = display?.label ?? '';
            if (assignment.programName && display?.label !== assignment.programName) {
              val += `\n${assignment.programName}`;
            }
            c.value = val;
            const fill = fillRgbForAssignment(assignment, types);
            if (fill) {
              c.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: rgbToArgb(fill) },
              };
            } else if (assignment.isOffDay) {
              c.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFF3F4F6' },
              };
            }
          }
        }
        currentRow += 1;
      });
      const blockEnd = currentRow - 1;
      if (blockEnd >= blockStart) {
        sheet.mergeCells(blockStart, 1, blockEnd, 1);
      }
    }
  });

  sheet.columns = [
    { width: 18 },
    { width: 28 },
    { width: 16 },
    { width: 16 },
    { width: 16 },
    { width: 16 },
    { width: 16 },
    { width: 16 },
    { width: 16 },
  ];

  const legendStart = currentRow + 2;
  const legendTitle = sheet.getCell(legendStart, 1);
  legendTitle.value = 'Shift type legend';
  legendTitle.font = { bold: true, size: 12 };
  sheet.mergeCells(legendStart, 1, legendStart, 3);

  let lr = legendStart + 1;
  const sortedTypes = [...types]
    .filter((s) => s.isActive)
    .sort((a, b) => a.displayOrder - b.displayOrder || a.label.localeCompare(b.label));

  sortedTypes.forEach((st) => {
    const cell = sheet.getCell(lr, 1);
    const timing = formatShiftTiming(st.startTime, st.endTime);
    cell.value = `${st.label}${timing ? ` (${timing})` : ''}`;
    cell.font = { size: 11 };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: hexToArgb(st.color) },
    };
    cell.border = thinBorder;
    sheet.mergeCells(lr, 1, lr, lastCol);
    lr += 1;
  });

  const buf = await workbook.xlsx.writeBuffer();
  const safeName = department.name.replace(/\s+/g, '_');
  const safeDate = weekStartStr.replace(/\s+/g, '_');
  const blob = new Blob([buf], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${safeName}_Rota_${safeDate}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}
