/**
 * Shared Weather Utilities
 * 
 * Extracted from WeatherWidget and WeatherWidgetCompact to eliminate code duplication.
 * All weather-related helper functions live here.
 */

import type { HourlyForecastDatum } from '@/types/app.types';

// ============================================
// WEATHER DISPLAY HELPERS
// ============================================

export const getWeatherEmoji = (code: number): string => {
  if (code === 0) return '\u2600\uFE0F'; // ☀️
  if (code >= 1 && code <= 3) return '\u26C5'; // ⛅
  if (code >= 45 && code <= 48) return '\uD83C\uDF2B\uFE0F'; // 🌫️
  if (code >= 51 && code <= 67) return '\uD83C\uDF27\uFE0F'; // 🌧️
  if (code >= 71 && code <= 77) return '\u2744\uFE0F'; // ❄️
  if (code >= 80 && code <= 82) return '\uD83C\uDF26\uFE0F'; // 🌦️
  if (code >= 95 && code <= 99) return '\u26C8\uFE0F'; // ⛈️
  return '\uD83C\uDF24\uFE0F'; // 🌤️
};

export const getWeatherLabel = (code: number): string => {
  if (code === 0) return 'Açık';
  if (code >= 1 && code <= 3) return 'Parçalı bulutlu';
  if (code >= 45 && code <= 48) return 'Sisli';
  if (code >= 51 && code <= 67) return 'Yağmurlu';
  if (code >= 71 && code <= 77) return 'Karlı';
  if (code >= 80 && code <= 82) return 'Sağanak';
  if (code >= 95 && code <= 99) return 'Fırtınalı';
  return 'Değişken';
};

export const getWindDirectionLabel = (degrees: number | null): string => {
  if (degrees === null) return '--';
  const dirs = ['K', 'KD', 'D', 'GD', 'G', 'GB', 'B', 'KB'];
  return dirs[Math.round(degrees / 45) % 8] ?? 'K';
};

export const getWindDirectionLabelLong = (degrees: number): string => {
  const dirs = ['Kuzey', 'KD', 'Doğu', 'GD', 'Güney', 'GB', 'Batı', 'KB'];
  return dirs[Math.round(degrees / 45) % 8] ?? 'Kuzey';
};

// ============================================
// FORMATTING
// ============================================

export const formatCompact = (value: number | null, decimals = 1): string => {
  if (value === null) return '--';
  const rounded = Number(value.toFixed(decimals));
  return Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(decimals);
};

export const formatHour24 = (iso: string): string => iso.slice(11, 16);

export const formatWindSpeed = (
  value: number,
  unit: 'kmh' | 'kt',
): string => {
  if (unit === 'kt') {
    return `${formatCompact(value / 1.852)} kt`;
  }
  return `${formatCompact(value)} km/sa`;
};

export const getPressureTrendArrow = (
  trend: 'rising' | 'falling' | 'stable' | null,
): string => {
  if (trend === 'rising') return '\u2191'; // ↑
  if (trend === 'falling') return '\u2193'; // ↓
  if (trend === 'stable') return '\u2192'; // →
  return '';
};

// ============================================
// HOURLY DATA HELPERS
// ============================================

export const getHourlyEntriesForDay = (
  hourlyData: HourlyForecastDatum[],
  date: string,
): HourlyForecastDatum[] => {
  return hourlyData.filter((item) => item.time.slice(0, 10) === date);
};

export const getHourlyTimelineEntries = (
  hourlyData: HourlyForecastDatum[],
  date: string,
  isToday: boolean,
  maxEntries = 36,
): HourlyForecastDatum[] => {
  if (!hourlyData.length) return [];

  const dayEntries = getHourlyEntriesForDay(hourlyData, date);
  if (!dayEntries.length) return [];

  if (isToday) {
    const now = Date.now();
    const currentIndex = hourlyData.findIndex(
      (item) => new Date(item.time).getTime() >= now - 30 * 60 * 1000,
    );
    const startIndex = hourlyData.findIndex((item) => item.time.startsWith(date));
    const effectiveStart = currentIndex >= 0 ? Math.max(startIndex, currentIndex - 1) : startIndex;
    if (effectiveStart < 0) return dayEntries.slice(0, maxEntries);
    return hourlyData.slice(effectiveStart, effectiveStart + maxEntries);
  }

  const startIndex = hourlyData.findIndex((item) => item.time.startsWith(date));
  if (startIndex < 0) return dayEntries.slice(0, maxEntries);
  return hourlyData.slice(startIndex, startIndex + maxEntries);
};

export const getDefaultHourlyTime = (
  hourlyEntries: HourlyForecastDatum[],
  isToday: boolean,
): string | null => {
  if (!hourlyEntries.length) return null;

  if (isToday) {
    const now = Date.now();
    const upcomingEntry = hourlyEntries.find(
      (item) => new Date(item.time).getTime() >= now - 30 * 60 * 1000,
    );
    if (upcomingEntry) return upcomingEntry.time;
  }

  const noonEntry = hourlyEntries.find(
    (item) => item.time.slice(11, 16) === '12:00',
  );
  if (noonEntry) return noonEntry.time;

  return hourlyEntries[0]?.time ?? null;
};

export const getHourlyIndexFromScroll = (
  offsetX: number,
  viewportWidth: number,
  itemCount: number,
  itemWidth: number,
  itemSpan: number,
): number => {
  if (itemCount <= 0 || viewportWidth <= 0) return 0;
  const sidePadding = Math.max(0, (viewportWidth - itemWidth) / 2);
  const centeredPosition = offsetX + viewportWidth / 2 - sidePadding - itemWidth / 2;
  return Math.max(0, Math.min(itemCount - 1, Math.round(centeredPosition / itemSpan)));
};

export const getMaxHourlyOffset = (
  itemCount: number,
  itemSpan: number,
): number => Math.max(0, (itemCount - 1) * itemSpan);

export const getHourlyDayLabel = (
  hourlyTime: string | null,
  selectedDate: string,
): string => {
  if (!hourlyTime) return '';
  const hourlyDate = hourlyTime.slice(0, 10);
  if (hourlyDate === selectedDate) return '';
  const today = new Date().toISOString().slice(0, 10);
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  if (hourlyDate === today) return 'Bugün';
  if (hourlyDate === tomorrow) return 'Yarın';
  const date = new Date(hourlyDate);
  return date.toLocaleDateString('tr-TR', { weekday: 'short', day: 'numeric', month: 'short' });
};

export const getHourlyLabel = (time: string, isNow: boolean): string => {
  if (isNow) return 'Şimdi';
  return new Date(time).toLocaleTimeString('tr-TR', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

// ============================================
// SCORE HELPERS
// ============================================

export const getScoreColor = (score: number, colors: { green: string; gold: string; red: string }): string => {
  if (score >= 8) return colors.green;
  if (score >= 5) return colors.gold;
  return colors.red;
};

export interface ScoreTone {
  numberColor: string;
  pillColor: string;
}

export const getScoreTone = (
  score: number,
  colors: { green: string; gold: string; red: string; secondary?: string },
): ScoreTone => {
  if (score >= 8.5) return { numberColor: colors.green, pillColor: colors.green };
  if (score >= 7) return { numberColor: colors.secondary ?? colors.gold, pillColor: colors.secondary ?? colors.gold };
  if (score >= 5.5) return { numberColor: colors.gold, pillColor: colors.gold };
  if (score >= 4) return { numberColor: '#F97316', pillColor: '#F97316' };
  return { numberColor: colors.red, pillColor: colors.red };
};

// ============================================
// FORECAST DAY HELPERS
// ============================================

export const isGoldenHour = (forecastDay: { goldenHour?: { isActive: boolean } | null; fishingScoreFactors?: { label: string; impact: string }[] }): boolean => {
  if (forecastDay.goldenHour?.isActive) return true;
  return forecastDay.fishingScoreFactors?.some(
    (factor) => factor.label === 'Altın Saat' && factor.impact === 'positive',
  ) ?? false;
};

export const getHourPart = (value: string): number => {
  const parts = value.split(':');
  return Number(parts[0] ?? '0');
};
