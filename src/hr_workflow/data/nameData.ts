export const qatariFirstNames = [
  'Ahmed', 'Mohammed', 'Khalid', 'Abdullah', 'Rashid', 'Hamad', 'Jassim', 'Nasser',
  'Fahad', 'Saoud', 'Sara', 'Fatima', 'Maryam', 'Noor', 'Aisha', 'Reem', 'Alanoud', 'Shaikha',
];

export const qatariLastNames = [
  'Al-Kuwari', 'Al-Marri', 'Al-Kaabi', 'Al-Sulaiti', 'Al-Emadi', 'Al-Naimi',
  'Al-Mannai', 'Al-Attiyah', 'Al-Hajri', 'Al-Mohannadi',
];

export const internationalFirstNames = [
  'David', 'James', 'Michael', 'John', 'Robert', 'Daniel', 'Peter', 'Mark',
  'Priya', 'Anjali', 'Rahul', 'Amit', 'Sandeep', 'Vikram',
  'Maria', 'Anna', 'Sofia', 'Elena', 'Carlos', 'Juan',
  'Ahmed', 'Youssef', 'Karim', 'Omar', 'Hassan', 'Tariq', 'Bilal',
  'Grace', 'Angel', 'Mary Joy', 'Cherry', 'Rowena',
];

export const internationalLastNames = [
  'Fernandes', 'Silva', 'Cruz', 'Santos', 'Reyes', 'Gomez',
  'Sharma', 'Patel', 'Kumar', 'Nair', 'Iyer',
  'Smiths', 'Johnson', 'Williams', 'Brown', 'Taylor',
  'Haddad', 'Khoury', 'Mansour', 'Saleh', 'Rahman',
  'Dupont', 'Botha', 'Van der Merwe',
];

export const nationalities = [
  { name: 'Qatari', ar: 'قطري', weight: 18 },
  { name: 'Egyptian', ar: 'مصري', weight: 12 },
  { name: 'Indian', ar: 'هندي', weight: 12 },
  { name: 'Filipino', ar: 'فلبيني', weight: 10 },
  { name: 'Jordanian', ar: 'أردني', weight: 8 },
  { name: 'Lebanese', ar: 'لبناني', weight: 6 },
  { name: 'Pakistani', ar: 'باكستاني', weight: 6 },
  { name: 'Sudanese', ar: 'سوداني', weight: 5 },
  { name: 'Syrian', ar: 'سوري', weight: 5 },
  { name: 'Tunisian', ar: 'تونسي', weight: 4 },
  { name: 'Moroccan', ar: 'مغربي', weight: 4 },
  { name: 'British', ar: 'بريطاني', weight: 3 },
  { name: 'South African', ar: 'جنوب أفريقي', weight: 3 },
  { name: 'French', ar: 'فرنسي', weight: 2 },
  { name: 'American', ar: 'أمريكي', weight: 2 },
  { name: 'Algerian', ar: 'جزائري', weight: 2 },
  { name: 'Ethiopian', ar: 'إثيوبي', weight: 2 },
  { name: 'Iranian', ar: 'إيراني', weight: 2 },
  { name: 'Iraqi', ar: 'عراقي', weight: 2 },
  { name: 'Italian', ar: 'إيطالي', weight: 1 },
  { name: 'Palestinian', ar: 'فلسطيني', weight: 2 },
  { name: 'Somali', ar: 'صومالي', weight: 1 },
  { name: 'Turkish', ar: 'تركي', weight: 1 },
  { name: 'Yemeni', ar: 'يمني', weight: 1 },
  { name: 'Saint Kitts and Nevis', ar: 'سانت كيتس ونيفيس', weight: 1 },
];

export const jobTitlesByDepartment: Record<number, string[]> = {
  1: ['News Anchor', 'News Producer', 'Field Reporter', 'News Editor', 'Assignment Editor'],
  2: ['Producer', 'Assistant Producer', 'Camera Operator', 'Director', 'Production Coordinator', 'Runner'],
  3: ['Broadcast Engineer', 'Transmission Engineer', 'Maintenance Engineer', 'RF Engineer'],
  4: ['IT Support Specialist', 'Network Engineer', 'Systems Administrator', 'IT Manager'],
  5: ['Graphic Designer', 'Video Editor', 'Motion Graphics Artist', 'Colorist', 'Post Production Supervisor'],
  6: ['Studio Manager', 'Lighting Technician', 'Sound Engineer', 'Vision Mixer', 'Floor Manager'],
  7: ['Marketing Executive', 'Sales Manager', 'Account Manager', 'Digital Marketing Specialist'],
  8: ['Accountant', 'Finance Officer', 'Payroll Specialist', 'Finance Manager'],
  9: ['HR Officer', 'HR Coordinator', 'Recruitment Specialist', 'HR Manager'],
  10: ['Store Keeper', 'Inventory Officer', 'Technical Store Supervisor'],
  11: ['Legal Advisor', 'Compliance Officer'],
  12: ['Administrative Assistant', 'Office Manager', 'Receptionist', 'Driver'],
};

/** Arabic form of a stored nationality for the contract's Arabic side. The
 * employee record can hold either the demonym ("Pakistani") or the raw
 * QID-scanned country name ("Pakistan") — see EmployeeFormPage's scan
 * fallback — so match either, using the same shared-prefix heuristic.
 * Falls back to the original value rather than leaving the blank empty. */
export function nationalityAr(value: string | null | undefined): string | null | undefined {
  const v = value?.trim().toLowerCase();
  if (!v) return value;
  const match =
    nationalities.find((n) => n.name.toLowerCase() === v) ??
    (v.length >= 4
      ? nationalities.find((n) => n.name.toLowerCase().startsWith(v.slice(0, Math.min(v.length, 5))))
      : undefined);
  return match?.ar ?? value;
}

export function weightedNationality(random: () => number): string {
  const total = nationalities.reduce((s, n) => s + n.weight, 0);
  let r = random() * total;
  for (const n of nationalities) {
    r -= n.weight;
    if (r <= 0) return n.name;
  }
  return nationalities[0].name;
}
