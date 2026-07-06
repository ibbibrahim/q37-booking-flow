import { useTheme } from '@/contexts/ThemeContext';

export interface HRChartPalette {
  permanent: string;
  freelance: string;
  qatari: string;
  nonQatari: string;
  sequential: string;
  critical: string;
  warning: string;
  good: string;
  grid: string;
  axis: string;
  muted: string;
}

const LIGHT_PALETTE: HRChartPalette = {
  permanent: '#2a78d6',
  freelance: '#4a3aa7',
  qatari: '#2a78d6',
  nonQatari: '#1baf7a',
  sequential: '#2a78d6',
  critical: '#d03b3b',
  warning: '#fab219',
  good: '#0ca30c',
  grid: '#e1e0d9',
  axis: '#c3c2b7',
  muted: '#898781',
};

const DARK_PALETTE: HRChartPalette = {
  permanent: '#3987e5',
  freelance: '#9085e9',
  qatari: '#3987e5',
  nonQatari: '#199e70',
  sequential: '#3987e5',
  critical: '#e66767',
  warning: '#fab219',
  good: '#0ca30c',
  grid: '#2c2c2a',
  axis: '#383835',
  muted: '#898781',
};

export function useHRChartColors(): HRChartPalette {
  const { theme } = useTheme();
  return theme === 'dark' ? DARK_PALETTE : LIGHT_PALETTE;
}
