/**
 * Olty Design Tokens
 * Centralized design system constants for consistent UI
 */

// ============================================
// COLOR PALETTE
// ============================================

export const colors = {
  // Primary Brand Colors
  brand: {
    primary: '#00D084',    // Green accent
    secondary: '#3B82F6',  // Blue
    sea: '#7DD4E8',        // Cyan
    coral: '#E8845A',      // Orange
  },

  // Background Colors (Dark Theme)
  background: {
    primary: '#0B1622',    // Main background
    secondary: '#162030',  // Card background
    tertiary: '#1B2A3D',   // Elevated surfaces
    elevated: '#243447',   // Modals, popovers
  },

  // Text Colors
  text: {
    primary: '#F8FAFC',
    secondary: '#94A3B8',
    tertiary: '#64748B',
    muted: 'rgba(248,250,252,0.45)',
    inverse: '#0B1622',
  },

  // Semantic Colors
  semantic: {
    success: '#22C55E',
    successMuted: 'rgba(34,197,94,0.15)',
    warning: '#F59E0B',
    warningMuted: 'rgba(245,158,11,0.15)',
    error: '#EF4444',
    errorMuted: 'rgba(239,68,68,0.15)',
    info: '#3B82F6',
    infoMuted: 'rgba(59,130,246,0.15)',
  },

  // Border Colors
  border: {
    default: 'rgba(148,163,184,0.12)',
    subtle: 'rgba(148,163,184,0.08)',
    strong: 'rgba(148,163,184,0.20)',
    focus: 'rgba(0,208,132,0.5)',
  },

  // Overlay Colors
  overlay: {
    light: 'rgba(255,255,255,0.07)',
    medium: 'rgba(255,255,255,0.12)',
    dark: 'rgba(0,0,0,0.5)',
    backdrop: 'rgba(11,22,34,0.85)',
  },

  // Gradient Presets
  gradients: {
    primary: ['#00D084', '#00B874'],
    coral: ['#E8845A', '#D9734A'],
    sea: ['#7DD4E8', '#5BC4DB'],
    glass: ['rgba(255,255,255,0.12)', 'rgba(255,255,255,0.04)'],
    cardOverlay: ['transparent', 'rgba(11,22,34,0.92)'],
  },

  // Level Colors (Gamification)
  levels: {
    acemi: '#78909C',
    balikci: '#43A047',
    uzman: '#1E88E5',
    usta: '#8E24AA',
    kaptan: '#F4511E',
    legend: '#C9A227',
  },
} as const;

// ============================================
// TYPOGRAPHY
// ============================================

export const typography = {
  fonts: {
    regular: 'Inter_400Regular',
    medium: 'Inter_500Medium',
    semibold: 'Inter_600SemiBold',
    bold: 'Inter_700Bold',
  },

  sizes: {
    xs: 11,
    sm: 13,
    base: 15,
    md: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 28,
    '4xl': 32,
    '5xl': 40,
  },

  lineHeights: {
    tight: 1.2,
    snug: 1.35,
    normal: 1.5,
    relaxed: 1.65,
  },

  letterSpacing: {
    tight: -0.5,
    normal: 0,
    wide: 0.5,
    wider: 1,
  },
} as const;

// ============================================
// SPACING
// ============================================

export const spacing = {
  0: 0,
  px: 1,
  0.5: 2,
  1: 4,
  1.5: 6,
  2: 8,
  2.5: 10,
  3: 12,
  3.5: 14,
  4: 16,
  5: 20,
  6: 24,
  7: 28,
  8: 32,
  9: 36,
  10: 40,
  11: 44,
  12: 48,
  14: 56,
  16: 64,
  20: 80,
  24: 96,
} as const;

// ============================================
// BORDER RADIUS
// ============================================

export const radii = {
  none: 0,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 20,
  '3xl': 24,
  '4xl': 28,
  full: 9999,
} as const;

// ============================================
// SHADOWS / ELEVATION
// ============================================

export const shadows = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  glow: {
    shadowColor: '#00D084',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 0,
  },
  glowCoral: {
    shadowColor: '#E8845A',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 0,
  },
} as const;

// ============================================
// ANIMATION CONFIGS
// ============================================

export const animations = {
  // Spring configurations
  spring: {
    gentle: { damping: 20, stiffness: 150, mass: 1 },
    bouncy: { damping: 12, stiffness: 200, mass: 0.8 },
    snappy: { damping: 25, stiffness: 400, mass: 0.5 },
    slow: { damping: 30, stiffness: 100, mass: 1.2 },
  },

  // Timing configurations
  timing: {
    instant: 100,
    fast: 200,
    normal: 300,
    slow: 500,
    verySlow: 800,
  },

  // Easing curves (for Animated API)
  easing: {
    easeOut: 'cubic-bezier(0.33, 1, 0.68, 1)',
    easeIn: 'cubic-bezier(0.32, 0, 0.67, 0)',
    easeInOut: 'cubic-bezier(0.65, 0, 0.35, 1)',
    spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  },
} as const;

// ============================================
// Z-INDEX LAYERS
// ============================================

export const zIndex = {
  base: 0,
  dropdown: 10,
  sticky: 20,
  fixed: 30,
  modalBackdrop: 40,
  modal: 50,
  popover: 60,
  tooltip: 70,
  toast: 80,
} as const;

// ============================================
// COMPONENT SPECIFIC TOKENS
// ============================================

export const components = {
  card: {
    background: colors.background.secondary,
    border: colors.border.default,
    borderRadius: radii['4xl'],
    padding: spacing[5],
  },

  button: {
    height: {
      sm: 36,
      md: 44,
      lg: 52,
    },
    borderRadius: radii['4xl'],
    paddingHorizontal: spacing[5],
  },

  input: {
    height: 52,
    borderRadius: radii['2xl'],
    paddingHorizontal: spacing[4],
    background: colors.overlay.light,
    border: colors.border.default,
    focusBorder: colors.border.focus,
  },

  avatar: {
    xs: 24,
    sm: 32,
    md: 40,
    lg: 56,
    xl: 80,
  },

  icon: {
    xs: 16,
    sm: 20,
    md: 24,
    lg: 32,
    xl: 48,
  },
} as const;

// Export type helpers
export type ColorKey = keyof typeof colors;
export type SpacingKey = keyof typeof spacing;
export type RadiiKey = keyof typeof radii;
export type ShadowKey = keyof typeof shadows;
