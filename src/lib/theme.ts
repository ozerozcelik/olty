/**
 * Olty Design System — Vibrant Premium Theme
 * 
 * Import as: import { T } from '@/lib/theme';
 */

export const T = {
  // Backgrounds — Deeper & richer
  bg: '#050608',
  bgCard: '#11141A',
  bgDeep: '#050608',
  bgInput: 'rgba(255,255,255,0.04)',
  bgInputActive: 'rgba(255,255,255,0.08)',

  // Glass cards — More visible contrast
  glass: 'rgba(255,255,255,0.04)',
  glassBorder: 'rgba(255,255,255,0.10)',
  glassBorderActive: '#D4FF00',

  // Brand colors — VIBRANT
  teal: '#D4FF00',
  tealBright: '#E7FF66',
  tealDim: 'rgba(212,255,0,0.72)',
  tealGlow: 'rgba(212,255,0,0.20)',
  
  coral: '#FF5500',
  coralBright: '#FF7D3B',
  coralDim: 'rgba(255,85,0,0.72)',
  coralGlass: 'rgba(255,85,0,0.20)',

  // Text — Higher contrast
  textPrimary: '#FFFFFF',              // pure white for max contrast
  textSecondary: '#8B92A5',
  textTertiary: 'rgba(139,146,165,0.72)',
  textTeal: '#D4FF00',

  // Semantic — Brighter & saturated
  green: '#34D399',          // emerald-400
  greenBright: '#6EE7B7',    // emerald-300
  greenGlass: 'rgba(52,211,153,0.22)',
  
  red: '#F87171',            // red-400
  redBright: '#FCA5A5',      // red-300
  redGlass: 'rgba(248,113,113,0.22)',
  
  gold: '#FBBF24',           // amber-400
  goldBright: '#FCD34D',     // amber-300
  goldGlass: 'rgba(251,191,36,0.22)',
  
  // Additional accent colors
  blue: '#60A5FA',           // blue-400
  purple: '#A78BFA',         // violet-400
} as const;

export type ThemeColors = typeof T;
