export const PREDEFINED_PROGRAMS = [
  'هي والاقتصاد',
  'الميزان',
  'Eco motion',
  'كلاكيت',
  'برنامج 360',
  'القيمة',
  'مكانتهم',
  'صناعات قطرية',
  'صناع القرار',
] as const;

export type PredefinedProgram = (typeof PREDEFINED_PROGRAMS)[number];