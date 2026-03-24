import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import type { RotaWeek, RotaDepartment, RotaEmployee, RotaAssignment, RotaShiftType } from '../types/rota';
import { formatDateForApi, parseLocalDate, normalizeDateString } from './dateUtils';
import { getAssignmentDisplay } from './rotaUtils';

/** Format date for display, e.g. "22 Mar 2026" */
const formatDateDisplay = (date: Date | string): string => {
  const d = typeof date === 'string' ? parseLocalDate(date) : new Date(date);
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

function hexToRgb(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Light background tint from shift hex color (for PDF fill) */
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
  const st = assignment.shiftType ??
    (assignment.shiftTypeId != null && shiftTypes?.length
      ? shiftTypes.find((s) => s.id === assignment.shiftTypeId)
      : undefined);
  if (st?.color) return lightenFillFromHex(st.color);
  return null;
}

/** Get cell text for an assignment (uses getAssignmentDisplay for consistent labels) */
const getCellText = (assignment: RotaAssignment, shiftTypes?: RotaShiftType[]): string => {
  const display = getAssignmentDisplay(assignment, shiftTypes);
  if (!display) return '';
  let text = display.label;
  if (assignment.programName && display.label !== assignment.programName) {
    text += `\n${assignment.programName}`;
  }
  return text;
};

export const exportRotaToPDF = (
  week: RotaWeek,
  department: RotaDepartment,
  employees: RotaEmployee[],
  shiftTypes?: RotaShiftType[]
): void => {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  const weekStartDate = parseLocalDate(week.weekStartDate);
  const weekEndDate = new Date(weekStartDate);
  weekEndDate.setDate(weekStartDate.getDate() + 6);

  const weekStartStr = formatDateDisplay(weekStartDate);
  const weekEndStr = formatDateDisplay(weekEndDate);

  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text(`${department.name} Rota`, 148, 20, { align: 'center' });

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(`${weekStartStr} - ${weekEndStr}`, 148, 28, { align: 'center' });

  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const headers = ['Employee', ...days];

  const groupedEmployees = department.hasSubDepartments
    ? (() => {
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
          employees: emps.sort((a, b) => a.name.localeCompare(b.name)),
        }));
      })()
    : [{ departmentName: null as string | null, employees: [...employees].sort((a, b) => a.name.localeCompare(b.name)) }];

  const rows: (string | { content: string; colSpan: number; styles?: Record<string, unknown> })[][] = [];
  /** Parallel to `rows`: per-body-row fill colors for columns 1–7 (index aligns with `rows` body indices). */
  const rowFills: (([number, number, number] | null)[] | null)[] = [];

  groupedEmployees.forEach((group) => {
    if (group.departmentName) {
      rows.push([
        {
          content: group.departmentName,
          colSpan: 8,
          styles: { fillColor: [220, 220, 220], fontStyle: 'bold', halign: 'left' },
        },
      ]);
      rowFills.push(null);
    }

    group.employees.forEach((emp) => {
      const row: string[] = [emp.name];
      const fills: ([number, number, number] | null)[] = [
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
      ];

      for (let i = 0; i < 7; i++) {
        const date = new Date(weekStartDate);
        date.setDate(weekStartDate.getDate() + i);
        const dateStr = formatDateForApi(date);

        const assignment = (week.assignments ?? []).find(
          (a) =>
            a.employeeId === emp.id &&
            normalizeDateString(a.shiftDate) === dateStr
        );

        if (assignment) {
          row.push(getCellText(assignment, shiftTypes));
          fills[i + 1] = fillRgbForAssignment(assignment, shiftTypes);
        } else {
          row.push('');
        }
      }

      rows.push(row);
      rowFills.push(fills);
    });
  });

  autoTable(doc, {
    head: [headers],
    body: rows,
    startY: 35,
    theme: 'grid',
    headStyles: {
      fillColor: [59, 130, 246],
      textColor: 255,
      fontStyle: 'bold',
      halign: 'center',
    },
    bodyStyles: {
      fontSize: 9,
      cellPadding: 3,
      halign: 'center',
      valign: 'middle',
    },
    columnStyles: {
      0: { halign: 'left', fontStyle: 'bold', cellWidth: 40 },
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index > 0) {
        const rf = rowFills[data.row.index];
        if (rf?.[data.column.index]) {
          data.cell.styles.fillColor = rf[data.column.index] as unknown as number[];
        }
      }
    },
  });

  const finalY =
    (doc as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable
      ?.finalY ?? 100;

  doc.setFontSize(8);
  doc.setTextColor(128);
  doc.text(
    `Generated on ${new Date().toLocaleString()}`,
    148,
    finalY + 12,
    { align: 'center' }
  );

  const safeName = department.name.replace(/\s+/g, '_');
  const safeDate = weekStartStr.replace(/\s+/g, '_');
  doc.save(`${safeName}_Rota_${safeDate}.pdf`);
};

export const exportRotaToExcel = (
  week: RotaWeek,
  department: RotaDepartment,
  employees: RotaEmployee[],
  shiftTypes?: RotaShiftType[]
): void => {
  const weekStartDate = parseLocalDate(week.weekStartDate);
  const weekEndDate = new Date(weekStartDate);
  weekEndDate.setDate(weekStartDate.getDate() + 6);

  const weekStartStr = formatDateDisplay(weekStartDate);
  const weekEndStr = formatDateDisplay(weekEndDate);

  const data: (string | number)[][] = [];

  data.push([`${department.name} Rota`]);
  data.push([`${weekStartStr} - ${weekEndStr}`]);
  data.push([]);

  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  data.push(['Employee', ...days]);

  const groupedEmployees = department.hasSubDepartments
    ? (() => {
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
          employees: emps.sort((a, b) => a.name.localeCompare(b.name)),
        }));
      })()
    : [{ departmentName: null as string | null, employees: [...employees].sort((a, b) => a.name.localeCompare(b.name)) }];

  groupedEmployees.forEach((group) => {
    if (group.departmentName) {
      data.push([group.departmentName, '', '', '', '', '', '', '', '']);
    }

    group.employees.forEach((emp) => {
      const row: string[] = [emp.name];

      for (let i = 0; i < 7; i++) {
        const date = new Date(weekStartDate);
        date.setDate(weekStartDate.getDate() + i);
        const dateStr = formatDateForApi(date);

        const assignment = (week.assignments ?? []).find(
          (a) =>
            a.employeeId === emp.id &&
            normalizeDateString(a.shiftDate) === dateStr
        );

        let cellValue = '';
        if (assignment) {
          const display = getAssignmentDisplay(assignment, shiftTypes);
          cellValue = display?.label ?? '';
          if (assignment.programName && display?.label !== assignment.programName) {
            cellValue += ` - ${assignment.programName}`;
          }
        }

        row.push(cellValue);
      }

      data.push(row);
    });
  });

  const ws = XLSX.utils.aoa_to_sheet(data);

  ws['!cols'] = [
    { wch: 20 },
    { wch: 15 },
    { wch: 15 },
    { wch: 15 },
    { wch: 15 },
    { wch: 15 },
    { wch: 15 },
    { wch: 15 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Rota');

  const safeName = department.name.replace(/\s+/g, '_');
  const safeDate = weekStartStr.replace(/\s+/g, '_');
  XLSX.writeFile(wb, `${safeName}_Rota_${safeDate}.xlsx`);
};
