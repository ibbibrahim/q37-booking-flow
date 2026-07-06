import type { ContractType, Employee, EmployeeStatus, EmploymentHistoryEntry } from '../types/hr';
import { createSeededRandom } from '../utils/hrUtils';
import { departments } from './departments';
import {
  internationalFirstNames,
  internationalLastNames,
  jobTitlesByDepartment,
  qatariFirstNames,
  qatariLastNames,
  weightedNationality,
} from './nameData';

const random = createSeededRandom(1337);

function pick<T>(arr: T[]): T {
  return arr[Math.floor(random() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(random() * (max - min + 1)) + min;
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function dateWithAge(age: number, dayOffset = 0): Date {
  const d = new Date();
  d.setFullYear(d.getFullYear() - age);
  d.setDate(d.getDate() - dayOffset);
  return d;
}

function randomPastDate(minDaysAgo: number, maxDaysAgo: number): Date {
  const days = randomInt(minDaysAgo, maxDaysAgo);
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

function randomFutureDate(minDaysAhead: number, maxDaysAhead: number): Date {
  const days = randomInt(minDaysAhead, maxDaysAhead);
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

function randomQid(): string {
  let digits = '2';
  for (let i = 0; i < 10; i++) digits += randomInt(0, 9);
  return digits;
}

function randomMobile(): string {
  const prefix = pick(['33', '55', '50', '66', '70', '77']);
  const rest = String(randomInt(100000, 999999));
  return `+974 ${prefix}${rest.slice(0, 2)} ${rest.slice(2)}`;
}

const rewardsPool = [
  'Employee of the Month',
  'Performance Excellence Bonus',
  'Long Service Recognition',
  'Outstanding Project Award',
  '',
  '',
  '',
];

const TOTAL_EMPLOYEES = 108;

function buildBaseEmployee(id: number): Employee {
  const nationality = weightedNationality(random);
  const isQatari = nationality === 'Qatari';
  const first = isQatari ? pick(qatariFirstNames) : pick(internationalFirstNames);
  const last = isQatari ? pick(qatariLastNames) : pick(internationalLastNames);
  const fullName = `${first} ${last}`;

  const department = pick(departments);
  const jobTitle = pick(jobTitlesByDepartment[department.id]);

  const age = randomInt(23, 58);
  const dob = dateWithAge(age, randomInt(0, 364));

  const maxTenureYears = Math.min(9, age - 21);
  const tenureYears = randomInt(0, Math.max(0, maxTenureYears));
  const joinDate = randomPastDate(tenureYears * 365 + randomInt(0, 300), tenureYears * 365 + randomInt(300, 365));

  const contractType: ContractType = random() < 0.42 ? 'Freelance' : 'Permanent';

  const statusRoll = random();
  let status: EmployeeStatus = 'Active';
  if (statusRoll > 0.97) status = 'End of Service';
  else if (statusRoll > 0.94) status = 'Retired';

  const qidExpiryRoll = random();
  let qidExpiry: Date;
  if (qidExpiryRoll < 0.05) {
    qidExpiry = randomPastDate(1, 45); // already expired
  } else if (qidExpiryRoll < 0.15) {
    qidExpiry = randomFutureDate(1, 60); // expiring soon
  } else {
    qidExpiry = randomFutureDate(60, 900);
  }

  const emailSlug = `${first}.${last}`.toLowerCase().replace(/[^a-z.]/g, '');
  const monthlyRate = contractType === 'Freelance' ? randomInt(35, 110) * 100 : 0;

  const history: EmploymentHistoryEntry[] = [
    {
      id: `${id}-h1`,
      date: isoDate(joinDate),
      fromType: null,
      toType: contractType,
      reason: 'Initial hire',
      note: `Joined ${department.name} as ${contractType}`,
    },
  ];

  return {
    id,
    fullName,
    jobNumber: `QBC-${String(id).padStart(4, '0')}`,
    jobTitle,
    departmentId: department.id,
    joinDate: isoDate(joinDate),
    contractType,
    reward: random() < 0.25 ? pick(rewardsPool) : '',
    qid: randomQid(),
    qidExpiry: isoDate(qidExpiry),
    nationality,
    isQatari,
    mobileNumber: randomMobile(),
    emailPersonal: `${emailSlug}${randomInt(1, 98)}@gmail.com`,
    emailWork: `${emailSlug}@qbc.qa`,
    status,
    dob: isoDate(dob),
    onLeave: contractType === 'Freelance' && status === 'Active' && random() < 0.14,
    monthlyRate,
    recentlyConvertedToPermanent: false,
    employmentHistory: history,
  };
}

function generateEmployees(): Employee[] {
  const list: Employee[] = [];
  for (let i = 1; i <= TOTAL_EMPLOYEES; i++) {
    list.push(buildBaseEmployee(i));
  }

  // Freelance -> Permanent conversions in the last ~90 days (yellow badge in Employee Records).
  const permanentCandidates = list.filter(
    (e) => e.contractType === 'Permanent' && e.status === 'Active' && new Date(e.joinDate) < new Date(Date.now() - 200 * 86400000)
  );
  for (let i = 0; i < 9 && i < permanentCandidates.length; i++) {
    const emp = permanentCandidates[randomInt(0, permanentCandidates.length - 1)];
    if (emp.recentlyConvertedToPermanent) continue;
    emp.recentlyConvertedToPermanent = true;
    emp.employmentHistory[0].toType = 'Freelance';
    emp.employmentHistory[0].note = `Joined ${emp.jobTitle} as Freelance`;
    const conversionDate = randomPastDate(5, 85);
    emp.employmentHistory.push({
      id: `${emp.id}-h2`,
      date: isoDate(conversionDate),
      fromType: 'Freelance',
      toType: 'Permanent',
      reason: 'Freelance to Permanent conversion',
      note: 'Converted to Permanent contract after performance review',
    });
  }

  // Force a handful of Freelance employees to be 60+ (compliance highlight requirement).
  const freelancers = list.filter((e) => e.contractType === 'Freelance' && !e.recentlyConvertedToPermanent);
  const seniorCount = Math.min(6, freelancers.length);
  const usedIds = new Set<number>();
  for (let i = 0; i < seniorCount; i++) {
    let emp = freelancers[randomInt(0, freelancers.length - 1)];
    let guard = 0;
    while (usedIds.has(emp.id) && guard < 20) {
      emp = freelancers[randomInt(0, freelancers.length - 1)];
      guard++;
    }
    usedIds.add(emp.id);

    const age = randomInt(60, 66);
    const dob = dateWithAge(age, randomInt(0, 200));
    emp.dob = isoDate(dob);

    const sixtyBirthday = dateWithAge(0, 0);
    sixtyBirthday.setFullYear(new Date(dob).getFullYear() + 60);
    const conversionDate = sixtyBirthday < new Date() ? sixtyBirthday : randomPastDate(30, 400);

    emp.employmentHistory = [
      {
        id: `${emp.id}-h1`,
        date: emp.joinDate,
        fromType: null,
        toType: 'Permanent',
        reason: 'Initial hire',
        note: `Joined as Permanent`,
      },
      {
        id: `${emp.id}-h2`,
        date: isoDate(conversionDate),
        fromType: 'Permanent',
        toType: 'Freelance',
        reason: 'Age 60 policy conversion',
        note: 'Converted to Freelance contract at age 60 per company policy',
      },
    ];
  }

  return list;
}

export const employees: Employee[] = generateEmployees();
