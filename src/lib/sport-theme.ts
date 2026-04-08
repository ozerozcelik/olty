export const SPORT_THEME = {
  bg: '#050608',
  surface: '#11141A',
  surfaceAlt: '#171C24',
  border: 'rgba(255,255,255,0.10)',
  text: '#FFFFFF',
  textMuted: '#8B92A5',
  active: '#D4FF00',
  warning: '#FF5500',
  info: '#5C87FF',
} as const;

export type SportTheme = typeof SPORT_THEME;
