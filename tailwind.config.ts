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
        main: '#0B1F2A',
        sand: '#0B1F2A',
        
        // Card backgrounds (semi-transparent)
        card: 'rgba(255,255,255,0.04)',
        cardHover: 'rgba(255,255,255,0.07)',
        cardActive: 'rgba(255,255,255,0.10)',
        
        // Primary accent - Turquoise water
        water: {
          DEFAULT: '#2EC4B6',
          light: '#4DD9CC',
          dark: '#239E92',
          muted: 'rgba(46,196,182,0.15)',
          glow: 'rgba(46,196,182,0.4)',
        },
        
        // CTA Orange
        cta: {
          DEFAULT: '#FF7A00',
          light: '#FF9633',
          dark: '#E06B00',
          muted: 'rgba(255,122,0,0.15)',
          glow: 'rgba(255,122,0,0.4)',
        },
        
        // Legacy accent mappings
        sea: '#2EC4B6',
        seaLight: '#4DD9CC',
        seaDark: '#239E92',
        coral: '#FF7A00',
        coralLight: '#FF9633',
        coralDark: '#E06B00',
        
        // Text colors
        ink: '#EAF4F4',
        textPrimary: '#EAF4F4',
        textSecondary: '#9DB5B5',
        textTertiary: '#6B8A8A',
        textMuted: 'rgba(234,244,244,0.45)',
        
        // Surface colors with depth
        surface: {
          DEFAULT: '#0F2A36',
          light: '#153340',
          lighter: '#1A3D4A',
          dark: '#081820',
        },
        surfaceAlt: '#153340',
        
        // Border colors
        border: {
          DEFAULT: 'rgba(255,255,255,0.08)',
          subtle: 'rgba(255,255,255,0.05)',
          strong: 'rgba(255,255,255,0.12)',
          focus: 'rgba(46,196,182,0.5)',
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
          primary: '#2EC4B6',
          secondary: '#FF7A00',
        },
        
        // Accent (legacy support)
        accent: {
          DEFAULT: '#2EC4B6',
          50: '#E6FAF8',
          100: '#B3F0EB',
          200: '#80E6DE',
          300: '#4DD9CC',
          400: '#2EC4B6',
          500: '#239E92',
          600: '#1A7A71',
          700: '#125650',
          800: '#0A3330',
          900: '#051A18',
        },
        
        // Secondary
        secondary: {
          DEFAULT: '#FF7A00',
          50: '#FFF5EB',
          100: '#FFE5CC',
          200: '#FFD5AD',
          300: '#FFC58F',
          400: '#FFB570',
          500: '#FF7A00',
          600: '#E06B00',
          700: '#B85800',
          800: '#8F4400',
          900: '#663100',
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
          DEFAULT: '#2EC4B6',
          muted: 'rgba(46,196,182,0.15)',
        },
        
        // Level colors (gamification)
        level: {
          acemi: '#6B8A8A',
          balikci: '#22C55E',
          uzman: '#2EC4B6',
          usta: '#8B5CF6',
          kaptan: '#FF7A00',
          legend: '#FFD700',
        },
        
        // Legacy support
        background: '#0B1F2A',
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
        'glow': '0 0 24px rgba(46,196,182,0.35)',
        'glow-water': '0 0 24px rgba(46,196,182,0.35)',
        'glow-cta': '0 0 24px rgba(255,122,0,0.35)',
        'glow-coral': '0 0 24px rgba(255,122,0,0.35)',
        'glow-sea': '0 0 24px rgba(46,196,182,0.35)',
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
