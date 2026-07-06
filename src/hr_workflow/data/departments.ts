import type { Department } from '../types/hr';

export const departments: Department[] = [
  { id: 1, name: 'News' },
  { id: 2, name: 'Production' },
  { id: 3, name: 'Broadcast Engineering' },
  { id: 4, name: 'IT' },
  { id: 5, name: 'Graphics & Post Production' },
  { id: 6, name: 'Studio Operations' },
  { id: 7, name: 'Marketing & Sales' },
  { id: 8, name: 'Finance' },
  { id: 9, name: 'Human Resources' },
  { id: 10, name: 'Technical Store' },
  { id: 11, name: 'Legal & Compliance' },
  { id: 12, name: 'Administration' },
];

export function departmentName(id: number): string {
  return departments.find((d) => d.id === id)?.name ?? 'Unknown';
}
