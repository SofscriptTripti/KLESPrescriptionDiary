// New visual identity for the React Native rewrite. Deliberately different from
// the old MAUI app's palette per the redesign request — a clean, modern clinical look.
export const colors = {
  primary: '#0F766E', // deep teal — primary actions, headers
  primaryDark: '#0B544E',
  primaryLight: '#CCFBF1',
  accent: '#4338CA', // indigo — secondary emphasis, links
  accentLight: '#E0E7FF',

  background: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceAlt: '#F1F5F9',
  border: '#E2E8F0',

  textPrimary: '#0F172A',
  textSecondary: '#64748B',
  textMuted: '#94A3B8',
  textOnPrimary: '#FFFFFF',

  danger: '#DC2626',
  dangerLight: '#FEE2E2',
  warning: '#D97706',
  warningLight: '#FEF3C7',
  success: '#16A34A',
  successLight: '#DCFCE7',
  info: '#0284C7',
  infoLight: '#E0F2FE',

  male: '#2563EB',
  female: '#DB2777',

  overlay: 'rgba(15, 23, 42, 0.45)',
  white: '#FFFFFF',
  black: '#000000',
} as const;

export type ColorToken = keyof typeof colors;
