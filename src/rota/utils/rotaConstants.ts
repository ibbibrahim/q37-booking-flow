export const PREDEFINED_PROGRAMS = [
  'هدي وإقتصاد',
  'الميزان',
  'Eco motion',
  'كلاست',
  'برنامج 360',
  'القيمة',
  'مكانتهم',
  'صناعات خليجية',
  'بناء القرار',
  'هالة الإبداع',
  'حديث الأسواق',
] as const;

export type PredefinedProgram = (typeof PREDEFINED_PROGRAMS)[number];
