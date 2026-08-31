export const colors = {
  cream: '#FFF8F0',
  surface: '#FEFEFE',
  blush: '#FFB6C1',
  blushSoft: '#FFE7EB',
  blushDeep: '#D9788B',
  gold: '#C9A96E',
  goldSoft: '#F2E6CF',
  sage: '#9CAF88',
  sageSoft: '#E7EFE0',
  cocoa: '#4A3831',
  text: '#3E312D',
  textMuted: '#806F68',
  line: '#EDE1D8',
  white: '#FFFFFF',
  danger: '#B95B68',
  overlay: 'rgba(62, 49, 45, 0.42)',
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
  display: 'Georgia',
  body: undefined,
} as const;

export const shadows = {
  soft: {
    shadowColor: '#6B4C42',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.1,
    shadowRadius: 14,
    elevation: 3,
  },
} as const;

export const layout = {
  maxContentWidth: 980,
  pagePadding: 18,
  bottomTabSpace: 104,
} as const;
