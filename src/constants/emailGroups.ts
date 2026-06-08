export interface EmailGroup {
  id: string;
  label: string;
  email: string;
}

export const EMAIL_GROUPS: EmailGroup[] = [
  {
    id: 'news-media-dept',
    label: 'NEWS MEDIA DEPT',
    email: 'NEWSMEDIADEPT@qbc.news',
  },
  {
    id: 'newsroom-journalists',
    label: 'NEWSROOM JOURNALISTS',
    email: 'newsroomjournalists@qbc.news',
  },
  {
    id: 'engineering-operations',
    label: 'ENGINEERING OPERATIONS',
    email: 'EngineeringOperations@qbc.news',
  },
];

export const DEFAULT_CC_EMAILS = [
  'salderham@qbc.news',
  'haldelfi@qbc.news',
  'mabushanab@qbc.news'
];
