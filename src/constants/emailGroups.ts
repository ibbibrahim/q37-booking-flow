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
  {
    id: '37TVProductionTeam',
    label: '37TV PRODUCTION TEAM',
    email: '37TVProductionTeam@QMC.QA',
  },
  {
    id: 'producers',
    label: 'Producers',
    email: 'QBCNewsProducers@QBC.NEWS',
  },
  {
    id: 'cameraman-team',
    label: 'CAMERAMAN TEAM',
    email: 'CamermanTeam@QBC.NEWS',
  },
];

export const DEFAULT_CC_EMAILS = [
  'salderham@qbc.news',
  'mabushanab@qbc.news',
  'mdaouk@qbc.news'
];
