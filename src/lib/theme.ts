/**
 * Olty Design System — Vibrant Premium Theme
 * 
 * Import as: import { T } from '@/lib/theme';
 */

export const T = {
  // Backgrounds — Deeper & richer
  bg: '#0A1A22',             // main screen - deeper
  bgCard: '#122A34',         // card background - more visible
  bgDeep: '#071418',         // deepest background
  bgInput: 'rgba(45,212,191,0.10)',  // input field bg - more vibrant
  bgInputActive: 'rgba(45,212,191,0.18)',

  // Glass cards — More visible contrast
  glass: 'rgba(45,212,191,0.12)',        // more visible glass
  glassBorder: 'rgba(45,212,191,0.28)',  // stronger border
  glassBorderActive: '#2DD4BF',

  // Brand colors — VIBRANT
  teal: '#2DD4BF',           // bright teal (Tailwind teal-400)
  tealBright: '#5EEAD4',     // extra bright for highlights
  tealDim: 'rgba(45,212,191,0.65)',
  tealGlow: 'rgba(45,212,191,0.20)',    // stronger glow
  
  coral: '#FF7A45',          // brighter coral/orange
  coralBright: '#FF9966',    // lighter coral for hover
  coralDim: 'rgba(255,122,69,0.65)',
  coralGlass: 'rgba(255,122,69,0.20)',

  // Text — Higher contrast
  textPrimary: '#FFFFFF',              // pure white for max contrast
  textSecondary: 'rgba(255,255,255,0.75)',  // much brighter
  textTertiary: 'rgba(255,255,255,0.50)',   // still readable
  textTeal: '#2DD4BF',

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
