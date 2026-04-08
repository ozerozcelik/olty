import type { Config } from 'tailwindcss';
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      // Custom fonts
      fontFamily: {
        inter: ['Inter_400Regular'],
        'inter-medium': ['Inter_500Medium'],
        'inter-semibold': ['Inter_600SemiBold'],
        'inter-bold': ['Inter_700Bold'],
      },
      
      colors: {
        // ══════════════════════════════════════════
        // OLTY PREMIUM DESIGN SYSTEM
        // "Strava for fishing meets Instagram"
        // ══════════════════════════════════════════
        
        // Background colors
        main: '#050608',
        sand: '#050608',
        
        // Card backgrounds (semi-transparent)
        card: 'rgba(255,255,255,0.04)',
        cardHover: 'rgba(255,255,255,0.07)',
        cardActive: 'rgba(255,255,255,0.10)',
        
        // Primary accent - Turquoise water
        water: {
          DEFAULT: '#D4FF00',
          light: '#E7FF66',
          dark: '#A4C900',
          muted: 'rgba(212,255,0,0.15)',
          glow: 'rgba(212,255,0,0.4)',
        },
        
        // CTA Orange
        cta: {
          DEFAULT: '#FF5500',
          light: '#FF7D3B',
          dark: '#D64600',
          muted: 'rgba(255,85,0,0.15)',
          glow: 'rgba(255,85,0,0.4)',
        },
        
        // Legacy accent mappings
        sea: '#D4FF00',
        seaLight: '#E7FF66',
        seaDark: '#A4C900',
        coral: '#FF5500',
        coralLight: '#FF7D3B',
        coralDark: '#D64600',
        
        // Text colors
        ink: '#FFFFFF',
        textPrimary: '#FFFFFF',
        textSecondary: '#8B92A5',
        textTertiary: '#6E7789',
        textMuted: 'rgba(139,146,165,0.65)',
        
        // Surface colors with depth
        surface: {
          DEFAULT: '#11141A',
          light: '#171C24',
          lighter: '#202631',
          dark: '#0B0E14',
        },
        surfaceAlt: '#171C24',
        
        // Border colors
        border: {
          DEFAULT: 'rgba(255,255,255,0.10)',
          subtle: 'rgba(255,255,255,0.05)',
          strong: 'rgba(255,255,255,0.14)',
          focus: 'rgba(212,255,0,0.5)',
        },
        
        // Overlay colors
        overlay: {
          light: 'rgba(255,255,255,0.04)',
          medium: 'rgba(255,255,255,0.08)',
          heavy: 'rgba(255,255,255,0.12)',
          dark: 'rgba(0,0,0,0.5)',
        },
        
        // Brand colors
        brand: {
          primary: '#D4FF00',
          secondary: '#FF5500',
        },
        
        // Accent (legacy support)
        accent: {
          DEFAULT: '#D4FF00',
          50: '#F9FFE0',
          100: '#F3FFC1',
          200: '#EAFF8F',
          300: '#E1FF5C',
          400: '#D4FF00',
          500: '#B8DB00',
          600: '#93AF00',
          700: '#6E8400',
          800: '#4A5800',
          900: '#2A3300',
        },
        
        // Secondary
        secondary: {
          DEFAULT: '#FF5500',
          50: '#FFF1E8',
          100: '#FFD9C4',
          200: '#FFC09F',
          300: '#FFA67A',
          400: '#FF8D55',
          500: '#FF5500',
          600: '#D64600',
          700: '#A83600',
          800: '#7A2700',
          900: '#4D1800',
        },
        
        // Semantic colors
        success: {
          DEFAULT: '#22C55E',
          muted: 'rgba(34,197,94,0.15)',
        },
        warning: {
          DEFAULT: '#F59E0B',
          muted: 'rgba(245,158,11,0.15)',
        },
        error: {
          DEFAULT: '#EF4444',
          muted: 'rgba(239,68,68,0.15)',
        },
        info: {
          DEFAULT: '#D4FF00',
          muted: 'rgba(212,255,0,0.15)',
        },
        
        // Level colors (gamification)
        level: {
          acemi: '#6B8A8A',
          balikci: '#22C55E',
          uzman: '#D4FF00',
          usta: '#8B5CF6',
          kaptan: '#FF5500',
          legend: '#FFD700',
        },
        
        // Legacy support
        background: '#050608',
      },
      
      // Extended border radius
      borderRadius: {
        'xl': '16px',
        '2xl': '20px',
        '3xl': '24px',
        '4xl': '28px',
        '5xl': '32px',
      },
      
      // Box shadows
      boxShadow: {
        'glow': '0 0 24px rgba(212,255,0,0.35)',
        'glow-water': '0 0 24px rgba(212,255,0,0.35)',
        'glow-cta': '0 0 24px rgba(255,85,0,0.35)',
        'glow-coral': '0 0 24px rgba(255,85,0,0.35)',
        'glow-sea': '0 0 24px rgba(212,255,0,0.35)',
        'card': '0 4px 24px rgba(0, 0, 0, 0.25)',
        'card-hover': '0 8px 32px rgba(0, 0, 0, 0.35)',
        'elevated': '0 12px 48px rgba(0, 0, 0, 0.4)',
        'inner-glow': 'inset 0 1px 0 rgba(255,255,255,0.08)',
      },
      
      // Animation durations
      transitionDuration: {
        '250': '250ms',
        '350': '350ms',
        '400': '400ms',
      },
      
      // Backdrop blur
      backdropBlur: {
        xs: '2px',
        sm: '4px',
        md: '8px',
        lg: '12px',
        xl: '16px',
      },
    },
  },
  plugins: [],
};
export default config;
