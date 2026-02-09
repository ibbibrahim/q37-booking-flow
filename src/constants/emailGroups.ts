export interface EmailGroup {
  id: string;
  label: string;
  email: string;
}

export const EMAIL_GROUPS: EmailGroup[] = [
  {
    id: 'news-media-dept',
    label: 'NEWS MEDIA DEPT',
    email: 'NEWSMEDIADEPT@QTV37.QA',
  },
  {
    id: 'newsroom-journalists',
    label: 'NEWSROOM JOURNALISTS',
    email: 'newsroomjournalists@QTV37.QA',
  },
  {
    id: '37-tv-production-team',
    label: '37 TV PRODUCTION TEAM',
    email: '37TVProductionTeam@QMC.QA',
  },
  {
    id: 'engineering-operations',
    label: 'ENGINEERING OPERATIONS',
    email: 'EngineeringOperations@QTV37.QA',
  },
];

export const DEFAULT_CC_EMAILS = [
  'salderham@qtv37.qa',
  'haldelfi@qtv37.qa',
  'mabushanab@qtv37.qa',
];
