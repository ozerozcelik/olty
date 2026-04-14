import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { GlassView } from '@/components/GlassView';
import { TideChart } from '@/components/TideChart';
import { TouchableOpacity } from '@/components/TouchableOpacity';
import { WeatherLocationPickerModal } from '@/components/WeatherLocationPickerModal';
import { useWeather } from '@/hooks/useWeather';
import { T } from '@/lib/theme';
import { calculateFishingScore } from '@/services/weather.service';
import { usePreferencesStore } from '@/stores/usePreferencesStore';
import type {
  DailyForecastItem,
  FishingScoreFactor,
  GoldenHourInfo,
  HourlyForecastDatum,
  TideData,
  WeatherForecastDay,
} from '@/types/app.types';
import {
  formatCompact as formatCompactUtil,
  formatWindSpeed as formatWindSpeedUtil,
  getDefaultHourlyTime,
  getHourlyDayLabel,
  getHourlyEntriesForDay,
  getHourlyIndexFromScroll as getHourlyIndexFromScrollUtil,
  getHourlyLabel,
  getHourlyTimelineEntries,
  getMaxHourlyOffset as getMaxHourlyOffsetUtil,
  getPressureTrendArrow,
  getScoreTone as getScoreToneUtil,
  getWeatherEmoji,
  getWeatherLabel,
  getWindDirectionLabelLong as getWindDirectionLabel,
} from '@/utils/weather';

// Using centralized theme
const COLORS = {
  background: T.bg,
  card: T.glass,
  cardAlt: T.bgCard,
  cardBorder: T.glassBorder,
  primary: T.teal,
  secondary: T.tealBright,
  accent: T.teal,
  textPrimary: T.textPrimary,
  textSecondary: T.textSecondary,
  border: T.glassBorder,
  grid: T.tealGlow,
  green: T.green,
  red: T.red,
  gray: T.textTertiary,
  gold: T.gold,
};

const HOURLY_ITEM_WIDTH = 68;
const HOURLY_ITEM_GAP = 10;
const HOURLY_ITEM_SPAN = HOURLY_ITEM_WIDTH + HOURLY_ITEM_GAP;
const HOURLY_LOGO = require('../../assets/yenilogo.png');

interface ForecastTabProps {
  item: DailyForecastItem;
  isActive: boolean;
  onPress: () => void;
}

interface FactorItemProps {
  factor: FishingScoreFactor;
}

interface MetricRowProps {
  icon: string;
  label: string;
  value: string;
}

interface HourlyStripItemProps {
  item: HourlyForecastDatum;
  isNow: boolean;
  isSelected: boolean;
}

interface TideInfoProps {
  tideData: TideData | null;
}

interface GoldenHourBadgeProps {
  goldenHour: GoldenHourInfo | null;
  onInfoPress?: () => void;
}

interface TomorrowTrendProps {
  trend: 'better' | 'worse' | 'same' | null;
}

const TideInfo = ({ tideData }: TideInfoProps): React.ReactElement | null => {
  if (!tideData) {
    return null;
  }

  const stateEmoji = tideData.currentState === 'rising' ? '📈' : '📉';
  const stateLabel = tideData.currentState === 'rising' ? 'Yükseliyor' : 'Alçalıyor';
  const nextEvent = tideData.nextEvent;
  const hasChartData = tideData.events.length >= 2;

  return (
    <View style={styles.tideInfoCard}>
      <View style={styles.tideHeader}>
        <View style={styles.tideHeaderLeft}>
          <Text style={styles.tideIcon}>🌊</Text>
          <Text style={styles.tideTitle}>Gelgit</Text>
        </View>
        <View style={styles.tideChartBadge}>
          <Ionicons color={COLORS.accent} name="bar-chart-outline" size={14} />
          <Text style={styles.tideChartBadgeText}>{hasChartData ? 'Grafik' : 'Veri az'}</Text>
        </View>
      </View>

      {hasChartData ? <TideChart height={122} tideData={tideData} /> : null}

      <View style={styles.tideContent}>
        <View style={styles.tideCurrentState}>
          <Text style={styles.tideStateEmoji}>{stateEmoji}</Text>
          <Text style={styles.tideStateLabel}>{stateLabel}</Text>
        </View>
        {nextEvent ? (
          <View style={styles.tideNextEvent}>
            <Text style={styles.tideNextLabel}>
              Sonraki {nextEvent.type === 'high' ? 'yüksek' : 'alçak'}:
            </Text>
            <Text style={styles.tideNextTime}>{nextEvent.time}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
};

const GoldenHourBadge = ({ goldenHour, onInfoPress }: GoldenHourBadgeProps): React.ReactElement | null => {
  if (!goldenHour) {
    return null;
  }

  return (
    <View style={[styles.goldenHourCard, goldenHour.isActive && styles.goldenHourActive]}>
      <Text style={styles.goldenHourIcon}>✨</Text>
      <View style={styles.goldenHourContent}>
        <View style={styles.goldenHourTitleRow}>
          <Text style={styles.goldenHourTitle}>
            {goldenHour.isActive ? 'Altın Saat Aktif!' : 'Altın Saat'}
          </Text>
          {onInfoPress ? (
            <TouchableOpacity
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              onPress={onInfoPress}
              style={styles.goldenHourInfoBtn}
            >
              <Ionicons color={COLORS.gold} name="information-circle-outline" size={18} />
            </TouchableOpacity>
          ) : null}
        </View>
        <Text style={styles.goldenHourTimes}>
          🌅 {goldenHour.morningStart}-{goldenHour.morningEnd} | 🌇 {goldenHour.eveningStart}-{goldenHour.eveningEnd}
        </Text>
        {!goldenHour.isActive && goldenHour.nextGoldenHour ? (
          <Text style={styles.goldenHourNext}>
            Sonraki: {goldenHour.nextGoldenHour}
          </Text>
        ) : null}
      </View>
    </View>
  );
};

const TomorrowTrendBadge = ({ trend }: TomorrowTrendProps): React.ReactElement | null => {
  if (!trend) {
    return null;
  }

  const trendConfig = {
    better: { emoji: '📈', text: 'Yarın daha iyi', color: COLORS.green },
    worse: { emoji: '📉', text: 'Yarın daha zor', color: COLORS.red },
    same: { emoji: '➡️', text: 'Yarın benzer', color: COLORS.textSecondary },
  };

  const config = trendConfig[trend];

  return (
    <View style={[styles.trendBadge, { borderColor: config.color }]}>
      <Text style={styles.trendEmoji}>{config.emoji}</Text>
      <Text style={[styles.trendText, { color: config.color }]}>{config.text}</Text>
    </View>
  );
};

const SCORE_COLORS = { green: COLORS.green, gold: COLORS.gold, red: COLORS.red, secondary: COLORS.secondary };

const getScoreTone = (score: number) => getScoreToneUtil(score, SCORE_COLORS);

const getFactorPillStyle = (
  impact: FishingScoreFactor['impact'],
): { backgroundColor: string; color: string } => {
  if (impact === 'positive') {
    return { backgroundColor: 'rgba(76,175,125,0.16)', color: COLORS.green };
  }

  if (impact === 'negative') {
    return { backgroundColor: 'rgba(239,107,107,0.16)', color: COLORS.red };
  }

  return { backgroundColor: COLORS.cardAlt, color: COLORS.gray };
};

const isGoldenHourActive = (day: WeatherForecastDay): boolean =>
  day.fishingScoreFactors.some(
    (factor) => factor.label === 'Altın Saat' && factor.impact === 'positive',
  );

const ForecastTab = ({
  item,
  isActive,
  onPress,
}: ForecastTabProps): JSX.Element => {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={[
        styles.dayPill,
        isActive ? styles.dayPillActive : styles.dayPillInactive,
      ]}
    >
      <Text
        style={[
          styles.dayPillLabel,
          { color: isActive ? T.bg : T.textSecondary },
        ]}
      >
        {item.date}
      </Text>
      <Text style={styles.dayPillEmoji}>{getWeatherEmoji(item.weatherCode)}</Text>
      <Text
        style={[
          styles.dayPillTemp,
          { color: isActive ? T.bg : T.textPrimary },
        ]}
      >
        {item.tempMax}°
      </Text>
    </TouchableOpacity>
  );
};

const MetricRow = ({ icon, label, value }: MetricRowProps): JSX.Element => {
  return (
    <View style={styles.metricPill}>
      <View style={styles.metricPillHeader}>
        <Text style={styles.metricIcon}>{icon}</Text>
        <Text style={styles.metricLabel}>{label}</Text>
      </View>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
};

const FactorItem = ({ factor }: FactorItemProps): JSX.Element => {
  const factorStyle = getFactorPillStyle(factor.impact);

  return (
    <View style={styles.factorItem}>
      <View
        style={[styles.factorDot, { backgroundColor: factorStyle.color }]}
      />
      <View style={styles.factorTextWrap}>
        <Text style={styles.factorLabel}>{factor.label}</Text>
        <Text style={styles.factorDescription}>{factor.description}</Text>
      </View>
    </View>
  );
};

const getHourlyIndexFromScrollLocal = (
  offsetX: number,
  viewportWidth: number,
  itemCount: number,
): number => getHourlyIndexFromScrollUtil(offsetX, viewportWidth, itemCount, HOURLY_ITEM_WIDTH, HOURLY_ITEM_SPAN);

const getMaxHourlyOffsetLocal = (itemCount: number): number =>
  getMaxHourlyOffsetUtil(itemCount, HOURLY_ITEM_SPAN);

const HourlyStripItem = ({
  item,
  isNow,
  isSelected,
}: HourlyStripItemProps): JSX.Element => (
  <View
    style={[
      styles.hourlyItem,
      isSelected ? styles.hourlyItemSelected : null,
    ]}
  >
    <Text style={[styles.hourlyTime, isSelected ? styles.hourlyTimeSelected : null]}>
      {getHourlyLabel(item.time, isNow)}
    </Text>
    <View style={[styles.hourlyMarker, isSelected ? styles.hourlyMarkerSelected : null]} />
  </View>
);

export const WeatherWidget = (): JSX.Element => {
  const weatherQuery = useWeather();
  const windSpeedUnit = usePreferencesStore((state) => state.windSpeedUnit);
  const [pickerVisible, setPickerVisible] = useState<boolean>(false);
  const [expanded, setExpanded] = useState<boolean>(false);
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(0);
  const [selectedHourlyTime, setSelectedHourlyTime] = useState<string | null>(null);
  const [hourlyViewportWidth, setHourlyViewportWidth] = useState<number>(0);
  const [goldenHourInfoVisible, setGoldenHourInfoVisible] = useState<boolean>(false);
  const [metricsInfoVisible, setMetricsInfoVisible] = useState<boolean>(false);
  const badgeScale = useRef<Animated.Value>(new Animated.Value(1)).current;
  const hourlyScrollRef = useRef<ScrollView | null>(null);
  const hourlySelectedIndexRef = useRef<number>(-1);

  useEffect(() => {
    setSelectedDayIndex(0);
    setExpanded(false);
    // Compare length instead of array reference to avoid infinite loop
  }, [weatherQuery.data?.dailyForecast?.length]);

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(badgeScale, {
          toValue: 1.04,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(badgeScale, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
      ]),
    );

    animation.start();

    return () => {
      animation.stop();
    };
  }, [badgeScale]);

  useEffect(() => {
    const weather = weatherQuery.data;

    if (!weather) {
      setSelectedHourlyTime(null);
      return;
    }

    const forecastDay =
      weather.forecastDays[selectedDayIndex] ?? weather.forecastDays[0];

    if (!forecastDay) {
      setSelectedHourlyTime(null);
      return;
    }

    const hourlyEntries = getHourlyEntriesForDay(
      weather.hourlyForecastData,
      forecastDay.date,
    );

    hourlySelectedIndexRef.current = -1;
    setSelectedHourlyTime(
      getDefaultHourlyTime(hourlyEntries, forecastDay.isToday),
    );
  }, [selectedDayIndex, weatherQuery.data]);

  const handleHourlyMomentumEnd = (
    event: NativeSyntheticEvent<NativeScrollEvent>,
    hourlyEntries: HourlyForecastDatum[],
  ): void => {
    const clampedOffset = Math.min(
      event.nativeEvent.contentOffset.x,
      getMaxHourlyOffsetLocal(hourlyEntries.length),
    );
    const index = getHourlyIndexFromScrollLocal(
      clampedOffset,
      hourlyViewportWidth,
      hourlyEntries.length,
    );
    const nextTime = hourlyEntries[index]?.time ?? null;

    if (clampedOffset !== event.nativeEvent.contentOffset.x) {
      hourlyScrollRef.current?.scrollTo({
        x: clampedOffset,
        animated: true,
      });
    }

    if (nextTime) {
      hourlySelectedIndexRef.current = index;
      setSelectedHourlyTime(nextTime);
    }
  };

  const handleHourlyScroll = (
    event: NativeSyntheticEvent<NativeScrollEvent>,
    hourlyEntries: HourlyForecastDatum[],
  ): void => {
    const clampedOffset = Math.min(
      event.nativeEvent.contentOffset.x,
      getMaxHourlyOffsetLocal(hourlyEntries.length),
    );
    const index = getHourlyIndexFromScrollLocal(
      clampedOffset,
      hourlyViewportWidth,
      hourlyEntries.length,
    );
    const nextTime = hourlyEntries[index]?.time ?? null;

    if (nextTime && index !== hourlySelectedIndexRef.current) {
      hourlySelectedIndexRef.current = index;
      setSelectedHourlyTime(nextTime);
    }
  };

  useEffect(() => {
    const weather = weatherQuery.data;

    if (!weather || hourlyViewportWidth === 0) {
      return;
    }

    const forecastDay =
      weather.forecastDays[selectedDayIndex] ?? weather.forecastDays[0];

    if (!forecastDay) {
      return;
    }

    const hourlyEntries = getHourlyTimelineEntries(
      weather.hourlyForecastData,
      forecastDay.date,
      forecastDay.isToday,
    );
    const fallbackTime = getDefaultHourlyTime(
      getHourlyEntriesForDay(weather.hourlyForecastData, forecastDay.date),
      forecastDay.isToday,
    );
    const targetTime = fallbackTime;
    const selectedIndex = hourlyEntries.findIndex(
      (item) => item.time === targetTime,
    );

    if (selectedIndex < 0) {
      return;
    }

    requestAnimationFrame(() => {
      hourlyScrollRef.current?.scrollTo({
        x: selectedIndex * HOURLY_ITEM_SPAN,
        animated: false,
      });
    });
  }, [hourlyViewportWidth, selectedDayIndex, weatherQuery.data]);

  // Memoize expensive computations (hooks must be called before early returns)
  const weather = weatherQuery.data;
  const selectedDailyForecast = weather?.dailyForecast[selectedDayIndex] ?? weather?.dailyForecast[0] ?? null;
  const selectedForecastDay = weather?.forecastDays[selectedDayIndex] ?? weather?.forecastDays[0] ?? null;
  
  const hourlyEntries = useMemo(
    () => weather && selectedForecastDay 
      ? getHourlyEntriesForDay(weather.hourlyForecastData, selectedForecastDay.date)
      : [],
    [weather, selectedForecastDay]
  );
  const hourlyTimelineEntries = useMemo(
    () => weather && selectedForecastDay 
      ? getHourlyTimelineEntries(weather.hourlyForecastData, selectedForecastDay.date, selectedForecastDay.isToday)
      : [],
    [weather, selectedForecastDay]
  );
  const defaultHourlyTime = useMemo(
    () => selectedForecastDay ? getDefaultHourlyTime(hourlyEntries, selectedForecastDay.isToday) : null,
    [hourlyEntries, selectedForecastDay]
  );
  
  const selectedHourlyEntry = useMemo(() => 
    hourlyTimelineEntries.find((item) => item.time === selectedHourlyTime) ??
    hourlyTimelineEntries.find((item) => item.time === defaultHourlyTime) ??
    hourlyTimelineEntries[0] ??
    null,
    [hourlyTimelineEntries, selectedHourlyTime, defaultHourlyTime]
  );
  
  const displayValues = useMemo(() => {
    if (!weather || !selectedForecastDay || !selectedDailyForecast) {
      return null;
    }
    const selectedHourlyDayKey = selectedHourlyEntry?.time.slice(0, 10) ?? selectedForecastDay.date;
    const selectedHourlyDayIndex = weather.forecastDays.findIndex(
      (item) => item.date === selectedHourlyDayKey,
    );
    const displayForecastDay = weather.forecastDays[selectedHourlyDayIndex] ?? selectedForecastDay;
    const displayDailyForecast = weather.dailyForecast[selectedHourlyDayIndex] ?? selectedDailyForecast;
    const forecastIsGoldenHour = isGoldenHourActive(displayForecastDay);
    const displayedTemperature = selectedHourlyEntry?.temperature ?? displayForecastDay.temperature;
    const displayedWeatherCode = selectedHourlyEntry?.weatherCode ?? displayForecastDay.weatherCode;
    const displayedWeatherLabel = selectedHourlyEntry
      ? getWeatherLabel(selectedHourlyEntry.weatherCode)
      : displayForecastDay.weatherLabel;
    const displayedWindSpeed = selectedHourlyEntry?.windSpeed ?? displayForecastDay.windSpeed;
    const displayedWindDirectionLabel = selectedHourlyEntry !== null
      ? getWindDirectionLabel(selectedHourlyEntry.windDirection)
      : displayForecastDay.windDirectionLabel;
    const displayedPressure = selectedHourlyEntry?.pressure ?? displayForecastDay.pressure;
    const displayedPrecipitation = selectedHourlyEntry?.precipitationProbability ?? displayDailyForecast.precipitationProbability;
    const displayedWaveHeight = selectedHourlyEntry?.waveHeight ?? displayForecastDay.waveHeight;
    const selectedTimeLabel = selectedHourlyEntry
      ? new Date(selectedHourlyEntry.time).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
      : displayForecastDay.shortLabel;
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
    const scoreTone = getScoreTone(activeFishingScore.score);

    return {
      displayForecastDay,
      forecastIsGoldenHour,
      displayedTemperature,
      displayedWeatherCode,
      displayedWeatherLabel,
      displayedWindSpeed,
      displayedWindDirectionLabel,
      displayedPressure,
      displayedPrecipitation,
      displayedWaveHeight,
      selectedTimeLabel,
      activeFishingScore,
      scoreTone,
      hourlyDayLabel: getHourlyDayLabel(selectedHourlyEntry?.time ?? null, selectedForecastDay.date),
    };
  }, [weather, selectedHourlyEntry, selectedForecastDay, selectedDailyForecast]);

  // Early returns after all hooks
  if (weatherQuery.isLoading || weatherQuery.isLocationLoading) {
    return (
      <View style={[styles.card, styles.shadowCard, { marginHorizontal: 16, marginBottom: 16 }]}>
        <View style={styles.loadingRow}>
          <View style={styles.loadingIconWrap}>
            <ActivityIndicator color={COLORS.primary} />
          </View>
          <View>
            <Text style={styles.loadingTitle}>Balık hava koşulları yükleniyor</Text>
            <Text style={styles.loadingSubtext}>Veriler hazırlanıyor...</Text>
          </View>
        </View>
      </View>
    );
  }

  if (weatherQuery.isError || !weather) {
    return (
      <View style={[styles.card, styles.shadowCard, { marginHorizontal: 16, marginBottom: 16 }]}>
        <View style={styles.errorRow}>
          <Ionicons color={COLORS.red} name="cloud-offline-outline" size={24} />
          <View style={{ flex: 1 }}>
            <Text style={styles.errorTitle}>Balık Koşulları</Text>
            <Text style={styles.errorText}>Hava ve deniz verisi şu anda alınamadı.</Text>
          </View>
        </View>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => weatherQuery.refetch()}
          style={styles.retryButton}
        >
          <Ionicons color={COLORS.background} name="refresh-outline" size={16} />
          <Text style={styles.retryButtonText}>Tekrar Dene</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!selectedDailyForecast || !selectedForecastDay || !displayValues) {
    return (
      <View style={[styles.card, styles.shadowCard, { marginHorizontal: 16, marginBottom: 16 }]}>
        <Text style={styles.errorTitle}>Balık Koşulları</Text>
        <Text style={styles.errorText}>Tahmin verisi şu anda hazır değil.</Text>
      </View>
    );
  }

  const {
    displayForecastDay,
    forecastIsGoldenHour,
    displayedTemperature,
    displayedWeatherCode,
    displayedWeatherLabel,
    displayedWindSpeed,
    displayedWindDirectionLabel,
    displayedPressure,
    displayedPrecipitation,
    displayedWaveHeight,
    selectedTimeLabel,
    activeFishingScore,
    scoreTone,
    hourlyDayLabel,
  } = displayValues;

  return (
    <>
      <View style={styles.outerWrap}>
        <ScrollView
          horizontal
          contentContainerStyle={styles.forecastTabsScroll}
          showsHorizontalScrollIndicator={false}
        >
          {weather.dailyForecast.map((item, index) => (
            <ForecastTab
              isActive={index === selectedDayIndex}
              item={item}
              key={`${item.date}-${index}`}
              onPress={() => setSelectedDayIndex(index)}
            />
          ))}
        </ScrollView>

        <GlassView borderRadius={22} intensity={18} style={styles.card}>
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.locationName}>{weather.locationLabel}</Text>
              <Text style={styles.locationCoords}>
                {weather.latitude.toFixed(2)}, {weather.longitude.toFixed(2)}
              </Text>
            </View>

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => setPickerVisible(true)}
              style={styles.locationButton}
            >
              <Ionicons color={COLORS.secondary} name="location-outline" size={18} />
            </TouchableOpacity>
          </View>

          <View style={styles.heroRow}>
            <View style={styles.heroLeft}>
              <Text style={styles.heroTemp}>{displayedTemperature}°</Text>
              <View style={styles.heroWeatherRow}>
                <Text style={styles.heroWeatherEmoji}>
                  {getWeatherEmoji(displayedWeatherCode)}
                </Text>
                <Text style={styles.heroWeatherLabel}>
                  {displayedWeatherLabel}
                </Text>
              </View>
            </View>

            <View style={styles.heroRight}>
              <Text style={styles.heroEyebrow}>Balık Skoru</Text>
              <TouchableOpacity
                activeOpacity={0.88}
                onPress={() => setExpanded((current) => !current)}
                style={[
                  styles.scoreBadge,
                  { borderColor: scoreTone.numberColor },
                ]}
              >
                <Text style={[styles.scoreBadgeNumber, { color: scoreTone.numberColor }]}>
                  {activeFishingScore.score.toFixed(1)}
                </Text>
                <Text style={styles.scoreBadgeLabel}>
                  {activeFishingScore.label}
                </Text>
                <Text style={styles.scoreBadgeHint}>
                  {expanded ? 'Detayı gizle' : 'Detayı aç'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {expanded ? (
            <View style={styles.scoreDetailBubble}>
              {activeFishingScore.factors.map((factor, index) => (
                <FactorItem
                  factor={factor}
                  key={`${factor.label}-${factor.description}-${index}`}
                />
              ))}
            </View>
          ) : null}

          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionTitleRow}>
              <Text style={styles.sectionTitle}>Günün Koşulları</Text>
              <TouchableOpacity
                activeOpacity={0.8}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                onPress={() => setMetricsInfoVisible(true)}
                style={styles.metricsInfoBtn}
              >
                <Ionicons color={COLORS.textSecondary} name="information-circle-outline" size={18} />
              </TouchableOpacity>
            </View>
            <View style={styles.sectionTagWrap}>
              <Text style={styles.sectionTag}>{selectedTimeLabel}</Text>
              {displayForecastDay.goldenHour?.isActive ? (
                <Text style={styles.goldenHourCompact}>Altın Saat</Text>
              ) : null}
            </View>
          </View>

          {/* 2x2 Metrics Grid */}
          <View style={styles.metricsGrid}>
            <View style={styles.metricsRow}>
              <MetricRow
                icon="〰️"
                label="DALGA"
                value={
                  displayedWaveHeight !== null
                    ? `${formatCompactUtil(displayedWaveHeight)} m`
                    : '--'
                }
              />
              <MetricRow
                icon="💨"
                label="RÜZGAR"
                value={`${formatWindSpeedUtil(displayedWindSpeed, windSpeedUnit)} ${displayedWindDirectionLabel}`}
              />
            </View>
            <View style={styles.metricsRow}>
              <MetricRow
                icon="🧭"
                label="BASINÇ"
                value={`${displayedPressure} hPa ${getPressureTrendArrow(selectedForecastDay.pressureTrend)}`}
              />
              <MetricRow
                icon="☔"
                label="YAĞIŞ"
                value={`%${displayedPrecipitation}`}
              />
            </View>
          </View>

          {/* Sun/Moon Info Row */}
          <View style={styles.sunMoonRow}>
            <View style={styles.sunMoonChip}>
              <Text style={styles.sunMoonIcon}>{displayForecastDay.moonPhase.emoji}</Text>
              <View>
                <Text style={styles.sunMoonLabel}>Hilal</Text>
                <Text style={styles.sunMoonValue}>{displayForecastDay.moonPhase.label}</Text>
              </View>
            </View>
            <View style={styles.sunMoonChip}>
              <Text style={styles.sunMoonIcon}>🌅</Text>
              <View>
                <Text style={styles.sunMoonLabel}>Doğuş</Text>
                <Text style={styles.sunMoonValue}>{displayForecastDay.sunrise}</Text>
              </View>
            </View>
            <View style={styles.sunMoonChip}>
              <Text style={styles.sunMoonIcon}>🌇</Text>
              <View>
                <Text style={styles.sunMoonLabel}>Batış</Text>
                <Text style={styles.sunMoonValue}>{displayForecastDay.sunset}</Text>
              </View>
            </View>
            {forecastIsGoldenHour ? (
              <Animated.View
                style={[
                  styles.sunMoonChip,
                  styles.goldenChip,
                  { transform: [{ scale: badgeScale }] },
                ]}
              >
                <Text style={styles.sunMoonIcon}>✨</Text>
                <View>
                  <Text style={styles.sunMoonLabel}>Altın saat</Text>
                  <Text style={[styles.sunMoonValue, { color: T.gold }]}>Aktif</Text>
                </View>
              </Animated.View>
            ) : null}
          </View>

          {hourlyTimelineEntries.length ? (
            <View
              onLayout={(event) =>
                setHourlyViewportWidth(event.nativeEvent.layout.width)
              }
              style={styles.hourlySection}
            >
              <View style={styles.hourlySectionHeader}>
                <Text style={styles.hourlySectionTitle}>Saatlik Akış</Text>
                {hourlyDayLabel ? (
                  <View style={styles.hourlyDayBadge}>
                    <Text style={styles.hourlyDayBadgeText}>{hourlyDayLabel}</Text>
                  </View>
                ) : null}
              </View>
              <ScrollView
                horizontal
                decelerationRate="normal"
                onScrollEndDrag={(event) =>
                  handleHourlyMomentumEnd(event, hourlyTimelineEntries)
                }
                onMomentumScrollEnd={(event) =>
                  handleHourlyMomentumEnd(event, hourlyTimelineEntries)
                }
                onScroll={(event) =>
                  handleHourlyScroll(event, hourlyTimelineEntries)
                }
                ref={hourlyScrollRef}
                scrollEventThrottle={16}
                contentContainerStyle={[
                  styles.hourlyStrip,
                  {
                    paddingHorizontal: Math.max(
                      0,
                      (hourlyViewportWidth - HOURLY_ITEM_WIDTH) / 2,
                    ),
                  },
                ]}
                showsHorizontalScrollIndicator={false}
              >
                {hourlyTimelineEntries.map((item) => (
                  <HourlyStripItem
                    isNow={selectedForecastDay.isToday && item.time === defaultHourlyTime}
                    isSelected={item.time === selectedHourlyEntry?.time}
                    item={item}
                    key={item.time}
                  />
                ))}
                <View style={styles.hourlyLogoWrap}>
                  <View style={styles.hourlyLogoSeparator} />
                  <Image
                    contentFit="contain"
                    source={HOURLY_LOGO}
                    style={styles.hourlyLogo}
                  />
                </View>
              </ScrollView>
              <View pointerEvents="none" style={styles.hourlyCenterGuide} />
              <View pointerEvents="none" style={styles.hourlyCenterGuideDot} />
            </View>
          ) : null}

          {/* Tomorrow Trend & Golden Hour */}
          <View style={styles.enhancedSection}>
            <TomorrowTrendBadge trend={weather.tomorrowTrend} />
            <GoldenHourBadge
              goldenHour={displayForecastDay.goldenHour}
              onInfoPress={() => setGoldenHourInfoVisible(true)}
            />
          </View>

          {/* Tide Info */}
          <TideInfo tideData={displayForecastDay.tideData} />

        </GlassView>
      </View>

      <WeatherLocationPickerModal
        initialLocation={weatherQuery.location}
        onClose={() => setPickerVisible(false)}
        onConfirm={weatherQuery.setWeatherLocation}
        visible={pickerVisible}
      />

      {/* Golden Hour Info Modal */}
      <Modal
        animationType="fade"
        transparent
        visible={goldenHourInfoVisible}
        onRequestClose={() => setGoldenHourInfoVisible(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setGoldenHourInfoVisible(false)}
          style={styles.goldenHourModalOverlay}
        >
          <View style={styles.goldenHourModalContent}>
            <View style={styles.goldenHourModalHeader}>
              <Text style={styles.goldenHourModalTitle}>✨ Altın Saat Nedir?</Text>
              <TouchableOpacity onPress={() => setGoldenHourInfoVisible(false)}>
                <Ionicons color={COLORS.textSecondary} name="close" size={24} />
              </TouchableOpacity>
            </View>
            <Text style={styles.goldenHourModalText}>
              Altın saat, gün doğumu ve gün batımı civarındaki zaman dilimlerini ifade eder. 
              Bu saatlerde:
            </Text>
            <View style={styles.goldenHourModalList}>
              <Text style={styles.goldenHourModalListItem}>🐟 Balıklar daha aktif beslenir</Text>
              <Text style={styles.goldenHourModalListItem}>🌡️ Su sıcaklığı idealdir</Text>
              <Text style={styles.goldenHourModalListItem}>💡 Işık açısı balıkları avantajlı kılar</Text>
              <Text style={styles.goldenHourModalListItem}>🎣 Av başarı oranı %30-50 artar</Text>
            </View>
            <Text style={styles.goldenHourModalTip}>
              💡 İpucu: Sabah altın saati genellikle daha verimlidir çünkü balıklar gece 
              boyunca aç kalmıştır.
            </Text>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal
        animationType="fade"
        transparent
        visible={metricsInfoVisible}
        onRequestClose={() => setMetricsInfoVisible(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setMetricsInfoVisible(false)}
          style={styles.goldenHourModalOverlay}
        >
          <View style={styles.goldenHourModalContent}>
            <View style={styles.goldenHourModalHeader}>
              <Text style={styles.goldenHourModalTitle}>ℹ️ Koşullar Nasıl Okunur?</Text>
              <TouchableOpacity onPress={() => setMetricsInfoVisible(false)}>
                <Ionicons color={COLORS.textSecondary} name="close" size={24} />
              </TouchableOpacity>
            </View>
            <View style={styles.goldenHourModalList}>
              <Text style={styles.goldenHourModalListItem}>• Dalga: Düşük dalga çoğu kıyı avında avantaj sağlar.</Text>
              <Text style={styles.goldenHourModalListItem}>• Rüzgar: Yön ve şiddet, su hareketini ve balık davranışını etkiler.</Text>
              <Text style={styles.goldenHourModalListItem}>• Basınç: Ani düşüş/yükseliş balık iştahını değiştirebilir.</Text>
              <Text style={styles.goldenHourModalListItem}>• Yağış: Yüzey aktivitesi ve görüş koşullarını etkiler.</Text>
              <Text style={styles.goldenHourModalListItem}>• Balık skoru: Saatlik koşullara göre anlık av verimi tahmini.</Text>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  outerWrap: {
    paddingHorizontal: 16,
    paddingBottom: 4,
    marginBottom: 2,
  },
  forecastTabsScroll: {
    paddingRight: 4,
    marginBottom: 8,
  },
  shadowCard: {
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 2,
  },
  card: {
    padding: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  locationName: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: '700',
  },
  locationCoords: {
    color: 'rgba(240,247,249,0.45)',
    fontSize: 11,
    marginTop: 2,
  },
  locationButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  heroRow: {
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 16,
  },
  heroLeft: {
    flex: 1,
  },
  heroTemp: {
    color: COLORS.textPrimary,
    fontSize: 44,
    lineHeight: 48,
    fontWeight: '800',
  },
  heroWeatherRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  heroWeatherEmoji: {
    fontSize: 24,
  },
  heroWeatherLabel: {
    color: COLORS.textSecondary,
    fontSize: 15,
    fontWeight: '600',
  },
  heroRight: {
    alignItems: 'flex-end',
    gap: 8,
  },
  heroEyebrow: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  scoreBadge: {
    minWidth: 92,
    borderRadius: 18,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: COLORS.cardAlt,
  },
  scoreBadgeNumber: {
    fontSize: 28,
    lineHeight: 30,
    fontWeight: '800',
  },
  scoreBadgeLabel: {
    color: COLORS.textPrimary,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
  },
  scoreBadgeHint: {
    color: COLORS.textSecondary,
    fontSize: 10,
    fontWeight: '600',
    marginTop: 4,
  },
  scoreDetailBubble: {
    marginTop: 14,
    backgroundColor: COLORS.cardAlt,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    gap: 8,
  },
  dayPill: {
    width: 76,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    marginRight: 10,
  },
  dayPillActive: {
    backgroundColor: T.teal,
    borderColor: T.teal,
  },
  dayPillInactive: {
    backgroundColor: T.glass,
    borderColor: T.glassBorder,
  },
  dayPillLabel: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dayPillEmoji: {
    fontSize: 20,
    marginTop: 6,
  },
  dayPillTemp: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 4,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 10,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metricsInfoBtn: {
    padding: 2,
  },
  sectionTagWrap: {
    alignItems: 'flex-end',
  },
  sectionTitle: {
    color: T.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  sectionTag: {
    color: T.teal,
    fontSize: 11,
    fontWeight: '600',
  },
  goldenHourCompact: {
    color: T.gold,
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
  },
  // 2x2 Metrics Grid
  metricsGrid: {
    gap: 8,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  metricPill: {
    flex: 1,
    backgroundColor: T.glass,
    borderWidth: 1,
    borderColor: T.glassBorder,
    borderRadius: 14,
    padding: 14,
  },
  metricPillHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  metricIcon: {
    fontSize: 14,
  },
  metricLabel: {
    color: T.textTertiary,
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  metricValue: {
    color: T.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  // Sun/Moon Row
  sunMoonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  sunMoonChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: T.glass,
    borderColor: T.glassBorder,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  sunMoonIcon: {
    fontSize: 18,
  },
  sunMoonLabel: {
    color: T.textTertiary,
    fontSize: 9,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sunMoonValue: {
    color: T.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  goldenChip: {
    backgroundColor: T.goldGlass,
    borderColor: 'rgba(240,180,41,0.35)',
  },
  factorItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: COLORS.cardAlt,
    borderColor: COLORS.border,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },
  factorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
  },
  factorTextWrap: {
    flex: 1,
  },
  factorLabel: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  factorDescription: {
    color: COLORS.textSecondary,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 2,
  },
  hourlySection: {
    marginTop: 10,
    position: 'relative',
  },
  hourlySectionTitle: {
    color: T.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  hourlyStrip: {
    paddingRight: 12,
  },
  hourlyItem: {
    width: HOURLY_ITEM_WIDTH,
    marginRight: 10,
    paddingHorizontal: 10,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: T.glassBorder,
    backgroundColor: T.glass,
    alignItems: 'center',
  },
  hourlyItemSelected: {
    backgroundColor: T.tealGlow,
    borderColor: T.teal,
  },
  hourlyTime: {
    color: T.textSecondary,
    fontSize: 11,
    fontWeight: '700',
  },
  hourlyTimeSelected: {
    color: T.teal,
  },
  hourlyMarker: {
    marginTop: 10,
    width: 24,
    height: 3,
    borderRadius: 999,
    backgroundColor: T.glassBorder,
  },
  hourlyMarkerSelected: {
    backgroundColor: T.teal,
  },
  hourlyCenterGuide: {
    position: 'absolute',
    top: 30,
    left: '50%',
    marginLeft: -1,
    width: 2,
    height: 52,
    borderRadius: 999,
    backgroundColor: T.tealDim,
  },
  hourlyCenterGuideDot: {
    position: 'absolute',
    top: 24,
    left: '50%',
    marginLeft: -4,
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: T.teal,
    borderWidth: 1,
    borderColor: 'rgba(248,250,252,0.5)',
  },
  hourlyLogoWrap: {
    width: 224,
    height: 68,
    marginLeft: 16,
    flexDirection: 'row',
    gap: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  hourlyLogoSeparator: {
    width: 1,
    height: 36,
    backgroundColor: T.glassBorder,
  },
  hourlyLogo: {
    width: 176,
    height: 48,
    opacity: 0.92,
  },
  goldenHourBadgeText: {
    color: T.gold,
    fontSize: 13,
    fontWeight: '700',
  },
  celestialRow: {
    marginTop: 16,
    alignItems: 'center',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
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
    color: T.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  loadingSubtext: {
    color: T.textTertiary,
    fontSize: 11,
    marginTop: 2,
  },
  loadingText: {
    color: T.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  errorTitle: {
    color: T.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  errorText: {
    color: T.textSecondary,
    fontSize: 13,
    marginTop: 4,
    lineHeight: 20,
  },
  retryButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: T.teal,
    borderRadius: 999,
    flexDirection: 'row',
    gap: 6,
    minHeight: 40,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  retryButtonText: {
    color: T.bg,
    fontSize: 13,
    fontWeight: '700',
  },
  // Enhanced fishing features styles
  enhancedSection: {
    marginTop: 10,
    gap: 10,
  },
  tideInfoCard: {
    marginTop: 10,
    backgroundColor: T.glass,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: T.glassBorder,
  },
  tideHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  tideHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tideChartBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: T.tealGlow,
  },
  tideChartBadgeText: {
    color: T.teal,
    fontSize: 11,
    fontWeight: '700',
  },
  tideIcon: {
    fontSize: 18,
  },
  tideTitle: {
    color: T.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  tideContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
  },
  tideCurrentState: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tideStateEmoji: {
    fontSize: 16,
  },
  tideStateLabel: {
    color: T.textPrimary,
    fontSize: 13,
    fontWeight: '600',
  },
  tideNextEvent: {
    alignItems: 'flex-end',
  },
  tideNextLabel: {
    color: T.textSecondary,
    fontSize: 11,
  },
  tideNextTime: {
    color: T.teal,
    fontSize: 14,
    fontWeight: '700',
    marginTop: 2,
  },
  goldenHourCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: T.glass,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: T.glassBorder,
    gap: 10,
  },
  goldenHourActive: {
    borderColor: T.gold,
    backgroundColor: T.goldGlass,
  },
  goldenHourIcon: {
    fontSize: 24,
  },
  goldenHourContent: {
    flex: 1,
  },
  goldenHourTitle: {
    color: T.gold,
    fontSize: 14,
    fontWeight: '700',
  },
  goldenHourTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  goldenHourInfoBtn: {
    padding: 2,
  },
  goldenHourTimes: {
    color: T.textSecondary,
    fontSize: 11,
    marginTop: 3,
  },
  goldenHourNext: {
    color: T.textSecondary,
    fontSize: 11,
    marginTop: 3,
    fontStyle: 'italic',
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
    backgroundColor: T.glass,
  },
  trendEmoji: {
    fontSize: 14,
  },
  trendText: {
    fontSize: 12,
    fontWeight: '600',
  },
  hourlySectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  hourlyDayBadge: {
    backgroundColor: T.teal,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  hourlyDayBadgeText: {
    color: T.bg,
    fontSize: 11,
    fontWeight: '700',
  },
  goldenHourModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  goldenHourModalContent: {
    backgroundColor: T.bgCard,
    borderRadius: 20,
    padding: 20,
    maxWidth: 340,
    borderWidth: 1,
    borderColor: T.glassBorder,
  },
  goldenHourModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  goldenHourModalTitle: {
    color: T.gold,
    fontSize: 18,
    fontWeight: '700',
  },
  goldenHourModalText: {
    color: T.textSecondary,
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 12,
  },
  goldenHourModalList: {
    gap: 8,
    marginBottom: 16,
  },
  goldenHourModalListItem: {
    color: T.textPrimary,
    fontSize: 13,
    lineHeight: 20,
  },
  goldenHourModalTip: {
    color: T.gold,
    fontSize: 12,
    lineHeight: 18,
    backgroundColor: T.goldGlass,
    padding: 12,
    borderRadius: 12,
  },
});
