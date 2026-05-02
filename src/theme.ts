import { Platform } from 'react-native';

export const colors = {
  background: '#0B0F19',
  backgroundTint: '#101722',
  surface: '#121A25',
  surfaceElevated: '#1A2432',
  cardStrong: '#0E141D',
  cardStrongMuted: '#111C2B',
  accent: '#8AB4F8',
  accentHover: '#AECBFA',
  accentSoft: '#10233F',
  accentSoftText: '#D2E3FC',
  success: '#81C995',
  successSoft: '#10291D',
  error: '#F28B82',
  errorSoft: '#3A1716',
  badge: '#FDD663',
  badgeSoft: '#332908',
  badgeText: '#FDD663',
  blueSoft: '#10233F',
  blueText: '#AECBFA',
  border: '#293545',
  borderStrong: '#425165',
  textPrimary: '#F8FAFD',
  textSecondary: '#D5DCE6',
  textMuted: '#98A2B3',
  textOnStrong: '#F8FAFD',
  textOnStrongMuted: '#B7C1D1',
  textOnAccent: '#07111F',
  muted: '#8D98AA',
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
