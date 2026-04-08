/**
 * Compact Weather Widget
 * Shows fishing conditions in a condensed format with expandable details
 */

import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { TouchableOpacity } from '@/components/TouchableOpacity';
import { WeatherLocationPickerModal } from '@/components/WeatherLocationPickerModal';
import { useWeather } from '@/hooks/useWeather';
import { calculateFishingScore } from '@/services/weather.service';
import type {
  BestFishingTime,
  FishingScoreFactor,
  HourlyForecastDatum,
  TideData,
  WeatherForecastDay,
} from '@/types/app.types';

// ============================================
// CONSTANTS
// ============================================

const COLORS = {
  background: '#050608',
  card: '#11141A',
  cardAlt: '#171C24',
  cardBorder: 'rgba(255,255,255,0.10)',
  primary: '#D4FF00',
  secondary: '#3B82F6',
  textPrimary: '#FFFFFF',
  textSecondary: '#8B92A5',
  border: 'rgba(255,255,255,0.10)',
  green: '#D4FF00',
  red: '#FB7185',
  gold: '#FBBF24',
};

// Smaller hourly items for compact view
const HOURLY_ITEM_WIDTH = 52;
const HOURLY_ITEM_GAP = 6;
const HOURLY_ITEM_SPAN = HOURLY_ITEM_WIDTH + HOURLY_ITEM_GAP;

// ============================================
// HELPER FUNCTIONS
// ============================================

const getWeatherEmoji = (code: number): string => {
  if (code === 0) return '☀️';
  if (code >= 1 && code <= 3) return '⛅';
  if (code >= 45 && code <= 48) return '🌫️';
  if (code >= 51 && code <= 67) return '🌧️';
  if (code >= 71 && code <= 77) return '❄️';
  if (code >= 80 && code <= 82) return '🌦️';
  if (code >= 95 && code <= 99) return '⛈️';
  return '🌤️';
};

const formatHour24 = (iso: string): string => iso.slice(11, 16);

const getWindDirectionLabel = (degrees: number | null): string => {
  if (degrees === null) return '--';
  const directions = ['K', 'KD', 'D', 'GD', 'G', 'GB', 'B', 'KB'];
  const index = Math.round(degrees / 45) % 8;
  return directions[index] ?? 'K';
};

const getScoreColor = (score: number): string => {
  if (score >= 75) return COLORS.green;
  if (score >= 50) return COLORS.gold;
  return COLORS.red;
};

// Reserved for future use (score badge tooltip)
// const getScoreLabel = (score: number): string => {
//   if (score >= 80) return 'Mükemmel';
//   if (score >= 60) return 'İyi';
//   if (score >= 40) return 'Orta';
//   return 'Zor';
// };

const formatCompact = (value: number | null, decimals = 1): string => {
  if (value === null) return '--';
  return value.toFixed(decimals);
};

const getHourlyEntriesForDay = (
  hourlyData: HourlyForecastDatum[],
  date: string,
): HourlyForecastDatum[] => {
  return hourlyData.filter((item) => item.time.startsWith(date));
};

const getHourlyTimelineEntries = (
  hourlyData: HourlyForecastDatum[],
  date: string,
  isToday: boolean,
): HourlyForecastDatum[] => {
  const startIndex = hourlyData.findIndex((item) => item.time.startsWith(date));
  if (startIndex === -1) return [];

  if (isToday) {
    const now = Date.now();
    const currentIndex = hourlyData.findIndex(
      (item) => new Date(item.time).getTime() >= now - 30 * 60 * 1000,
    );
    const effectiveStart = currentIndex >= 0 ? Math.max(startIndex, currentIndex - 1) : startIndex;
    return hourlyData.slice(effectiveStart, effectiveStart + 24);
  }

  return hourlyData.slice(startIndex, startIndex + 24);
};

const getDefaultHourlyTime = (
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

  const noonEntry = hourlyEntries.find((item) => item.time.slice(11, 16) === '12:00');
  if (noonEntry) return noonEntry.time;

  return hourlyEntries[0]?.time ?? null;
};

const getHourlyIndexFromScroll = (
  offsetX: number,
  viewportWidth: number,
  itemCount: number,
): number => {
  if (itemCount <= 0 || viewportWidth <= 0) return 0;
  const sidePadding = Math.max(0, (viewportWidth - HOURLY_ITEM_WIDTH) / 2);
  const centeredPosition = offsetX + viewportWidth / 2 - sidePadding - HOURLY_ITEM_WIDTH / 2;
  return Math.max(0, Math.min(itemCount - 1, Math.round(centeredPosition / HOURLY_ITEM_SPAN)));
};

const getMaxHourlyOffset = (itemCount: number): number =>
  Math.max(0, (itemCount - 1) * HOURLY_ITEM_SPAN);

const getHourlyDayLabel = (hourlyTime: string | null, selectedDate: string): string => {
  if (!hourlyTime) return '';
  const hourlyDate = hourlyTime.slice(0, 10);
  if (hourlyDate === selectedDate) return '';
  const today = new Date().toISOString().slice(0, 10);
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  if (hourlyDate === today) return 'Bugün';
  if (hourlyDate === tomorrow) return 'Yarın';
  const date = new Date(hourlyDate);
  return date.toLocaleDateString('tr-TR', { weekday: 'short', day: 'numeric' });
};

const isGoldenHour = (forecastDay: WeatherForecastDay): boolean => {
  return forecastDay.goldenHour?.isActive ?? false;
};

// ============================================
// SUB-COMPONENTS
// ============================================

interface CompactHourlyItemProps {
  item: HourlyForecastDatum;
  isNow: boolean;
  isSelected: boolean;
}

const CompactHourlyItem = ({ item, isNow, isSelected }: CompactHourlyItemProps): JSX.Element => (
  <View style={[styles.hourlyItem, isSelected && styles.hourlyItemSelected]}>
    <Text style={[styles.hourlyTime, isSelected && styles.hourlyTimeSelected]}>
      {isNow ? 'Şimdi' : item.time.slice(11, 16)}
    </Text>
    <Text style={styles.hourlyEmoji}>{getWeatherEmoji(item.weatherCode)}</Text>
    <Text style={[styles.hourlyTemp, isSelected && styles.hourlyTempSelected]}>
      {Math.round(item.temperature)}°
    </Text>
  </View>
);

interface DaySelectorProps {
  days: WeatherForecastDay[];
  selectedIndex: number;
  onSelect: (index: number) => void;
}

const DaySelector = ({ days, selectedIndex, onSelect }: DaySelectorProps): JSX.Element => {
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
        <Ionicons color={COLORS.textSecondary} name="chevron-down" size={14} />
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
                <View style={[styles.dropdownScore, { backgroundColor: getScoreColor(day.fishingScore) }]}>
                  <Text style={styles.dropdownScoreText}>{day.fishingScore}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

interface MetricChipProps {
  icon: string;
  value: string;
  highlight?: boolean;
}

const MetricChip = ({ icon, value, highlight }: MetricChipProps): JSX.Element => (
  <View style={[styles.metricChip, highlight && styles.metricChipHighlight]}>
    <Text style={styles.metricIcon}>{icon}</Text>
    <Text style={[styles.metricValue, highlight && styles.metricValueHighlight]}>{value}</Text>
  </View>
);

interface DetailsModalProps {
  visible: boolean;
  onClose: () => void;
  forecastDay: WeatherForecastDay | null;
  fishingScore: { score: number; label: string; factors: FishingScoreFactor[] };
  tideData: TideData | null;
  bestTimes: BestFishingTime[];
}

const DetailsModal = ({
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
          <TouchableOpacity onPress={onClose}>
            <Ionicons color={COLORS.textSecondary} name="close" size={24} />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Fishing Score Section */}
          <View style={styles.detailsSection}>
            <Text style={styles.detailsSectionTitle}>🎣 Balık Skoru: {fishingScore.score}</Text>
            <Text style={styles.detailsSectionSubtitle}>{fishingScore.label}</Text>
            <View style={styles.factorsList}>
              {fishingScore.factors.map((factor, idx) => (
                <View key={idx} style={styles.factorItem}>
                  <View style={[styles.factorDot, { backgroundColor: factor.impact === 'positive' ? COLORS.green : factor.impact === 'negative' ? COLORS.red : COLORS.gold }]} />
                  <View style={styles.factorText}>
                    <Text style={styles.factorLabel}>{factor.label}</Text>
                    <Text style={styles.factorDesc}>{factor.description}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* Golden Hour Section */}
          {forecastDay?.goldenHour ? (
            <View style={styles.detailsSection}>
              <Text style={styles.detailsSectionTitle}>✨ Altın Saat</Text>
              <Text style={styles.detailsText}>
                Sabah: {forecastDay.goldenHour.morningStart} - {forecastDay.goldenHour.morningEnd}
              </Text>
              <Text style={styles.detailsText}>
                Akşam: {forecastDay.goldenHour.eveningStart} - {forecastDay.goldenHour.eveningEnd}
              </Text>
              <Text style={styles.detailsTip}>
                💡 Gün doğumu ve batımı civarında balıklar daha aktif beslenir.
              </Text>
            </View>
          ) : null}

          {/* Tide Section */}
          {tideData ? (
            <View style={styles.detailsSection}>
              <Text style={styles.detailsSectionTitle}>🌊 Gelgit Durumu</Text>
              <Text style={styles.detailsText}>
                {tideData.currentState === 'rising' ? '📈 Yükseliyor' : '📉 Alçalıyor'}
              </Text>
              {tideData.nextEvent ? (
                <Text style={styles.detailsText}>
                  Sonraki {tideData.nextEvent.type === 'high' ? 'yüksek' : 'alçak'}: {tideData.nextEvent.time}
                </Text>
              ) : null}
            </View>
          ) : null}

          {/* Best Times Section */}
          {bestTimes.length > 0 ? (
            <View style={styles.detailsSection}>
              <Text style={styles.detailsSectionTitle}>⏰ En İyi Saatler</Text>
              <View style={styles.bestTimesList}>
                {bestTimes.map((time, idx) => (
                  <View key={idx} style={styles.bestTimeItem}>
                    <Text style={styles.bestTimeTime}>{time.time}</Text>
                    <Text style={styles.bestTimeLabel}>{time.label}</Text>
                    <View style={[styles.bestTimeScore, { backgroundColor: getScoreColor(time.score) }]}>
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
              <Text style={styles.detailsSectionTitle}>🌡️ Hava Detayları</Text>
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
);

// ============================================
// MAIN COMPONENT
// ============================================

export const WeatherWidgetCompact = (): JSX.Element => {
  const weatherQuery = useWeather();
  const [pickerVisible, setPickerVisible] = useState(false);
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [selectedHourlyTime, setSelectedHourlyTime] = useState<string | null>(null);
  const [hourlyViewportWidth, setHourlyViewportWidth] = useState(0);
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
      ? getHourlyTimelineEntries(weather.hourlyForecastData, selectedForecastDay.date, selectedForecastDay.isToday)
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

  const handleHourlyScroll = (event: NativeSyntheticEvent<NativeScrollEvent>): void => {
    const clampedOffset = Math.min(
      event.nativeEvent.contentOffset.x,
      getMaxHourlyOffset(hourlyTimelineEntries.length),
    );
    const index = getHourlyIndexFromScroll(clampedOffset, hourlyViewportWidth, hourlyTimelineEntries.length);
    const nextTime = hourlyTimelineEntries[index]?.time ?? null;

    if (nextTime && index !== hourlySelectedIndexRef.current) {
      hourlySelectedIndexRef.current = index;
      setSelectedHourlyTime(nextTime);
    }
  };

  const handleHourlyMomentumEnd = (event: NativeSyntheticEvent<NativeScrollEvent>): void => {
    const clampedOffset = Math.min(
      event.nativeEvent.contentOffset.x,
      getMaxHourlyOffset(hourlyTimelineEntries.length),
    );
    const index = getHourlyIndexFromScroll(clampedOffset, hourlyViewportWidth, hourlyTimelineEntries.length);
    const nextTime = hourlyTimelineEntries[index]?.time ?? null;

    if (clampedOffset !== event.nativeEvent.contentOffset.x) {
      hourlyScrollRef.current?.scrollTo({ x: clampedOffset, animated: true });
    }

    if (nextTime) {
      hourlySelectedIndexRef.current = index;
      setSelectedHourlyTime(nextTime);
    }
  };

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
        <View style={styles.loadingRow}>
          <ActivityIndicator color={COLORS.primary} size="small" />
          <Text style={styles.loadingText}>Yükleniyor...</Text>
        </View>
      </View>
    );
  }

  // Error state
  if (weatherQuery.isError || !weather || !selectedForecastDay || !displayValues) {
    return (
      <View style={styles.card}>
        <Text style={styles.errorText}>Hava verisi alınamadı</Text>
      </View>
    );
  }

  const {
    displayForecastDay,
    displayedTemperature,
    displayedWeatherCode,
    displayedWindSpeed,
    displayedPressure,
    displayedWaveHeight,
    displayedRainProbability,
    activeFishingScore,
    hourlyDayLabel,
  } = displayValues;

  const goldenHourActive = isGoldenHour(displayForecastDay);
  const tideData = displayForecastDay.tideData;
  const bestTimes = displayForecastDay.bestTimes ?? [];
  const chartSamples = hourlyTimelineEntries.slice(0, 6);
  const chartTemps = chartSamples.map((item) => item.temperature);
  const chartMaxTemp = Math.max(...chartTemps, 1);
  const chartMinTemp = Math.min(...chartTemps, 0);
  const chartHeight = 110;
  const chartWidth = 308;
  const yRange = Math.max(1, chartMaxTemp - chartMinTemp);

  const chartPoints = chartSamples.map((item, index) => {
    const x = (index * (chartWidth - 16)) / Math.max(1, chartSamples.length - 1) + 8;
    const y = 10 + (1 - (item.temperature - chartMinTemp) / yRange) * (chartHeight - 22);

    return { x, y, item };
  });

  const chartPath = chartPoints
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ');

  const forecastRows = weather.forecastDays.slice(0, 3);
  const minForRows = Math.min(...forecastRows.map((row) => row.temperature - 4));
  const maxForRows = Math.max(...forecastRows.map((row) => row.temperature + 4));
  const rowSpan = Math.max(1, maxForRows - minForRows);

  return (
    <>
      <View style={styles.card}>
        <View style={styles.headerTopRow}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setPickerVisible(true)}
            style={styles.locationWrap}
          >
            <Ionicons color={COLORS.textSecondary} name="location" size={14} />
            <Text numberOfLines={1} style={styles.locationHeadline}>
              {(weatherQuery.location?.label ?? 'Konum Seç').toUpperCase()}
            </Text>
          </TouchableOpacity>

          <DaySelector
            days={weather.forecastDays}
            onSelect={setSelectedDayIndex}
            selectedIndex={selectedDayIndex}
          />
        </View>

        <View style={styles.heroRow}>
          <View style={styles.heroLeft}>
            <Text style={styles.heroCondition}>{displayForecastDay.weatherLabel}</Text>
            <Text style={styles.heroSubline}>
              En yüksek {Math.round(displayForecastDay.temperature + 3)}°  En düşük {Math.round(displayForecastDay.temperature - 4)}°
            </Text>
          </View>
          <View style={styles.heroRight}>
            <Text style={styles.heroTemp}>{Math.round(displayedTemperature)}°C</Text>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Zamana Göre Koşullar</Text>
          <View style={styles.legendRow}>
            <Text style={styles.legendItem}>● Gelgit</Text>
            <Text style={[styles.legendItem, styles.legendSafe]}>● Uygun Dalga</Text>
            <Text style={[styles.legendItem, styles.legendHigh]}>● Yüksek Dalga</Text>
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
              const rain = sample.precipitationProbability ?? 0;
              const wave = sample.waveHeight ?? 0;
              const barHeight = Math.max(26, (rain / 100) * 96);
              const barColor = wave >= 1.5
                ? 'rgba(255,85,0,0.28)'
                : wave >= 0.8
                  ? 'rgba(120,170,255,0.20)'
                  : 'rgba(212,255,0,0.24)';

              return (
                <View key={sample.time} style={styles.chartBarCol}>
                  <View style={[styles.chartBar, { backgroundColor: barColor, height: barHeight }]} />
                  <Text style={styles.chartTime}>{formatHour24(sample.time)}</Text>
                </View>
              );
            })}
          </View>

          {chartPoints.length > 1 ? (
            <Svg height={chartHeight} pointerEvents="none" style={styles.chartLineOverlay} width={chartWidth}>
              <Path d={chartPath} fill="none" stroke={COLORS.textPrimary} strokeWidth={2.6} />
              {chartPoints.map((point) => (
                <Circle
                  cx={point.x}
                  cy={point.y}
                  fill={COLORS.card}
                  key={point.item.time}
                  r={3.5}
                  stroke={COLORS.textPrimary}
                  strokeWidth={2}
                />
              ))}
            </Svg>
          ) : null}
        </View>

        <View style={styles.metricCardsRow}>
          <View style={styles.metricCard}>
            <Ionicons color={COLORS.secondary} name="navigate-outline" size={18} />
            <Text style={styles.metricMain}>{Math.round(displayedWindSpeed)} km/sa</Text>
            <Text style={styles.metricSub}>{getWindDirectionLabel(displayForecastDay.windDirection)}</Text>
          </View>
          <View style={styles.metricCard}>
            <Ionicons color={COLORS.secondary} name="water-outline" size={18} />
            <Text style={styles.metricMain}>{displayedWaveHeight ? `${formatCompact(displayedWaveHeight)} m` : '--'}</Text>
            <Text style={styles.metricSub}>Dalga</Text>
          </View>
          <View style={styles.metricCard}>
            <Ionicons color={COLORS.secondary} name="speedometer-outline" size={18} />
            <Text style={styles.metricMain}>{displayedPressure} hPa</Text>
            <Text style={[styles.metricSub, { color: COLORS.primary }]}>Basınç</Text>
          </View>
          <View style={styles.metricCard}>
            <Ionicons color={COLORS.secondary} name="rainy-outline" size={18} />
            <Text style={styles.metricMain}>{displayedRainProbability ?? 0}%</Text>
            <Text style={styles.metricSub}>Yağış</Text>
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.hourlyForecastRow}>
          {hourlyTimelineEntries.slice(0, 6).map((item) => (
            <View key={item.time} style={styles.hourCell}>
              <Text style={styles.hourCellTime}>{formatHour24(item.time)}</Text>
              <Text style={styles.hourCellEmoji}>{getWeatherEmoji(item.weatherCode)}</Text>
              <Text style={styles.hourCellTemp}>{Math.round(item.temperature)}°</Text>
            </View>
          ))}
        </ScrollView>

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

        {/* Row 4: Quick Info Chips */}
        <View style={styles.infoRow}>
          {goldenHourActive ? (
            <View style={styles.infoChipGold}>
              <Text style={styles.infoChipText}>✨ Altın Saat</Text>
            </View>
          ) : displayForecastDay.goldenHour ? (
            <View style={styles.infoChip}>
              <Text style={styles.infoChipTextMuted}>
                ✨ {displayForecastDay.goldenHour.morningStart}
              </Text>
            </View>
          ) : null}

          {tideData ? (
            <View style={styles.infoChip}>
              <Text style={styles.infoChipTextMuted}>
                🌊 {tideData.currentState === 'rising' ? '↑' : '↓'}
              </Text>
            </View>
          ) : null}

          {weather.tomorrowTrend ? (
            <View style={styles.infoChip}>
              <Text style={styles.infoChipTextMuted}>
                {weather.tomorrowTrend === 'better' ? '📈' : weather.tomorrowTrend === 'worse' ? '📉' : '➡️'} Yarın
              </Text>
            </View>
          ) : null}

          {bestTimes.length > 0 ? (
            <View style={styles.infoChip}>
              <Text style={styles.infoChipTextMuted}>
                ⏰ {bestTimes[0]?.time}
              </Text>
            </View>
          ) : null}
        </View>

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => setDetailsVisible(true)}
          style={styles.detailsBtn}
        >
          <Ionicons color={COLORS.secondary} name="information-circle-outline" size={16} />
          <Text style={styles.detailsBtnText}>Detayları Gör</Text>
        </TouchableOpacity>
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
// STYLES
// ============================================

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,
    borderColor: COLORS.cardBorder,
    borderRadius: 16,
    borderWidth: 1,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 14,
  },

  headerTopRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  locationWrap: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    maxWidth: '68%',
  },
  locationHeadline: {
    color: COLORS.textSecondary,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1,
  },
  heroRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  heroLeft: {
    flex: 1,
  },
  heroCondition: {
    color: COLORS.textPrimary,
    fontSize: 32,
    fontWeight: '800',
    lineHeight: 36,
  },
  heroSubline: {
    color: COLORS.textSecondary,
    fontSize: 16,
    marginTop: 6,
  },
  heroRight: {
    alignItems: 'flex-end',
  },
  heroTemp: {
    color: COLORS.textPrimary,
    fontSize: 44,
    fontWeight: '900',
    lineHeight: 48,
  },
  sectionHeader: {
    marginTop: 6,
  },
  sectionTitle: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  legendRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  legendItem: {
    color: COLORS.textSecondary,
    fontSize: 11,
  },
  legendSafe: {
    color: '#A7E07A',
  },
  legendHigh: {
    color: '#FFB1B9',
  },
  chartWrap: {
    borderColor: COLORS.border,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 10,
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
    borderTopColor: 'rgba(255,255,255,0.06)',
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
  chartBar: {
    borderRadius: 4,
    width: '86%',
  },
  chartTime: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '600',
    marginTop: 6,
  },
  chartLineOverlay: {
    left: 0,
    position: 'absolute',
    top: 12,
  },
  metricCardsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  metricCard: {
    alignItems: 'center',
    backgroundColor: COLORS.cardAlt,
    borderColor: COLORS.border,
    borderRadius: 12,
    borderWidth: 1,
    flex: 1,
    minHeight: 84,
    justifyContent: 'center',
    paddingHorizontal: 6,
    paddingVertical: 8,
  },
  metricMain: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 8,
    textAlign: 'center',
  },
  metricSub: {
    color: COLORS.textSecondary,
    fontSize: 11,
    marginTop: 3,
  },
  hourlyForecastRow: {
    marginTop: 12,
  },
  hourCell: {
    alignItems: 'center',
    marginRight: 14,
    width: 52,
  },
  hourCellTime: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  hourCellEmoji: {
    fontSize: 20,
    marginVertical: 3,
  },
  hourCellTemp: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: '700',
  },
  dailyList: {
    borderTopColor: COLORS.border,
    borderTopWidth: 1,
    marginTop: 12,
    paddingTop: 8,
  },
  dailyRow: {
    alignItems: 'center',
    borderBottomColor: 'rgba(255,255,255,0.06)',
    borderBottomWidth: 1,
    flexDirection: 'row',
    minHeight: 42,
  },
  dailyName: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '600',
    width: 52,
  },
  dailyIcon: {
    fontSize: 17,
    width: 26,
  },
  dailyMin: {
    color: COLORS.textSecondary,
    fontSize: 14,
    width: 34,
  },
  rangeTrack: {
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderRadius: 999,
    flex: 1,
    height: 6,
    marginHorizontal: 8,
    position: 'relative',
  },
  rangeFill: {
    backgroundColor: COLORS.textPrimary,
    borderRadius: 999,
    height: 6,
    position: 'absolute',
    top: 0,
  },
  dailyMax: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    width: 40,
  },
  dailyWave: {
    color: COLORS.textSecondary,
    fontSize: 13,
    textAlign: 'right',
    width: 48,
  },

  // Header Row
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  locationBtn: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: 4,
  },
  locationText: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '600',
  },
  daySelector: {
    alignItems: 'center',
    backgroundColor: COLORS.cardAlt,
    borderRadius: 8,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  daySelectorText: {
    color: COLORS.textPrimary,
    fontSize: 12,
    fontWeight: '600',
  },
  scoreBadge: {
    alignItems: 'center',
    borderRadius: 10,
    flexDirection: 'row',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  scoreIcon: {
    fontSize: 12,
  },
  scoreValue: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },

  // Metrics Row
  metricsRow: {
    borderBottomColor: COLORS.border,
    borderBottomWidth: 1,
    borderTopColor: COLORS.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'space-between',
    marginTop: 10,
    paddingVertical: 10,
  },
  metricChip: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: 3,
    justifyContent: 'center',
  },
  metricChipHighlight: {
    backgroundColor: 'rgba(251,191,36,0.15)',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  metricIcon: {
    fontSize: 12,
  },
  metricValue: {
    color: COLORS.textPrimary,
    fontSize: 12,
    fontWeight: '600',
  },
  metricValueHighlight: {
    color: COLORS.gold,
  },

  // Hourly Section
  hourlySection: {
    marginTop: 10,
    position: 'relative',
  },
  hourlyHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  hourlyTitle: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  hourlyDayBadge: {
    backgroundColor: COLORS.secondary,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  hourlyDayText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  hourlyStrip: {
    paddingRight: 8,
  },
  hourlyItem: {
    alignItems: 'center',
    backgroundColor: COLORS.cardAlt,
    borderColor: COLORS.border,
    borderRadius: 10,
    borderWidth: 1,
    marginRight: HOURLY_ITEM_GAP,
    paddingHorizontal: 6,
    paddingVertical: 8,
    width: HOURLY_ITEM_WIDTH,
  },
  hourlyItemSelected: {
    backgroundColor: 'rgba(59,130,246,0.2)',
    borderColor: 'rgba(59,130,246,0.5)',
  },
  hourlyTime: {
    color: COLORS.textSecondary,
    fontSize: 10,
    fontWeight: '600',
  },
  hourlyTimeSelected: {
    color: COLORS.secondary,
  },
  hourlyEmoji: {
    fontSize: 16,
    marginVertical: 2,
  },
  hourlyTemp: {
    color: COLORS.textPrimary,
    fontSize: 12,
    fontWeight: '700',
  },
  hourlyTempSelected: {
    color: COLORS.secondary,
  },
  hourlyCenterGuide: {
    backgroundColor: 'rgba(59,130,246,0.4)',
    borderRadius: 2,
    bottom: 0,
    left: '50%',
    marginLeft: -1,
    position: 'absolute',
    top: 20,
    width: 2,
  },

  // Info Row
  infoRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  infoChip: {
    backgroundColor: COLORS.cardAlt,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  infoChipGold: {
    backgroundColor: 'rgba(251,191,36,0.2)',
    borderColor: 'rgba(251,191,36,0.4)',
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  infoChipText: {
    color: COLORS.gold,
    fontSize: 11,
    fontWeight: '700',
  },
  infoChipTextMuted: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },

  // Details Button
  detailsBtn: {
    alignItems: 'center',
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 4,
    marginTop: 10,
    paddingVertical: 4,
  },
  detailsBtnText: {
    color: COLORS.secondary,
    fontSize: 12,
    fontWeight: '600',
  },

  // Loading/Error
  loadingRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    paddingVertical: 8,
  },
  loadingText: {
    color: COLORS.textSecondary,
    fontSize: 13,
  },
  errorText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    textAlign: 'center',
  },

  // Day Selector Dropdown
  dropdownOverlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  dropdownContent: {
    backgroundColor: COLORS.card,
    borderColor: COLORS.cardBorder,
    borderRadius: 16,
    borderWidth: 1,
    maxWidth: 300,
    padding: 16,
    width: '100%',
  },
  dropdownTitle: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  dropdownItem: {
    alignItems: 'center',
    borderRadius: 10,
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  dropdownItemActive: {
    backgroundColor: 'rgba(59,130,246,0.15)',
  },
  dropdownEmoji: {
    fontSize: 20,
  },
  dropdownItemText: {
    flex: 1,
  },
  dropdownItemLabel: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  dropdownItemTemp: {
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  dropdownScore: {
    alignItems: 'center',
    borderRadius: 8,
    height: 26,
    justifyContent: 'center',
    width: 32,
  },
  dropdownScoreText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },

  // Details Modal
  detailsOverlay: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  detailsSheet: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    paddingBottom: 32,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  detailsHandle: {
    alignSelf: 'center',
    backgroundColor: COLORS.border,
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
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: '700',
  },
  detailsSection: {
    borderBottomColor: COLORS.border,
    borderBottomWidth: 1,
    marginBottom: 16,
    paddingBottom: 16,
  },
  detailsSectionTitle: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 8,
  },
  detailsSectionSubtitle: {
    color: COLORS.textSecondary,
    fontSize: 13,
    marginBottom: 10,
  },
  detailsText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    lineHeight: 20,
  },
  detailsTip: {
    backgroundColor: 'rgba(251,191,36,0.1)',
    borderRadius: 8,
    color: COLORS.gold,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 10,
    padding: 10,
  },

  // Factors List
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
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '600',
  },
  factorDesc: {
    color: COLORS.textSecondary,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 2,
  },

  // Best Times
  bestTimesList: {
    gap: 8,
  },
  bestTimeItem: {
    alignItems: 'center',
    backgroundColor: COLORS.cardAlt,
    borderRadius: 10,
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  bestTimeTime: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  bestTimeLabel: {
    color: COLORS.textSecondary,
    flex: 1,
    fontSize: 12,
  },
  bestTimeScore: {
    alignItems: 'center',
    borderRadius: 8,
    height: 24,
    justifyContent: 'center',
    width: 28,
  },
  bestTimeScoreText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },

  // Weather Grid
  weatherGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  weatherGridItem: {
    backgroundColor: COLORS.cardAlt,
    borderRadius: 10,
    minWidth: '30%',
    padding: 10,
  },
  weatherGridLabel: {
    color: COLORS.textSecondary,
    fontSize: 11,
    marginBottom: 4,
  },
  weatherGridValue: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
});

export default WeatherWidgetCompact;
