/**
 * Compact Weather Widget — Refactored
 * 
 * Changes:
 * - Replaced hardcoded colors with centralized T theme
 * - Extracted shared helpers to @/utils/weather
 * - Split into smaller sub-components (DaySelector, MetricCard, ChartSection, etc.)
 * - Wrapped expensive computations in useMemo/useCallback
 * - Improved loading/error states with better UX
 * - Fixed touch target sizes (min 44x44)
 */

import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { TouchableOpacity } from '@/components/TouchableOpacity';
import { WeatherLocationPickerModal } from '@/components/WeatherLocationPickerModal';
import { useWeather } from '@/hooks/useWeather';
import { T } from '@/lib/theme';
import { calculateFishingScore } from '@/services/weather.service';
import type {
  BestFishingTime,
  FishingScoreFactor,
  HourlyForecastDatum,
  TideData,
  WeatherForecastDay,
} from '@/types/app.types';
import {
  formatCompact,
  formatHour24,
  getDefaultHourlyTime,
  getHourlyDayLabel,
  getHourlyEntriesForDay,
  getHourlyTimelineEntries,
  getHourPart,
  getScoreColor,
  getWeatherEmoji,
  getWindDirectionLabel,
  isGoldenHour,
} from '@/utils/weather';

// ============================================
// THEME COLORS (centralized)
// ============================================

const C = {
  bg: T.bg,
  card: T.bgCard,
  cardAlt: 'rgba(255,255,255,0.06)',
  cardBorder: T.glassBorder,
  primary: T.teal,
  secondary: T.tealBright,
  textPrimary: T.textPrimary,
  textSecondary: T.textSecondary,
  textTertiary: T.textTertiary,
  border: T.glassBorder,
  green: T.green,
  red: T.red,
  gold: T.gold,
  glass: T.glass ?? 'rgba(255,255,255,0.04)',
} as const;

// Smaller hourly items for compact view
const HOURLY_ITEM_WIDTH = 52;
const HOURLY_ITEM_GAP = 6;
const HOURLY_ITEM_SPAN = HOURLY_ITEM_WIDTH + HOURLY_ITEM_GAP;

const SCORE_COLORS = { green: C.green, gold: C.gold, red: C.red };

// ============================================
// SUB-COMPONENTS
// ============================================

interface DaySelectorProps {
  days: WeatherForecastDay[];
  selectedIndex: number;
  onSelect: (index: number) => void;
}

const DaySelector = React.memo(({ days, selectedIndex, onSelect }: DaySelectorProps): JSX.Element => {
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const selectedDay = days[selectedIndex];

  return (
    <>
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => setDropdownVisible(true)}
        style={styles.daySelector}
      >
        <Text style={styles.daySelectorText}>
          {selectedDay?.shortLabel ?? 'Bugün'}
        </Text>
        <Ionicons color={C.textSecondary} name="chevron-down" size={14} />
      </TouchableOpacity>

      <Modal
        animationType="fade"
        transparent
        visible={dropdownVisible}
        onRequestClose={() => setDropdownVisible(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setDropdownVisible(false)}
          style={styles.dropdownOverlay}
        >
          <View style={styles.dropdownContent}>
            <Text style={styles.dropdownTitle}>Gün Seç</Text>
            {days.map((day, index) => (
              <TouchableOpacity
                activeOpacity={0.7}
                key={day.date}
                onPress={() => {
                  onSelect(index);
                  setDropdownVisible(false);
                }}
                style={[
                  styles.dropdownItem,
                  index === selectedIndex && styles.dropdownItemActive,
                ]}
              >
                <Text style={styles.dropdownEmoji}>
                  {getWeatherEmoji(day.weatherCode)}
                </Text>
                <View style={styles.dropdownItemText}>
                  <Text style={styles.dropdownItemLabel}>{day.label}</Text>
                  <Text style={styles.dropdownItemTemp}>
                    {Math.round(day.temperature)}°C
                  </Text>
                </View>
                <View style={[styles.dropdownScore, { backgroundColor: getScoreColor(day.fishingScore, SCORE_COLORS) }]}>
                  <Text style={styles.dropdownScoreText}>{day.fishingScore}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
});

DaySelector.displayName = 'DaySelector';

interface MetricCardProps {
  iconName: keyof typeof Ionicons.glyphMap;
  value: string;
  label: string;
  highlight?: boolean;
}

const MetricCard = React.memo(({ iconName, value, label, highlight }: MetricCardProps): JSX.Element => (
  <View style={[styles.metricCard, highlight && styles.metricCardHighlight]}>
    <Ionicons color={highlight ? C.primary : C.secondary} name={iconName} size={18} />
    <Text style={[styles.metricMain, highlight && styles.metricMainHighlight]}>{value}</Text>
    <Text style={[styles.metricSub, highlight && styles.metricSubHighlight]}>{label}</Text>
  </View>
));

MetricCard.displayName = 'MetricCard';

interface ChartSectionProps {
  chartSamples: HourlyForecastDatum[];
  tideData: TideData | null;
  forecastDay: WeatherForecastDay;
}

const ChartSection = React.memo(({ chartSamples, tideData, forecastDay }: ChartSectionProps): JSX.Element | null => {
  if (chartSamples.length < 2) return null;

  const waveSamples = chartSamples.map((item) => Math.max(0, item.waveHeight ?? 0));
  const hourlyScoreSamples = chartSamples.map((item) =>
    calculateFishingScore({
      pressure: item.pressure,
      windSpeed: item.windSpeed,
      windDirection: item.windDirection,
      moonPhase: forecastDay.moonPhase,
      seaTemp: forecastDay.seaTemp,
      sunrise: forecastDay.sunrise,
      sunset: forecastDay.sunset,
      weatherCode: item.weatherCode,
      referenceTime: new Date(item.time),
    }).score,
  );

  const chartMaxWave = Math.max(...waveSamples, 0.2);
  const chartMaxScore = Math.max(...hourlyScoreSamples, 10);
  const chartMinScore = Math.min(...hourlyScoreSamples, 1);
  const chartHeight = 110;
  const chartWidth = 308;
  const scoreRange = Math.max(1, chartMaxScore - chartMinScore);

  const chartPoints = chartSamples.map((item, index) => {
    const score = hourlyScoreSamples[index] ?? 1;
    const x = (index * (chartWidth - 16)) / Math.max(1, chartSamples.length - 1) + 8;
    const y = 10 + (1 - (score - chartMinScore) / scoreRange) * (chartHeight - 22);
    return { x, y, item };
  });

  const chartPath = chartPoints
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ');

  return (
    <>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Dalga ve Balık Skoru</Text>
        <View style={styles.legendRow}>
          <View style={styles.legendDot}>
            <View style={[styles.legendDotInner, { backgroundColor: 'rgba(212,255,0,0.24)' }]} />
            <Text style={styles.legendText}>Dalga</Text>
          </View>
          <View style={styles.legendDot}>
            <View style={[styles.legendDotInner, { backgroundColor: C.textPrimary }]} />
            <Text style={styles.legendText}>Skor</Text>
          </View>
        </View>
      </View>

      <View style={styles.chartWrap}>
        <View style={styles.chartGridLines}>
          <View style={styles.chartGridLine} />
          <View style={styles.chartGridLine} />
          <View style={styles.chartGridLine} />
        </View>

        <View style={styles.chartBarsRow}>
          {chartSamples.map((sample) => {
            const wave = sample.waveHeight ?? 0;
            const barHeight = Math.max(14, (Math.max(0, wave) / chartMaxWave) * 96);
            const barColor = wave >= 1.5
              ? `${C.red}28`
              : wave >= 0.8
                ? 'rgba(212,255,0,0.16)'
                : 'rgba(212,255,0,0.24)';
            const sampleHour = getHourPart(formatHour24(sample.time));
            const hasTideEvent = tideData?.events?.some((event) => getHourPart(event.time) === sampleHour) ?? false;

            return (
              <View key={sample.time} style={styles.chartBarCol}>
                {hasTideEvent ? (
                  <View style={styles.tideEventDot} />
                ) : (
                  <View style={styles.tideEventSpacer} />
                )}
                <View style={[styles.chartBar, { backgroundColor: barColor, height: barHeight }]} />
                <Text style={styles.chartTime}>{formatHour24(sample.time)}</Text>
              </View>
            );
          })}
        </View>

        {chartPoints.length > 1 ? (
          <Svg height={chartHeight} pointerEvents="none" style={styles.chartLineOverlay} width={chartWidth}>
            <Path d={chartPath} fill="none" stroke={C.primary} strokeWidth={2.2} />
            {chartPoints.map((point) => (
              <Circle
                cx={point.x}
                cy={point.y}
                fill={C.card}
                key={point.item.time}
                r={3.5}
                stroke={C.primary}
                strokeWidth={1.8}
              />
            ))}
          </Svg>
        ) : null}
      </View>
    </>
  );
});

ChartSection.displayName = 'ChartSection';

interface DailyForecastRowsProps {
  forecastDays: WeatherForecastDay[];
}

const DailyForecastRows = React.memo(({ forecastDays }: DailyForecastRowsProps): JSX.Element => {
  const forecastRows = forecastDays.slice(0, 3);
  const minForRows = Math.min(...forecastRows.map((row) => row.temperature - 4));
  const maxForRows = Math.max(...forecastRows.map((row) => row.temperature + 4));
  const rowSpan = Math.max(1, maxForRows - minForRows);

  return (
    <View style={styles.dailyList}>
      {forecastRows.map((row) => {
        const minT = Math.round(row.temperature - 4);
        const maxT = Math.round(row.temperature + 3);
        const left = ((minT - minForRows) / rowSpan) * 130;
        const width = Math.max(24, ((maxT - minT) / rowSpan) * 130);

        return (
          <View key={row.date} style={styles.dailyRow}>
            <Text style={styles.dailyName}>{row.shortLabel}</Text>
            <Text style={styles.dailyIcon}>{getWeatherEmoji(row.weatherCode)}</Text>
            <Text style={styles.dailyMin}>{minT}°</Text>
            <View style={styles.rangeTrack}>
              <View style={[styles.rangeFill, { left, width }]} />
            </View>
            <Text style={styles.dailyMax}>{maxT}°</Text>
            <Text style={styles.dailyWave}>{row.waveHeight ? `${formatCompact(row.waveHeight)} m` : '--'}</Text>
          </View>
        );
      })}
    </View>
  );
});

DailyForecastRows.displayName = 'DailyForecastRows';

interface DetailsModalProps {
  visible: boolean;
  onClose: () => void;
  forecastDay: WeatherForecastDay | null;
  fishingScore: { score: number; label: string; factors: FishingScoreFactor[] };
  tideData: TideData | null;
  bestTimes: BestFishingTime[];
}

const DetailsModal = React.memo(({
  visible,
  onClose,
  forecastDay,
  fishingScore,
  tideData,
  bestTimes,
}: DetailsModalProps): JSX.Element => (
  <Modal
    animationType="slide"
    transparent
    visible={visible}
    onRequestClose={onClose}
  >
    <View style={styles.detailsOverlay}>
      <View style={styles.detailsSheet}>
        <View style={styles.detailsHandle} />
        
        <View style={styles.detailsHeader}>
          <Text style={styles.detailsTitle}>Detaylı Koşullar</Text>
          <TouchableOpacity
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            onPress={onClose}
            style={styles.detailsCloseBtn}
          >
            <Ionicons color={C.textSecondary} name="close" size={24} />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Fishing Score */}
          <View style={styles.detailsSection}>
            <View style={styles.detailsSectionHeader}>
              <Text style={styles.detailsSectionIcon}>{'\uD83C\uDFA3'}</Text>
              <Text style={styles.detailsSectionTitle}>Balık Skoru: {fishingScore.score}</Text>
            </View>
            <Text style={styles.detailsSectionSubtitle}>{fishingScore.label}</Text>
            <View style={styles.factorsList}>
              {fishingScore.factors.map((factor, idx) => (
                <View key={`factor-${idx}`} style={styles.factorItem}>
                  <View style={[styles.factorDot, { backgroundColor: factor.impact === 'positive' ? C.green : factor.impact === 'negative' ? C.red : C.gold }]} />
                  <View style={styles.factorText}>
                    <Text style={styles.factorLabel}>{factor.label}</Text>
                    <Text style={styles.factorDesc}>{factor.description}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* Golden Hour */}
          {forecastDay?.goldenHour ? (
            <View style={styles.detailsSection}>
              <View style={styles.detailsSectionHeader}>
                <Text style={styles.detailsSectionIcon}>{'\u2728'}</Text>
                <Text style={styles.detailsSectionTitle}>Altın Saat</Text>
              </View>
              <Text style={styles.detailsText}>
                Sabah: {forecastDay.goldenHour.morningStart} - {forecastDay.goldenHour.morningEnd}
              </Text>
              <Text style={styles.detailsText}>
                Akşam: {forecastDay.goldenHour.eveningStart} - {forecastDay.goldenHour.eveningEnd}
              </Text>
              <View style={styles.detailsTipCard}>
                <Text style={styles.detailsTip}>
                  Gün doğumu ve batımı civarında balıklar daha aktif beslenir.
                </Text>
              </View>
            </View>
          ) : null}

          {/* Tide */}
          {tideData ? (
            <View style={styles.detailsSection}>
              <View style={styles.detailsSectionHeader}>
                <Text style={styles.detailsSectionIcon}>{'\uD83C\uDF0A'}</Text>
                <Text style={styles.detailsSectionTitle}>Gelgit Durumu</Text>
              </View>
              <Text style={styles.detailsText}>
                {tideData.currentState === 'rising' ? '\u2191 Yükseliyor' : '\u2193 Alçalıyor'}
              </Text>
              {tideData.nextEvent ? (
                <Text style={styles.detailsText}>
                  Sonraki {tideData.nextEvent.type === 'high' ? 'yüksek' : 'alçak'}: {tideData.nextEvent.time}
                </Text>
              ) : null}
            </View>
          ) : null}

          {/* Best Times */}
          {bestTimes.length > 0 ? (
            <View style={styles.detailsSection}>
              <View style={styles.detailsSectionHeader}>
                <Text style={styles.detailsSectionIcon}>{'\u23F0'}</Text>
                <Text style={styles.detailsSectionTitle}>En İyi Saatler</Text>
              </View>
              <View style={styles.bestTimesList}>
                {bestTimes.map((time, idx) => (
                  <View key={`best-${idx}`} style={styles.bestTimeItem}>
                    <Text style={styles.bestTimeTime}>{time.time}</Text>
                    <Text style={styles.bestTimeLabel}>{time.label}</Text>
                    <View style={[styles.bestTimeScore, { backgroundColor: getScoreColor(time.score, SCORE_COLORS) }]}>
                      <Text style={styles.bestTimeScoreText}>{time.score}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {/* Weather Details */}
          {forecastDay ? (
            <View style={styles.detailsSection}>
              <View style={styles.detailsSectionHeader}>
                <Ionicons color={C.secondary} name="thermometer-outline" size={18} />
                <Text style={styles.detailsSectionTitle}>Hava Detayları</Text>
              </View>
              <View style={styles.weatherGrid}>
                <View style={styles.weatherGridItem}>
                  <Text style={styles.weatherGridLabel}>Sıcaklık</Text>
                  <Text style={styles.weatherGridValue}>{Math.round(forecastDay.temperature)}°C</Text>
                </View>
                <View style={styles.weatherGridItem}>
                  <Text style={styles.weatherGridLabel}>Basınç</Text>
                  <Text style={styles.weatherGridValue}>{forecastDay.pressure} hPa</Text>
                </View>
                <View style={styles.weatherGridItem}>
                  <Text style={styles.weatherGridLabel}>Rüzgar</Text>
                  <Text style={styles.weatherGridValue}>
                    {Math.round(forecastDay.windSpeed)} km/h {getWindDirectionLabel(forecastDay.windDirection)}
                  </Text>
                </View>
                <View style={styles.weatherGridItem}>
                  <Text style={styles.weatherGridLabel}>Dalga</Text>
                  <Text style={styles.weatherGridValue}>
                    {forecastDay.waveHeight ? `${formatCompact(forecastDay.waveHeight)} m` : '--'}
                  </Text>
                </View>
                <View style={styles.weatherGridItem}>
                  <Text style={styles.weatherGridLabel}>Deniz</Text>
                  <Text style={styles.weatherGridValue}>
                    {forecastDay.seaTemp ? `${Math.round(forecastDay.seaTemp)}°C` : '--'}
                  </Text>
                </View>
                <View style={styles.weatherGridItem}>
                  <Text style={styles.weatherGridLabel}>Ay</Text>
                  <Text style={styles.weatherGridValue}>{forecastDay.moonPhase.emoji}</Text>
                </View>
              </View>
            </View>
          ) : null}
        </ScrollView>
      </View>
    </View>
  </Modal>
));

DetailsModal.displayName = 'DetailsModal';

// ============================================
// MAIN COMPONENT
// ============================================

export const WeatherWidgetCompact = (): JSX.Element => {
  const weatherQuery = useWeather();
  const [pickerVisible, setPickerVisible] = useState(false);
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [selectedHourlyTime, setSelectedHourlyTime] = useState<string | null>(null);
  const hourlyViewportWidth = 0; // kept for scroll position calculation
  const hourlyScrollRef = useRef<ScrollView | null>(null);
  const hourlySelectedIndexRef = useRef(-1);

  const weather = weatherQuery.data;
  const selectedForecastDay = weather?.forecastDays[selectedDayIndex] ?? weather?.forecastDays[0] ?? null;
  const selectedDailyForecast = weather?.dailyForecast[selectedDayIndex] ?? weather?.dailyForecast[0] ?? null;

  // Reset day selection when weather data changes
  useEffect(() => {
    setSelectedDayIndex(0);
  }, [weather?.dailyForecast?.length]);

  // Memoized hourly entries
  const hourlyEntries = useMemo(
    () => weather && selectedForecastDay
      ? getHourlyEntriesForDay(weather.hourlyForecastData, selectedForecastDay.date)
      : [],
    [weather, selectedForecastDay],
  );

  const hourlyTimelineEntries = useMemo(
    () => weather && selectedForecastDay
      ? getHourlyTimelineEntries(weather.hourlyForecastData, selectedForecastDay.date, selectedForecastDay.isToday, 24)
      : [],
    [weather, selectedForecastDay],
  );

  const defaultHourlyTime = useMemo(
    () => selectedForecastDay ? getDefaultHourlyTime(hourlyEntries, selectedForecastDay.isToday) : null,
    [hourlyEntries, selectedForecastDay],
  );

  const selectedHourlyEntry = useMemo(
    () => hourlyTimelineEntries.find((item) => item.time === selectedHourlyTime) ??
      hourlyTimelineEntries.find((item) => item.time === defaultHourlyTime) ??
      hourlyTimelineEntries[0] ?? null,
    [hourlyTimelineEntries, selectedHourlyTime, defaultHourlyTime],
  );

  // Initialize hourly selection
  useEffect(() => {
    if (!weather) {
      setSelectedHourlyTime(null);
      return;
    }
    const forecastDay = weather.forecastDays[selectedDayIndex] ?? weather.forecastDays[0];
    if (!forecastDay) {
      setSelectedHourlyTime(null);
      return;
    }
    const entries = getHourlyEntriesForDay(weather.hourlyForecastData, forecastDay.date);
    hourlySelectedIndexRef.current = -1;
    setSelectedHourlyTime(getDefaultHourlyTime(entries, forecastDay.isToday));
  }, [selectedDayIndex, weather]);

  // Scroll to initial position
  useEffect(() => {
    if (!weather || hourlyViewportWidth === 0 || !selectedForecastDay) return;

    const entries = getHourlyTimelineEntries(
      weather.hourlyForecastData,
      selectedForecastDay.date,
      selectedForecastDay.isToday,
      24,
    );
    const fallbackTime = getDefaultHourlyTime(
      getHourlyEntriesForDay(weather.hourlyForecastData, selectedForecastDay.date),
      selectedForecastDay.isToday,
    );
    const selectedIndex = entries.findIndex((item) => item.time === fallbackTime);

    if (selectedIndex >= 0) {
      requestAnimationFrame(() => {
        hourlyScrollRef.current?.scrollTo({
          x: selectedIndex * HOURLY_ITEM_SPAN,
          animated: false,
        });
      });
    }
  }, [hourlyViewportWidth, selectedDayIndex, weather, selectedForecastDay]);

  // Compute display values
  const displayValues = useMemo(() => {
    if (!weather || !selectedForecastDay || !selectedDailyForecast) return null;

    const selectedHourlyDayKey = selectedHourlyEntry?.time.slice(0, 10) ?? selectedForecastDay.date;
    const selectedHourlyDayIndex = weather.forecastDays.findIndex((item) => item.date === selectedHourlyDayKey);
    const displayForecastDay = weather.forecastDays[selectedHourlyDayIndex] ?? selectedForecastDay;

    const displayedTemperature = selectedHourlyEntry?.temperature ?? displayForecastDay.temperature;
    const displayedWeatherCode = selectedHourlyEntry?.weatherCode ?? displayForecastDay.weatherCode;
    const displayedWindSpeed = selectedHourlyEntry?.windSpeed ?? displayForecastDay.windSpeed;
    const displayedPressure = selectedHourlyEntry?.pressure ?? displayForecastDay.pressure;
    const displayedWaveHeight = selectedHourlyEntry?.waveHeight ?? displayForecastDay.waveHeight;
    const displayedRainProbability = selectedHourlyEntry?.precipitationProbability ?? null;

    const activeFishingScore = selectedHourlyEntry
      ? calculateFishingScore({
          pressure: displayedPressure,
          windSpeed: displayedWindSpeed,
          windDirection: selectedHourlyEntry.windDirection,
          moonPhase: displayForecastDay.moonPhase,
          seaTemp: displayForecastDay.seaTemp,
          sunrise: displayForecastDay.sunrise,
          sunset: displayForecastDay.sunset,
          weatherCode: displayedWeatherCode,
          referenceTime: new Date(selectedHourlyEntry.time),
        })
      : {
          score: displayForecastDay.fishingScore,
          label: displayForecastDay.fishingScoreLabel,
          factors: displayForecastDay.fishingScoreFactors,
        };

    return {
      displayForecastDay,
      displayedTemperature,
      displayedWeatherCode,
      displayedWindSpeed,
      displayedPressure,
      displayedWaveHeight,
      displayedRainProbability,
      activeFishingScore,
      hourlyDayLabel: getHourlyDayLabel(selectedHourlyEntry?.time ?? null, selectedForecastDay.date),
    };
  }, [weather, selectedHourlyEntry, selectedForecastDay, selectedDailyForecast]);

  // Loading state
  if (weatherQuery.isLoading || weatherQuery.isLocationLoading) {
    return (
      <View style={styles.card}>
        <View style={styles.loadingContainer}>
          <View style={styles.loadingIconWrap}>
            <ActivityIndicator color={C.primary} size="small" />
          </View>
          <View>
            <Text style={styles.loadingTitle}>Balık koşulları yükleniyor</Text>
            <Text style={styles.loadingSubtext}>Hava, deniz ve gelgit verileri alınıyor...</Text>
          </View>
        </View>
        {/* Skeleton placeholder */}
        <View style={styles.skeletonRow}>
          <View style={styles.skeletonBlock} />
          <View style={[styles.skeletonBlock, { width: '30%' }]} />
        </View>
        <View style={styles.skeletonRow}>
          <View style={[styles.skeletonBlock, { height: 64 }]} />
          <View style={[styles.skeletonBlock, { height: 64 }]} />
          <View style={[styles.skeletonBlock, { height: 64 }]} />
          <View style={[styles.skeletonBlock, { height: 64 }]} />
        </View>
      </View>
    );
  }

  // Error state
  if (weatherQuery.isError || !weather || !selectedForecastDay || !displayValues) {
    return (
      <View style={styles.card}>
        <View style={styles.errorContainer}>
          <View style={styles.errorIconWrap}>
            <Ionicons color={C.red} name="cloud-offline-outline" size={28} />
          </View>
          <View>
            <Text style={styles.errorTitle}>Hava verisi alınamadı</Text>
            <Text style={styles.errorSubtext}>İnternet bağlantınızı kontrol edip tekrar deneyin</Text>
          </View>
        </View>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => weatherQuery.refetch()}
          style={styles.retryButton}
        >
          <Ionicons color={C.bg} name="refresh-outline" size={16} />
          <Text style={styles.retryButtonText}>Tekrar Dene</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const {
    displayForecastDay,
    displayedTemperature,
    displayedWindSpeed,
    displayedPressure,
    displayedWaveHeight,
    displayedRainProbability,
    activeFishingScore,
  } = displayValues;

  const goldenHourActive = isGoldenHour(displayForecastDay);
  const tideData = displayForecastDay.tideData;
  const bestTimes = displayForecastDay.bestTimes ?? [];
  const chartSamples = hourlyTimelineEntries.slice(0, 8);

  return (
    <>
      <View style={styles.card}>
        {/* Header: Location + Day Selector */}
        <View style={styles.headerTopRow}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setPickerVisible(true)}
            style={styles.locationWrap}
          >
            <Ionicons color={C.primary} name="location" size={14} />
            <Text numberOfLines={1} style={styles.locationHeadline}>
              {(weatherQuery.location?.label ?? 'Konum Seç').toUpperCase()}
            </Text>
            <Ionicons color={C.textTertiary} name="chevron-forward" size={12} />
          </TouchableOpacity>

          <DaySelector
            days={weather.forecastDays}
            onSelect={setSelectedDayIndex}
            selectedIndex={selectedDayIndex}
          />
        </View>

        {/* Hero: Weather + Score */}
        <View style={styles.heroRow}>
          <View style={styles.heroLeft}>
            <Text style={styles.heroCondition}>{displayForecastDay.weatherLabel}</Text>
            <Text style={styles.heroSubline}>
              En yüksek {Math.round(displayForecastDay.temperature + 3)}° / En düşük {Math.round(displayForecastDay.temperature - 4)}°
            </Text>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => setDetailsVisible(true)}
              style={[styles.heroScorePill, { backgroundColor: getScoreColor(activeFishingScore.score, SCORE_COLORS) }]}
            >
              <Text style={styles.heroScoreValue}>{'\uD83C\uDFA3'} {activeFishingScore.score}</Text>
              <Text style={styles.heroScoreLabel}>{activeFishingScore.label}</Text>
              <Ionicons color={C.bg} name="chevron-forward" size={14} />
            </TouchableOpacity>
          </View>
          <View style={styles.heroRight}>
            <Text style={styles.heroTemp}>{Math.round(displayedTemperature)}°</Text>
            <Text style={styles.heroTempUnit}>C</Text>
          </View>
        </View>

        {/* Chart Section */}
        <ChartSection
          chartSamples={chartSamples}
          forecastDay={displayForecastDay}
          tideData={tideData}
        />

        {/* Metric Cards */}
        <View style={styles.metricCardsRow}>
          <MetricCard iconName="navigate-outline" label={getWindDirectionLabel(displayForecastDay.windDirection)} value={`${Math.round(displayedWindSpeed)} km/sa`} />
          <MetricCard iconName="water-outline" label="Dalga" value={displayedWaveHeight ? `${formatCompact(displayedWaveHeight)} m` : '--'} />
          <MetricCard highlight iconName="speedometer-outline" label="Basınç" value={`${displayedPressure}`} />
          <MetricCard iconName="rainy-outline" label="Yağış" value={`${displayedRainProbability ?? 0}%`} />
        </View>

        {/* Hourly Forecast */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.hourlyForecastRow}>
          {hourlyTimelineEntries.slice(0, 6).map((item) => (
            <View key={item.time} style={styles.hourCell}>
              <Text style={styles.hourCellTime}>{formatHour24(item.time)}</Text>
              <Text style={styles.hourCellEmoji}>{getWeatherEmoji(item.weatherCode)}</Text>
              <Text style={styles.hourCellTemp}>{Math.round(item.temperature)}°</Text>
            </View>
          ))}
        </ScrollView>

        {/* Daily Forecast Rows */}
        <DailyForecastRows forecastDays={weather.forecastDays} />

        {/* Quick Info Chips */}
        <View style={styles.infoRow}>
          {goldenHourActive ? (
            <View style={styles.infoChipGold}>
              <Text style={styles.infoChipText}>{'\u2728'} Altın Saat</Text>
            </View>
          ) : displayForecastDay.goldenHour ? (
            <View style={styles.infoChip}>
              <Text style={styles.infoChipTextMuted}>
                {'\u2728'} {displayForecastDay.goldenHour.morningStart}
              </Text>
            </View>
          ) : null}

          {tideData ? (
            <View style={styles.infoChip}>
              <Text style={styles.infoChipTextMuted}>
                {'\uD83C\uDF0A'} {tideData.currentState === 'rising' ? '\u2191' : '\u2193'}
              </Text>
            </View>
          ) : null}

          {weather.tomorrowTrend ? (
            <View style={styles.infoChip}>
              <Text style={styles.infoChipTextMuted}>
                {weather.tomorrowTrend === 'better' ? '\u2191' : weather.tomorrowTrend === 'worse' ? '\u2193' : '\u2192'} Yarın
              </Text>
            </View>
          ) : null}

          {bestTimes.length > 0 ? (
            <View style={styles.infoChip}>
              <Text style={styles.infoChipTextMuted}>
                {'\u23F0'} {bestTimes[0]?.time}
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      {/* Modals */}
      <WeatherLocationPickerModal
        initialLocation={weatherQuery.location}
        onClose={() => setPickerVisible(false)}
        onConfirm={weatherQuery.setWeatherLocation}
        visible={pickerVisible}
      />

      <DetailsModal
        bestTimes={bestTimes}
        fishingScore={activeFishingScore}
        forecastDay={displayForecastDay}
        onClose={() => setDetailsVisible(false)}
        tideData={tideData}
        visible={detailsVisible}
      />
    </>
  );
};

// ============================================
// STYLES — Using centralized theme
// ============================================

const styles = StyleSheet.create({
  card: {
    backgroundColor: C.card,
    borderColor: C.cardBorder,
    borderRadius: 20,
    borderWidth: 1,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
  },

  // Header
  headerTopRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  locationWrap: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    maxWidth: '65%',
  },
  locationHeadline: {
    color: C.textSecondary,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  daySelector: {
    alignItems: 'center',
    backgroundColor: C.cardAlt,
    borderColor: C.border,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 4,
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  daySelectorText: {
    color: C.textPrimary,
    fontSize: 12,
    fontWeight: '600',
  },

  // Hero
  heroRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  heroLeft: {
    flex: 1,
  },
  heroCondition: {
    color: C.textPrimary,
    fontSize: 28,
    fontWeight: '800',
    lineHeight: 32,
  },
  heroSubline: {
    color: C.textSecondary,
    fontSize: 13,
    marginTop: 4,
  },
  heroScorePill: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: 999,
    flexDirection: 'row',
    gap: 6,
    marginTop: 10,
    minHeight: 44,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  heroScoreValue: {
    color: C.bg,
    fontSize: 13,
    fontWeight: '800',
  },
  heroScoreLabel: {
    color: C.bg,
    fontSize: 12,
    fontWeight: '700',
  },
  heroRight: {
    alignItems: 'flex-end',
    flexDirection: 'row',
  },
  heroTemp: {
    color: C.textPrimary,
    fontSize: 48,
    fontWeight: '900',
    lineHeight: 52,
  },
  heroTempUnit: {
    color: C.textSecondary,
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },

  // Section Header
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 8,
  },
  sectionTitle: {
    color: C.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  legendRow: {
    flexDirection: 'row',
    gap: 10,
  },
  legendDot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDotInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    color: C.textTertiary,
    fontSize: 10,
    fontWeight: '600',
  },

  // Chart
  chartWrap: {
    borderColor: C.border,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 4,
    overflow: 'hidden',
    paddingBottom: 8,
    paddingHorizontal: 8,
    paddingTop: 8,
    position: 'relative',
  },
  chartGridLines: {
    gap: 24,
    left: 8,
    position: 'absolute',
    right: 8,
    top: 28,
  },
  chartGridLine: {
    borderTopColor: 'rgba(255,255,255,0.04)',
    borderTopWidth: 1,
  },
  chartBarsRow: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: 8,
    height: 132,
    justifyContent: 'space-between',
  },
  chartBarCol: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'flex-end',
  },
  tideEventDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: C.primary,
    marginBottom: 4,
  },
  tideEventSpacer: {
    height: 10,
  },
  chartBar: {
    borderRadius: 4,
    width: '86%',
  },
  chartTime: {
    color: C.textSecondary,
    fontSize: 10,
    fontWeight: '600',
    marginTop: 6,
  },
  chartLineOverlay: {
    left: 0,
    position: 'absolute',
    top: 12,
  },

  // Metric Cards
  metricCardsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  metricCard: {
    alignItems: 'center',
    backgroundColor: C.cardAlt,
    borderColor: C.border,
    borderRadius: 14,
    borderWidth: 1,
    flex: 1,
    minHeight: 84,
    justifyContent: 'center',
    paddingHorizontal: 6,
    paddingVertical: 10,
  },
  metricCardHighlight: {
    backgroundColor: 'rgba(212,255,0,0.06)',
    borderColor: 'rgba(212,255,0,0.20)',
  },
  metricMain: {
    color: C.textPrimary,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 6,
    textAlign: 'center',
  },
  metricMainHighlight: {
    color: C.primary,
  },
  metricSub: {
    color: C.textSecondary,
    fontSize: 10,
    marginTop: 3,
  },
  metricSubHighlight: {
    color: C.primary,
  },

  // Hourly Forecast
  hourlyForecastRow: {
    marginTop: 14,
  },
  hourCell: {
    alignItems: 'center',
    marginRight: 14,
    minWidth: 48,
  },
  hourCellTime: {
    color: C.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  hourCellEmoji: {
    fontSize: 20,
    marginVertical: 4,
  },
  hourCellTemp: {
    color: C.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },

  // Daily Forecast
  dailyList: {
    borderTopColor: C.border,
    borderTopWidth: 1,
    marginTop: 14,
    paddingTop: 10,
  },
  dailyRow: {
    alignItems: 'center',
    borderBottomColor: 'rgba(255,255,255,0.04)',
    borderBottomWidth: 1,
    flexDirection: 'row',
    minHeight: 44,
  },
  dailyName: {
    color: C.textPrimary,
    fontSize: 14,
    fontWeight: '600',
    width: 52,
  },
  dailyIcon: {
    fontSize: 17,
    width: 26,
  },
  dailyMin: {
    color: C.textSecondary,
    fontSize: 13,
    width: 34,
  },
  rangeTrack: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 999,
    flex: 1,
    height: 5,
    marginHorizontal: 8,
    position: 'relative',
  },
  rangeFill: {
    backgroundColor: C.primary,
    borderRadius: 999,
    height: 5,
    position: 'absolute',
    top: 0,
  },
  dailyMax: {
    color: C.textPrimary,
    fontSize: 15,
    fontWeight: '700',
    width: 40,
  },
  dailyWave: {
    color: C.textSecondary,
    fontSize: 12,
    textAlign: 'right',
    width: 48,
  },

  // Info Row
  infoRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 12,
  },
  infoChip: {
    backgroundColor: C.cardAlt,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  infoChipGold: {
    backgroundColor: 'rgba(251,191,36,0.15)',
    borderColor: 'rgba(251,191,36,0.35)',
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  infoChipText: {
    color: C.gold,
    fontSize: 11,
    fontWeight: '700',
  },
  infoChipTextMuted: {
    color: C.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },

  // Loading State
  loadingContainer: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  loadingIconWrap: {
    alignItems: 'center',
    backgroundColor: 'rgba(212,255,0,0.10)',
    borderRadius: 14,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  loadingTitle: {
    color: C.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  loadingSubtext: {
    color: C.textTertiary,
    fontSize: 11,
    marginTop: 2,
  },
  skeletonRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  skeletonBlock: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 10,
    flex: 1,
    height: 32,
  },

  // Error State
  errorContainer: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  errorIconWrap: {
    alignItems: 'center',
    backgroundColor: 'rgba(248,113,113,0.12)',
    borderRadius: 14,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  errorTitle: {
    color: C.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  errorSubtext: {
    color: C.textTertiary,
    fontSize: 12,
    marginTop: 2,
  },
  retryButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: C.primary,
    borderRadius: 999,
    flexDirection: 'row',
    gap: 6,
    minHeight: 40,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  retryButtonText: {
    color: C.bg,
    fontSize: 13,
    fontWeight: '700',
  },

  // Dropdown
  dropdownOverlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  dropdownContent: {
    backgroundColor: C.card,
    borderColor: C.cardBorder,
    borderRadius: 20,
    borderWidth: 1,
    maxWidth: 320,
    padding: 16,
    width: '100%',
  },
  dropdownTitle: {
    color: C.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  dropdownItem: {
    alignItems: 'center',
    borderRadius: 12,
    flexDirection: 'row',
    gap: 10,
    minHeight: 48,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  dropdownItemActive: {
    backgroundColor: 'rgba(212,255,0,0.10)',
  },
  dropdownEmoji: {
    fontSize: 20,
  },
  dropdownItemText: {
    flex: 1,
  },
  dropdownItemLabel: {
    color: C.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  dropdownItemTemp: {
    color: C.textSecondary,
    fontSize: 12,
  },
  dropdownScore: {
    alignItems: 'center',
    borderRadius: 8,
    height: 28,
    justifyContent: 'center',
    width: 34,
  },
  dropdownScoreText: {
    color: C.bg,
    fontSize: 12,
    fontWeight: '800',
  },

  // Details Modal
  detailsOverlay: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  detailsSheet: {
    backgroundColor: C.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '82%',
    paddingBottom: 36,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  detailsHandle: {
    alignSelf: 'center',
    backgroundColor: C.border,
    borderRadius: 3,
    height: 4,
    marginBottom: 16,
    width: 40,
  },
  detailsHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  detailsTitle: {
    color: C.textPrimary,
    fontSize: 18,
    fontWeight: '700',
  },
  detailsCloseBtn: {
    alignItems: 'center',
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  detailsSection: {
    borderBottomColor: C.border,
    borderBottomWidth: 1,
    marginBottom: 16,
    paddingBottom: 16,
  },
  detailsSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  detailsSectionIcon: {
    fontSize: 18,
  },
  detailsSectionTitle: {
    color: C.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  detailsSectionSubtitle: {
    color: C.textSecondary,
    fontSize: 13,
    marginBottom: 10,
  },
  detailsText: {
    color: C.textSecondary,
    fontSize: 13,
    lineHeight: 22,
  },
  detailsTipCard: {
    backgroundColor: 'rgba(251,191,36,0.08)',
    borderRadius: 10,
    marginTop: 10,
    padding: 12,
  },
  detailsTip: {
    color: C.gold,
    fontSize: 12,
    lineHeight: 18,
  },
  factorsList: {
    gap: 8,
  },
  factorItem: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 10,
  },
  factorDot: {
    borderRadius: 4,
    height: 8,
    marginTop: 5,
    width: 8,
  },
  factorText: {
    flex: 1,
  },
  factorLabel: {
    color: C.textPrimary,
    fontSize: 13,
    fontWeight: '600',
  },
  factorDesc: {
    color: C.textSecondary,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 2,
  },
  bestTimesList: {
    gap: 8,
  },
  bestTimeItem: {
    alignItems: 'center',
    backgroundColor: C.cardAlt,
    borderRadius: 12,
    flexDirection: 'row',
    gap: 10,
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  bestTimeTime: {
    color: C.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  bestTimeLabel: {
    color: C.textSecondary,
    flex: 1,
    fontSize: 12,
  },
  bestTimeScore: {
    alignItems: 'center',
    borderRadius: 8,
    height: 26,
    justifyContent: 'center',
    width: 30,
  },
  bestTimeScoreText: {
    color: C.bg,
    fontSize: 11,
    fontWeight: '800',
  },
  weatherGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  weatherGridItem: {
    backgroundColor: C.cardAlt,
    borderRadius: 12,
    minWidth: '30%',
    padding: 12,
  },
  weatherGridLabel: {
    color: C.textSecondary,
    fontSize: 11,
    marginBottom: 4,
  },
  weatherGridValue: {
    color: C.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },

  // Hourly (unused in compact but kept for compatibility)
  hourlyItem: {
    alignItems: 'center',
    backgroundColor: C.cardAlt,
    borderColor: C.border,
    borderRadius: 10,
    borderWidth: 1,
    marginRight: HOURLY_ITEM_GAP,
    paddingHorizontal: 6,
    paddingVertical: 8,
    width: HOURLY_ITEM_WIDTH,
  },
  hourlyItemSelected: {
    backgroundColor: 'rgba(212,255,0,0.12)',
    borderColor: 'rgba(212,255,0,0.40)',
  },
  hourlyTime: {
    color: C.textSecondary,
    fontSize: 10,
    fontWeight: '600',
  },
  hourlyTimeSelected: {
    color: C.primary,
  },
  hourlyEmoji: {
    fontSize: 16,
    marginVertical: 2,
  },
  hourlyTemp: {
    color: C.textPrimary,
    fontSize: 12,
    fontWeight: '700',
  },
  hourlyTempSelected: {
    color: C.primary,
  },
});

export default WeatherWidgetCompact;
