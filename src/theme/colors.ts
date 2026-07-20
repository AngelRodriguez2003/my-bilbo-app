export interface ThemeColors {
  background: string;
  surface: string;
  surfaceHigh: string;
  border: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  accent: string;
  accentText: string;
  success: string;
  warning: string;
  danger: string;
  chartLine: string;
  chartGrid: string;
}

export const darkColors: ThemeColors = {
  background: '#0D0F12',
  surface: '#16191E',
  surfaceHigh: '#1F242B',
  border: '#2A3038',
  text: '#F2F4F7',
  textSecondary: '#9AA3AF',
  textMuted: '#5F6873',
  accent: '#4F9CF9',
  accentText: '#0D0F12',
  success: '#3DCC85',
  warning: '#E8B341',
  danger: '#E85D5D',
  chartLine: '#4F9CF9',
  chartGrid: '#232930',
};

export const lightColors: ThemeColors = {
  background: '#F7F8FA',
  surface: '#FFFFFF',
  surfaceHigh: '#EEF1F5',
  border: '#DDE2E9',
  text: '#171B21',
  textSecondary: '#5A6472',
  textMuted: '#9AA3AF',
  accent: '#2478E0',
  accentText: '#FFFFFF',
  success: '#1FA566',
  warning: '#C2902B',
  danger: '#D64545',
  chartLine: '#2478E0',
  chartGrid: '#E4E8EE',
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
} as const;
