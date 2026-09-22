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
  { name: 'Qatari', weight: 18 },
  { name: 'Egyptian', weight: 12 },
  { name: 'Indian', weight: 12 },
  { name: 'Filipino', weight: 10 },
  { name: 'Jordanian', weight: 8 },
  { name: 'Lebanese', weight: 6 },
  { name: 'Pakistani', weight: 6 },
  { name: 'Sudanese', weight: 5 },
  { name: 'Syrian', weight: 5 },
  { name: 'Tunisian', weight: 4 },
  { name: 'Moroccan', weight: 4 },
  { name: 'British', weight: 3 },
  { name: 'South African', weight: 3 },
  { name: 'French', weight: 2 },
  { name: 'American', weight: 2 },
  { name: 'Algerian', weight: 2 },
  { name: 'Ethiopian', weight: 2 },
  { name: 'Iranian', weight: 2 },
  { name: 'Iraqi', weight: 2 },
  { name: 'Italian', weight: 1 },
  { name: 'Palestinian', weight: 2 },
  { name: 'Somali', weight: 1 },
  { name: 'Turkish', weight: 1 },
  { name: 'Yemeni', weight: 1 },
  { name: 'Saint Kitts and Nevis', weight: 1 },
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

export function weightedNationality(random: () => number): string {
  const total = nationalities.reduce((s, n) => s + n.weight, 0);
  let r = random() * total;
  for (const n of nationalities) {
    r -= n.weight;
    if (r <= 0) return n.name;
  }
  return nationalities[0].name;
}
