import type { LeaveRequest, LeaveRequestStatus } from '../types/hr';
import { createSeededRandom } from '../utils/hrUtils';
import { employees } from './employeesSeed';

const random = createSeededRandom(9001);

function pick<T>(arr: T[]): T {
  return arr[Math.floor(random() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(random() * (max - min + 1)) + min;
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function daysBetween(start: string, end: string): number {
  const ms = new Date(end).getTime() - new Date(start).getTime();
  return Math.max(1, Math.round(ms / 86400000) + 1);
}

const reasons = ['Annual Leave', 'Sick Leave', 'Emergency Leave', 'Personal Leave', 'Bereavement Leave', 'Travel Leave'];

function generateLeaveRequests(): LeaveRequest[] {
  const list: LeaveRequest[] = [];
  let id = 1;

  const freelancers = employees.filter((e) => e.contractType === 'Freelance');

  // Active leave for employees currently flagged onLeave.
  for (const emp of freelancers.filter((e) => e.onLeave)) {
    const start = new Date();
    start.setDate(start.getDate() - randomInt(0, 4));
    const end = new Date();
    end.setDate(end.getDate() + randomInt(1, 10));

    const statusRoll = random();
    const status: LeaveRequestStatus =
      statusRoll < 0.5 ? 'Approved' : statusRoll < 0.8 ? 'Pending Elina' : 'Pending Department';

    list.push({
      id: id++,
      employeeId: emp.id,
      employeeName: emp.fullName,
      departmentId: emp.departmentId,
      jobTitle: emp.jobTitle,
      startDate: isoDate(start),
      endDate: isoDate(end),
      daysCount: daysBetween(isoDate(start), isoDate(end)),
      reason: pick(reasons),
      status,
      requestedAt: isoDate(new Date(start.getTime() - randomInt(2, 10) * 86400000)),
      departmentApproved: status === 'Approved' || status === 'Pending Elina',
      elinaApproved: status === 'Approved',
      notifiedByEmail: status !== 'Pending Department',
      notifiedByPortal: status !== 'Pending Department',
      payrollNoted: status === 'Approved',
    });
  }

  // Historical requests for variety / reporting depth.
  const historicalCount = 26;
  for (let i = 0; i < historicalCount; i++) {
    const emp = pick(freelancers);
    const start = new Date();
    start.setDate(start.getDate() - randomInt(15, 220));
    const end = new Date(start);
    end.setDate(end.getDate() + randomInt(1, 8));

    const outcomeRoll = random();
    const status: LeaveRequestStatus = outcomeRoll < 0.85 ? 'Approved' : 'Rejected';

    list.push({
      id: id++,
      employeeId: emp.id,
      employeeName: emp.fullName,
      departmentId: emp.departmentId,
      jobTitle: emp.jobTitle,
      startDate: isoDate(start),
      endDate: isoDate(end),
      daysCount: daysBetween(isoDate(start), isoDate(end)),
      reason: pick(reasons),
      status,
      requestedAt: isoDate(new Date(start.getTime() - randomInt(2, 10) * 86400000)),
      departmentApproved: status === 'Approved',
      elinaApproved: status === 'Approved',
      notifiedByEmail: true,
      notifiedByPortal: true,
      payrollNoted: status === 'Approved',
    });
  }

  return list.sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime());
}

export const leaveRequests: LeaveRequest[] = generateLeaveRequests();
