export const colors = {
  cream: '#0A0A0A',
  surface: '#1A1A1A',
  blush: '#D4AF37',
  blushSoft: 'rgba(212, 175, 55, 0.1)',
  blushDeep: '#D4AF37',
  gold: '#D4AF37',
  goldSoft: 'rgba(212, 175, 55, 0.1)',
  sage: '#4CAF50',
  sageSoft: 'rgba(76, 175, 80, 0.1)',
  cocoa: '#FFFFFF',
  text: '#FFFFFF',
  textMuted: '#888888',
  line: '#2A2A2A',
  white: '#FFFFFF',
  danger: '#FF4444',
  overlay: 'rgba(0, 0, 0, 0.75)',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const radii = {
  sm: 10,
  md: 16,
  lg: 20,
  xl: 24,
  round: 999,
} as const;

export const fonts = {
  display: undefined,
  body: undefined,
} as const;

export const shadows = {
  soft: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },
} as const;

export const layout = {
  maxContentWidth: 980,
  pagePadding: 18,
  bottomTabSpace: 104,
} as const;
