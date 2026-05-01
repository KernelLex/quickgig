import { Platform } from 'react-native';

export const colors = {
  background: '#080B10',
  backgroundTint: '#0E141B',
  surface: '#121922',
  surfaceElevated: '#18222E',
  cardStrong: '#0B1118',
  cardStrongMuted: '#111C27',
  accent: '#1DBF73',
  accentHover: '#2FE28D',
  accentSoft: '#0C2A1D',
  accentSoftText: '#B9F7D2',
  success: '#22C55E',
  successSoft: '#0D2D1C',
  error: '#EF4444',
  errorSoft: '#35171A',
  badge: '#F59E0B',
  badgeSoft: '#2F230E',
  badgeText: '#FCD34D',
  blueSoft: '#0D2235',
  blueText: '#93C5FD',
  border: '#25313F',
  borderStrong: '#3A4757',
  textPrimary: '#F7FAFC',
  textSecondary: '#C9D3DF',
  textMuted: '#8D9AAA',
  textOnStrong: '#F7FAFC',
  textOnStrongMuted: '#AEBBCA',
  textOnAccent: '#03130B',
  muted: '#7F8C9D',
};

export const spacing = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  xxl: 36,
  xxxl: 52,
};

export const radii = {
  lg: 8,
  xl: 8,
  pill: 999,
};

export const shadow = {
  card: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.22,
    shadowRadius: 24,
    elevation: 6,
  },
};

export const fonts = {
  body: Platform.select({
    ios: 'System',
    android: 'sans-serif',
    default:
      'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  }),
  display: Platform.select({
    ios: 'System',
    android: 'sans-serif-medium',
    default:
      'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  }),
};
