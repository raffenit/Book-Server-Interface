export const Colors = {
  // Base
  background: '#0d0d12',
  surface: '#16161f',
  surfaceElevated: '#1e1e2a',
  border: '#2a2a3a',
  borderLight: '#353548',

  // Accent - deep amber/gold for a premium reader feel
  accent: '#e8a838',
  accentDim: '#b8832a',
  accentSoft: 'rgba(232, 168, 56, 0.15)',

  // Text
  textPrimary: '#f0ead8',
  textSecondary: '#9a9098',
  textMuted: '#5a5568',
  textOnAccent: '#0d0d12',

  // Status
  success: '#4caf7d',
  error: '#e05c5c',
  warning: '#e8a838',

  // Progress
  progressBar: '#e8a838',
  progressTrack: '#2a2a3a',

  // Special
  overlay: 'rgba(13, 13, 18, 0.85)',
  cardShadow: 'rgba(0, 0, 0, 0.5)',
};

export const Typography = {
  // Sizes
  xs: 11,
  sm: 13,
  base: 15,
  md: 17,
  lg: 20,
  xl: 24,
  xxl: 30,
  xxxl: 38,

  // Weights
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,

  // Font families (using system fonts that look great)
  serif: 'Georgia',
  sans: 'System',
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 48,
};

export const Radius = {
  sm: 6,
  md: 10,
  lg: 16,
  xl: 24,
  full: 9999,
};
