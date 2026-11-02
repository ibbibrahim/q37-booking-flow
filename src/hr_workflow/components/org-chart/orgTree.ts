import type { HrDepartment, HrEmployee, HrDepartmentHead } from '../../types/hrApi';

export type OrgNodeKind = 'root' | 'department' | 'section';

export interface OrgHeadcount {
  permanent: number;
  freelance: number;
  total: number;
}

export interface OrgNode {
  id: string; // 'root' | `dept-${id}` | `sec-${id}`
  kind: OrgNodeKind;
  nameEn: string;
  nameAr: string;
  icon: string | null; // lucide icon name from the DB; null for root
  departmentId: number | null;
  sectionId: number | null;
  headName: string | null; // departments only
  headcount: OrgHeadcount; // active employees only; dept total includes section-less staff
  children: OrgNode[]; // dept -> sections; root -> [] (layout uses OrgTree fields)
}

export interface OrgTree {
  root: OrgNode;
  staffOffices: OrgNode[];
  lineDepartments: OrgNode[];
}

function emptyHeadcount(): OrgHeadcount {
  return { permanent: 0, freelance: 0, total: 0 };
}

// One pass over employees so each node's headcount is a Map lookup, not a filter.
function countBy(
  employees: HrEmployee[],
  key: (e: HrEmployee) => number | null,
): Map<number, OrgHeadcount> {
  const map = new Map<number, OrgHeadcount>();
  for (const e of employees) {
    const k = key(e);
    if (k == null) continue;
    let c = map.get(k);
    if (!c) {
      c = emptyHeadcount();
      map.set(k, c);
    }
    if (e.contractType === 'Permanent') c.permanent += 1;
    else if (e.contractType === 'Freelance') c.freelance += 1;
    c.total += 1;
  }
  return map;
}

export function buildOrgTree(
  departments: HrDepartment[],
  activeEmployees: HrEmployee[],
  heads: HrDepartmentHead[],
): OrgTree {
  const byDept = countBy(activeEmployees, (e) => e.departmentId);
  const bySection = countBy(activeEmployees, (e) => e.sectionId);

  const root: OrgNode = {
    id: 'root',
    kind: 'root',
    nameEn: 'General Manager',
    nameAr: 'المدير العام',
    icon: null,
    departmentId: null,
    sectionId: null,
    headName: null,
    headcount: {
      permanent: activeEmployees.filter((e) => e.contractType === 'Permanent').length,
      freelance: activeEmployees.filter((e) => e.contractType === 'Freelance').length,
      total: activeEmployees.length,
    },
    children: [],
  };

  const deptNodes = [...departments]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map<OrgNode>((d) => ({
      id: `dept-${d.id}`,
      kind: 'department',
      nameEn: d.nameEn,
      nameAr: d.nameAr,
      icon: d.icon,
      departmentId: d.id,
      sectionId: null,
      headName: heads.find((h) => h.departmentId === d.id)?.userDisplayName ?? null,
      headcount: byDept.get(d.id) ?? emptyHeadcount(),
      children: [...d.sections]
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map<OrgNode>((s) => ({
          id: `sec-${s.id}`,
          kind: 'section',
          nameEn: s.nameEn,
          nameAr: s.nameAr,
          icon: s.icon,
          departmentId: d.id,
          sectionId: s.id,
          headName: null,
          headcount: bySection.get(s.id) ?? emptyHeadcount(),
          children: [],
        })),
    }));

  // The split comes from hr_departments.unit_type ('GmOffice' = reports directly to the GM).
  const gmOfficeIds = new Set(departments.filter((d) => d.unitType === 'GmOffice').map((d) => d.id));

  return {
    root,
    staffOffices: deptNodes.filter((n) => gmOfficeIds.has(n.departmentId as number)),
    lineDepartments: deptNodes.filter((n) => !gmOfficeIds.has(n.departmentId as number)),
  };
}

export function employeesForNode(node: OrgNode, activeEmployees: HrEmployee[]): HrEmployee[] {
  const list =
    node.kind === 'root'
      ? [...activeEmployees]
      : node.kind === 'department'
        ? activeEmployees.filter((e) => e.departmentId === node.departmentId)
        : activeEmployees.filter((e) => e.sectionId === node.sectionId);
  return list.sort((a, b) => a.fullNameEn.localeCompare(b.fullNameEn));
}

export function nodeMatches(node: OrgNode, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return false;
  return node.nameEn.toLowerCase().includes(q) || node.nameAr.toLowerCase().includes(q);
}
