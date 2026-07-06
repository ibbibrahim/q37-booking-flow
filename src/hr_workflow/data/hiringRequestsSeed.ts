import type { HiringRequest, HiringRequestStage } from '../types/hr';
import { createSeededRandom } from '../utils/hrUtils';
import { departments } from './departments';
import { internationalFirstNames, internationalLastNames, jobTitlesByDepartment } from './nameData';

const random = createSeededRandom(4242);

function pick<T>(arr: T[]): T {
  return arr[Math.floor(random() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(random() * (max - min + 1)) + min;
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function randomPastDate(minDaysAgo: number, maxDaysAgo: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - randomInt(minDaysAgo, maxDaysAgo));
  return d;
}

const departmentHeads = [
  'Fahad Al-Sulaiti (Head of News)',
  'Mona Haddad (Head of Production)',
  'Rashid Al-Kaabi (Head of Engineering)',
  'Sarah Fernandes (Head of Graphics)',
  'Omar Khoury (Studio Operations Manager)',
  'Layla Al-Naimi (Marketing Director)',
  'Peter Smith (IT Manager)',
  'Aisha Al-Marri (Finance Manager)',
];

const stageDistribution: HiringRequestStage[] = [
  'Department Head',
  'Elina Review',
  'Elina Review',
  'GM Approval',
  'QMC HR',
  'CEO Approval',
  'Completed',
  'Completed',
  'Completed',
  'Returned to Department',
];

function stageStatus(stage: HiringRequestStage): HiringRequest['status'] {
  if (stage === 'Completed') return 'Approved';
  if (stage === 'Returned to Department') return 'Returned';
  return 'In Progress';
}

function buildComments(stage: HiringRequestStage, initiatedBy: string): HiringRequest['comments'] {
  const comments: HiringRequest['comments'] = [
    {
      id: 'c1',
      by: initiatedBy,
      date: isoDate(randomPastDate(10, 40)),
      text: 'Hiring request submitted with candidate details and letter template attached.',
    },
  ];

  const stageOrder: HiringRequestStage[] = [
    'Department Head', 'Elina Review', 'GM Approval', 'QMC HR', 'CEO Approval', 'Completed',
  ];
  const idx = stageOrder.indexOf(stage);

  if (stage === 'Returned to Department') {
    comments.push({
      id: 'c2',
      by: 'Elina (HR Coordinator)',
      date: isoDate(randomPastDate(5, 9)),
      text: 'Missing no-objection certificate for the candidate. Please attach and resubmit.',
    });
    return comments;
  }

  if (idx >= 1) {
    comments.push({
      id: 'c2',
      by: 'Elina (HR Coordinator)',
      date: isoDate(randomPastDate(6, 9)),
      text: 'Reviewed and forwarded to GM for approval.',
    });
  }
  if (idx >= 2) {
    comments.push({
      id: 'c3',
      by: 'General Manager',
      date: isoDate(randomPastDate(4, 6)),
      text: 'Approved. Forwarding to QMC HR for record and CEO sign-off.',
    });
  }
  if (idx >= 3) {
    comments.push({
      id: 'c4',
      by: 'QMC HR',
      date: isoDate(randomPastDate(2, 4)),
      text: 'Documentation verified. Awaiting CEO approval.',
    });
  }
  if (idx >= 4) {
    comments.push({
      id: 'c5',
      by: 'CEO Office',
      date: isoDate(randomPastDate(1, 2)),
      text: 'Approved.',
    });
  }
  if (idx >= 5) {
    comments.push({
      id: 'c6',
      by: 'Elina (HR Coordinator)',
      date: isoDate(randomPastDate(0, 1)),
      text: 'Status updated and candidate notified. Onboarding scheduled.',
    });
  }

  return comments;
}

function generateHiringRequests(): HiringRequest[] {
  const list: HiringRequest[] = [];
  const count = 22;

  for (let i = 1; i <= count; i++) {
    const department = pick(departments);
    const jobTitle = pick(jobTitlesByDepartment[department.id]);
    const first = pick(internationalFirstNames);
    const last = pick(internationalLastNames);
    const stage = pick(stageDistribution);
    const initiatedBy = pick(departmentHeads);

    list.push({
      id: i,
      requestNumber: `HR-2026-${String(i).padStart(4, '0')}`,
      departmentId: department.id,
      initiatedBy,
      candidateName: `${first} ${last}`,
      jobTitle,
      qidStatus: random() < 0.55 ? 'Has QID' : 'No Obligation Letter',
      isInternal: random() < 0.2,
      duration: pick(['6 months', '12 months', '12 months (renewable)', '3 months', 'Permanent']),
      createdDate: isoDate(randomPastDate(10, 45)),
      stage,
      status: stageStatus(stage),
      comments: buildComments(stage, initiatedBy),
    });
  }

  return list.sort((a, b) => new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime());
}

export const hiringRequests: HiringRequest[] = generateHiringRequests();
