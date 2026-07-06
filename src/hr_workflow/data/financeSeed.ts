import type { FinanceMonthEntry } from '../types/hr';
import { createSeededRandom } from '../utils/hrUtils';
import { departments } from './departments';
import { employees } from './employeesSeed';

const random = createSeededRandom(7777);

function monthLabel(monthsAgo: number): string {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - monthsAgo);
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

function generateFinanceData(): FinanceMonthEntry[] {
  const entries: FinanceMonthEntry[] = [];

  const baseSpendByDept = departments.map((dept) => {
    const deptFreelancers = employees.filter(
      (e) => e.departmentId === dept.id && e.contractType === 'Freelance' && e.status === 'Active'
    );
    const total = deptFreelancers.reduce((sum, e) => sum + e.monthlyRate, 0);
    return { departmentId: dept.id, base: total };
  });

  for (let monthsAgo = 5; monthsAgo >= 0; monthsAgo--) {
    const label = monthLabel(monthsAgo);
    for (const { departmentId, base } of baseSpendByDept) {
      const variance = 0.85 + random() * 0.3;
      entries.push({
        month: label,
        departmentId,
        freelanceSpend: Math.round((base * variance) / 100) * 100,
      });
    }
  }

  return entries;
}

export const financeData: FinanceMonthEntry[] = generateFinanceData();

export function monthOptions(): string[] {
  const seen = new Set<string>();
  const months: string[] = [];
  for (const e of financeData) {
    if (!seen.has(e.month)) {
      seen.add(e.month);
      months.push(e.month);
    }
  }
  return months;
}
