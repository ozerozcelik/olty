import * as Location from 'expo-location';

import { publicEnv } from '@/lib/env';
import { captureError } from '@/lib/sentry';
import type {
  BestFishingTime,
  DailyForecastItem,
  FishingScoreFactor,
  GoldenHourInfo,
  HourlyForecastDatum,
  HourlyWaveDatum,
  SpeciesRecommendation,
  TideData,
  TideEvent,
  WeatherData,
  WeatherForecastDay,
} from '@/types/app.types';

interface ForecastApiResponse {
  current?: {
    temperature_2m?: number;
    windspeed_10m?: number;
    wind_speed_10m?: number;
    winddirection_10m?: number;
    wind_direction_10m?: number;
    surface_pressure?: number;
    relativehumidity_2m?: number;
    relative_humidity_2m?: number;
    weathercode?: number;
    weather_code?: number;
    uv_index?: number;
  };
  hourly?: {
    time?: string[];
    temperature_2m?: number[];
    wind_speed_10m?: number[];
    wind_direction_10m?: number[];
    surface_pressure?: number[];
    relative_humidity_2m?: number[];
    precipitation_probability?: number[];
    weather_code?: number[];
    uv_index?: number[];
  };
  daily?: {
    time?: string[];
    weathercode?: number[];
    temperature_2m_max?: number[];
    temperature_2m_min?: number[];
    precipitation_probability_max?: number[];
    sunrise?: string[];
    sunset?: string[];
    uv_index_max?: number[];
  };
}

interface MarineApiResponse {
  current?: {
    wave_height?: number | null;
    wave_direction?: number | null;
    sea_surface_temperature?: number | null;
  };
  hourly?: {
    time?: string[];
    wave_height?: (number | null)[];
    wave_direction?: (number | null)[];
    wave_period?: (number | null)[];
    sea_surface_temperature?: (number | null)[];
  };
  daily?: {
    wave_height_max?: (number | null)[];
  };
}

const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';
const MARINE_URL = 'https://marine-api.open-meteo.com/v1/marine';
const OPEN_TOPO_DATA_URL = 'https://api.opentopodata.org/v1';
const STORMGLASS_TIDE_URL = 'https://api.stormglass.io/v2/tide/extremes/point';
const BATHYMETRY_TIMEOUT_MS = 3500;
const FORECAST_DAYS = 7;

const reverseGeocode = async (lat: number, lon: number): Promise<string> => {
  try {
    const results = await Location.reverseGeocodeAsync({
      latitude: lat,
      longitude: lon,
    });
    const place = results[0];

    if (!place) {
      return 'Konumunuz';
    }

    const parts = [place.subregion, place.district, place.city].filter(
      (value, index, array): value is string =>
        Boolean(value?.trim()) && array.indexOf(value) === index,
    );

    return parts.slice(0, 2).join(', ') || place.city || 'Konumunuz';
  } catch {
    return 'Konumunuz';
  }
};

interface SeaDepthResult {
  depth: number | null;
  source: string | null;
  isApproximate: boolean;
}

interface FishingScoreResult {
  score: number;
  label: string;
  factors: FishingScoreFactor[];
}

type FishingScoreInput = Pick<
  WeatherData,
  | 'pressure'
  | 'windSpeed'
  | 'windDirection'
  | 'moonPhase'
  | 'seaTemp'
  | 'sunrise'
  | 'sunset'
  | 'weatherCode'
> & {
  referenceTime?: Date;
};

const getWeatherLabel = (code: number): string => {
  if (code === 0) {
    return 'Açık';
  }

  if (code >= 1 && code <= 3) {
    return 'Parçalı bulutlu';
  }

  if (code >= 45 && code <= 48) {
    return 'Sisli';
  }

  if (code >= 51 && code <= 67) {
    return 'Yağmurlu';
  }

  if (code >= 71 && code <= 77) {
    return 'Karlı';
  }

  if (code >= 80 && code <= 82) {
    return 'Sağanak';
  }

  if (code >= 95 && code <= 99) {
    return 'Fırtınalı';
  }

  return 'Değişken';
};

export const getWindDirectionLabel = (degrees: number): string => {
  const dirs = ['Kuzey', 'KD', 'Doğu', 'GD', 'Güney', 'GB', 'Batı', 'KB'];
  return dirs[Math.round(degrees / 45) % 8] ?? 'Kuzey';
};

export const getMoonPhase = (
  date: Date,
): { phase: number; label: string; emoji: string } => {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const c = Math.floor((year - 1900) * 12.3685);
  const rawAge = (c + (month - 1) + day / 30) % 1;
  const age = rawAge < 0 ? rawAge + 1 : rawAge;
  const phase = age * 29.53;

  if (phase < 1.85) {
    return { phase, label: 'Yeni Ay', emoji: '🌑' };
  }

  if (phase < 7.38) {
    return { phase, label: 'Hilal', emoji: '🌒' };
  }

  if (phase < 9.22) {
    return { phase, label: 'İlk Dördün', emoji: '🌓' };
  }

  if (phase < 14.77) {
    return { phase, label: 'Şişen Ay', emoji: '🌔' };
  }

  if (phase < 16.61) {
    return { phase, label: 'Dolunay', emoji: '🌕' };
  }

  if (phase < 22.15) {
    return { phase, label: 'Azalan Ay', emoji: '🌖' };
  }

  if (phase < 23.99) {
    return { phase, label: 'Son Dördün', emoji: '🌗' };
  }

  if (phase < 29.53) {
    return { phase, label: 'Eski Hilal', emoji: '🌘' };
  }

  return { phase, label: 'Yeni Ay', emoji: '🌑' };
};

const getDateFromClockTime = (value: string): Date | null => {
  const match = /^(\d{2}):(\d{2})$/.exec(value);

  if (!match) {
    return null;
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);

  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) {
    return null;
  }

  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date;
};

export const calculateFishingScore = (data: FishingScoreInput): FishingScoreResult => {
  let score = 5;
  const factors: FishingScoreFactor[] = [];

  if (data.pressure >= 1013 && data.pressure <= 1022) {
    score += 1.5;
    factors.push({
      label: 'Basınç',
      impact: 'positive',
      description: 'İdeal hava basıncı',
    });
  } else if (data.pressure < 1000) {
    score -= 2;
    factors.push({
      label: 'Basınç',
      impact: 'negative',
      description: 'Düşük basınç, fırtına riski',
    });
  } else if (data.pressure > 1025) {
    score -= 0.5;
    factors.push({
      label: 'Basınç',
      impact: 'neutral',
      description: 'Yüksek basınç, balıklar durgun',
    });
  }

  if (data.windSpeed < 10) {
    score += 1;
    factors.push({
      label: 'Rüzgar',
      impact: 'positive',
      description: 'Sakin rüzgar, ideal koşul',
    });
  } else if (data.windSpeed >= 10 && data.windSpeed < 20) {
    score += 0.5;
    factors.push({
      label: 'Rüzgar',
      impact: 'neutral',
      description: 'Orta rüzgar, katlanılabilir',
    });
  } else if (data.windSpeed >= 20 && data.windSpeed < 35) {
    score -= 1;
    factors.push({
      label: 'Rüzgar',
      impact: 'negative',
      description: 'Kuvvetli rüzgar, dikkatli ol',
    });
  } else {
    score -= 2.5;
    factors.push({
      label: 'Rüzgar',
      impact: 'negative',
      description: 'Çok kuvvetli rüzgar, tehlikeli',
    });
  }

  const windDir = data.windDirection;
  if (windDir >= 180 && windDir <= 270) {
    score += 0.5;
    factors.push({
      label: 'Rüzgar Yönü',
      impact: 'positive',
      description: 'Güney batı rüzgarı, avantajlı',
    });
  } else if (windDir >= 0 && windDir <= 90) {
    score -= 0.5;
    factors.push({
      label: 'Rüzgar Yönü',
      impact: 'negative',
      description: 'Kuzey doğu rüzgarı, dezavantajlı',
    });
  }

  const moonPhase = data.moonPhase.phase;
  if (moonPhase < 2 || moonPhase > 27.5) {
    score += 2;
    factors.push({
      label: 'Ay Fazı',
      impact: 'positive',
      description: 'Yeni ay, balıklar çok aktif',
    });
  } else if (moonPhase > 13 && moonPhase < 16) {
    score += 2;
    factors.push({
      label: 'Ay Fazı',
      impact: 'positive',
      description: 'Dolunay, gece avı çok güçlü',
    });
  } else if (
    (moonPhase > 6 && moonPhase < 9) ||
    (moonPhase > 21 && moonPhase < 24)
  ) {
    score += 0.5;
    factors.push({
      label: 'Ay Fazı',
      impact: 'neutral',
      description: 'Yarım ay, orta aktivite',
    });
  } else {
    score -= 0.5;
    factors.push({
      label: 'Ay Fazı',
      impact: 'neutral',
      description: 'Ortalama ay dönemi',
    });
  }

  if (data.seaTemp !== null) {
    const seaTempText = `${data.seaTemp.toFixed(1)}°C`;

    if (data.seaTemp >= 14 && data.seaTemp <= 22) {
      score += 1;
      factors.push({
        label: 'Su Sıcaklığı',
        impact: 'positive',
        description: `${seaTempText} - ideal aralık`,
      });
    } else if (data.seaTemp < 8 || data.seaTemp > 28) {
      score -= 1.5;
      factors.push({
        label: 'Su Sıcaklığı',
        impact: 'negative',
        description: `${seaTempText} - aşırı sıcaklık`,
      });
    } else {
      factors.push({
        label: 'Su Sıcaklığı',
        impact: 'neutral',
        description: `${seaTempText} - kabul edilebilir`,
      });
    }
  }

  const now = data.referenceTime ?? new Date();
  const sunrise = getDateFromClockTime(data.sunrise);
  const sunset = getDateFromClockTime(data.sunset);
  const goldenMorning =
    sunrise !== null &&
    Math.abs(now.getTime() - sunrise.getTime()) < 90 * 60 * 1000;
  const goldenEvening =
    sunset !== null &&
    Math.abs(now.getTime() - sunset.getTime()) < 90 * 60 * 1000;

  if (goldenMorning || goldenEvening) {
    score += 1.5;
    factors.push({
      label: 'Altın Saat',
      impact: 'positive',
      description: goldenMorning ? 'Sabah altın saati aktif' : 'Akşam altın saati aktif',
    });
  }

  if (data.weatherCode === 0 || data.weatherCode === 1) {
    score += 0.5;
    factors.push({
      label: 'Hava',
      impact: 'positive',
      description: 'Açık hava, görüş iyi',
    });
  } else if (data.weatherCode >= 95) {
    score -= 2;
    factors.push({
      label: 'Hava',
      impact: 'negative',
      description: 'Fırtına, avlanma önerilmez',
    });
  } else if (data.weatherCode >= 61 && data.weatherCode < 80) {
    score -= 0.5;
    factors.push({
      label: 'Hava',
      impact: 'neutral',
      description: 'Yağmurlu, bazı türler aktif',
    });
  }

  const finalScore = Math.min(10, Math.max(1, Math.round(score * 10) / 10));

  let label = 'Kötü';
  if (finalScore >= 8.5) {
    label = 'Mükemmel';
  } else if (finalScore >= 7) {
    label = 'Çok İyi';
  } else if (finalScore >= 5.5) {
    label = 'İyi';
  } else if (finalScore >= 4) {
    label = 'Orta';
  } else if (finalScore >= 2.5) {
    label = 'Zayıf';
  }

  return {
    score: finalScore,
    label,
    factors,
  };
};

const getFirstNumber = (
  ...values: (number | null | undefined)[]
): number | null => {
  for (const value of values) {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
  }

  return null;
};

const getDayKey = (value: string): string => value.slice(0, 10);

const getDayShortLabel = (date: Date): string =>
  date.toLocaleDateString('tr-TR', { weekday: 'short' });

const getDayLabel = (dateString: string, index: number): string => {
  if (index === 0) {
    return 'Bugün';
  }

  if (index === 1) {
    return 'Yarın';
  }

  return getDayShortLabel(new Date(`${dateString}T12:00:00`));
};

const getHourlyIndicesForDay = (
  hourlyTimes: string[] | undefined,
  dayKey: string,
): number[] => {
  if (!hourlyTimes?.length) {
    return [];
  }

  return hourlyTimes.flatMap((time, index) => (getDayKey(time) === dayKey ? [index] : []));
};

const getClosestIndexForReference = (
  hourlyTimes: string[] | undefined,
  referenceDate: Date,
  candidateIndices?: number[],
): number => {
  if (!hourlyTimes?.length) {
    return 0;
  }

  const indices = candidateIndices?.length
    ? candidateIndices
    : hourlyTimes.map((_, index) => index);

  let closestIndex = indices[0] ?? 0;
  let minDiff = Number.POSITIVE_INFINITY;

  indices.forEach((index) => {
    const time = hourlyTimes[index];

    if (!time) {
      return;
    }

    const diff = Math.abs(new Date(time).getTime() - referenceDate.getTime());

    if (diff < minDiff) {
      minDiff = diff;
      closestIndex = index;
    }
  });

  return closestIndex;
};

const getClosestTimeIndex = (hourlyTimes: string[] | undefined): number => {
  if (!hourlyTimes?.length) {
    return 0;
  }

  return getClosestIndexForReference(hourlyTimes, new Date());
};

const getTrend = (
  previous: number | null,
  current: number | null,
  next: number | null,
  threshold: number,
): 'rising' | 'falling' | 'stable' | null => {
  const compareTarget = next ?? previous;

  if (current === null || compareTarget === null) {
    return null;
  }

  if (compareTarget > current + threshold) {
    return 'rising';
  }

  if (compareTarget < current - threshold) {
    return 'falling';
  }

  return 'stable';
};

const formatDailyForecastDate = (dateString: string, index: number): string => {
  if (index === 0) {
    return 'Bugün';
  }

  if (index === 1) {
    return 'Yarın';
  }

  return new Date(`${dateString}T12:00:00`).toLocaleDateString('tr-TR', {
    weekday: 'short',
  });
};

const getDailyForecast = (forecast: ForecastApiResponse): DailyForecastItem[] => {
  const dates = forecast.daily?.time ?? [];

  return dates.slice(0, FORECAST_DAYS).map((date, index) => ({
    date: formatDailyForecastDate(date, index),
    weatherCode: Math.round(forecast.daily?.weathercode?.[index] ?? 0),
    tempMax: Math.round(forecast.daily?.temperature_2m_max?.[index] ?? 0),
    tempMin: Math.round(forecast.daily?.temperature_2m_min?.[index] ?? 0),
    precipitationProbability: Math.round(
      forecast.daily?.precipitation_probability_max?.[index] ?? 0,
    ),
  }));
};

const getHourlyWaveData = (
  hourlyTimes: string[] | undefined,
  waveHeights: (number | null)[] | undefined,
  waveDirections: (number | null)[] | undefined,
  wavePeriods: (number | null)[] | undefined,
): HourlyWaveDatum[] => {
  if (!hourlyTimes?.length || !waveHeights?.length) {
    return [];
  }

  return hourlyTimes
    .flatMap((time, index) => {
      const waveHeight = waveHeights[index];

      if (
        waveHeight === null ||
        waveHeight === undefined ||
        !Number.isFinite(waveHeight)
      ) {
        return [];
      }

      return [
        {
          time,
          waveHeight,
          waveDirection: waveDirections?.[index] ?? 0,
          wavePeriod: wavePeriods?.[index] ?? 0,
        },
      ];
    });
};

const getHourlyForecastData = (
  forecast: ForecastApiResponse,
  hourlyWaveData: HourlyWaveDatum[],
): HourlyForecastDatum[] => {
  const hourlyTimes = forecast.hourly?.time ?? [];
  const temperatures = forecast.hourly?.temperature_2m ?? [];
  const weatherCodes = forecast.hourly?.weather_code ?? [];
  const windSpeeds = forecast.hourly?.wind_speed_10m ?? [];
  const windDirections = forecast.hourly?.wind_direction_10m ?? [];
  const pressures = forecast.hourly?.surface_pressure ?? [];
  const precipitationProbabilities =
    forecast.hourly?.precipitation_probability ?? [];
  const waveByTime = new Map(
    hourlyWaveData.map((item) => [item.time, item.waveHeight]),
  );

  return hourlyTimes.flatMap((time, index) => {
    const temperature = temperatures[index];
    const weatherCode = weatherCodes[index];
    const windSpeed = windSpeeds[index];
    const windDirection = windDirections[index];
    const pressure = pressures[index];

    if (
      typeof temperature !== 'number' ||
      !Number.isFinite(temperature) ||
      typeof weatherCode !== 'number' ||
      !Number.isFinite(weatherCode) ||
      typeof windSpeed !== 'number' ||
      !Number.isFinite(windSpeed) ||
      typeof windDirection !== 'number' ||
      !Number.isFinite(windDirection) ||
      typeof pressure !== 'number' ||
      !Number.isFinite(pressure)
    ) {
      return [];
    }

    return [
      {
        time,
        temperature: Math.round(temperature),
        weatherCode: Math.round(weatherCode),
        windSpeed: Math.round(windSpeed),
        windDirection: Math.round(windDirection),
        pressure: Math.round(pressure),
        precipitationProbability:
          typeof precipitationProbabilities[index] === 'number' &&
          Number.isFinite(precipitationProbabilities[index])
            ? Math.round(precipitationProbabilities[index] as number)
            : null,
        waveHeight: waveByTime.get(time) ?? null,
      },
    ];
  });
};

const getCurrentHourlyWave = (
  hourlyWaveData: HourlyWaveDatum[],
): HourlyWaveDatum | null => {
  if (!hourlyWaveData.length) {
    return null;
  }

  return hourlyWaveData[getClosestTimeIndex(hourlyWaveData.map((item) => item.time))] ?? null;
};

const getPressureTrend = (
  hourlyTimes: string[] | undefined,
  hourlyPressure: number[] | undefined,
): 'rising' | 'falling' | 'stable' | null => {
  if (!hourlyTimes?.length || !hourlyPressure?.length) {
    return null;
  }

  const currentIndex = getClosestTimeIndex(hourlyTimes);
  const current = hourlyPressure[currentIndex] ?? null;
  const previous = hourlyPressure[currentIndex - 1] ?? null;
  const next = hourlyPressure[currentIndex + 1] ?? null;

  return getTrend(previous, current, next, 0.8);
};

const getPressureTrendForDay = (
  hourlyTimes: string[] | undefined,
  hourlyPressure: number[] | undefined,
  dayKey: string,
): 'rising' | 'falling' | 'stable' | null => {
  if (!hourlyTimes?.length || !hourlyPressure?.length) {
    return null;
  }

  const dayIndices = getHourlyIndicesForDay(hourlyTimes, dayKey);

  if (!dayIndices.length) {
    return null;
  }

  const representativeIndex = getClosestIndexForReference(
    hourlyTimes,
    getReferenceDateForDay(dayKey),
    dayIndices,
  );

  return getTrend(
    hourlyPressure[representativeIndex - 1] ?? null,
    hourlyPressure[representativeIndex] ?? null,
    hourlyPressure[representativeIndex + 1] ?? null,
    0.8,
  );
};

const getReferenceDateForDay = (dayKey: string): Date => {
  const todayKey = getDayKey(new Date().toISOString());

  if (dayKey === todayKey) {
    return new Date();
  }

  return new Date(`${dayKey}T12:00:00`);
};

const getRepresentativeValueForDay = (
  hourlyTimes: string[] | undefined,
  values: (number | null | undefined)[] | undefined,
  dayKey: string,
): number | null => {
  if (!hourlyTimes?.length || !values?.length) {
    return null;
  }

  const dayIndices = getHourlyIndicesForDay(hourlyTimes, dayKey).filter((index) => {
    const value = values[index];
    return typeof value === 'number' && Number.isFinite(value);
  });

  if (!dayIndices.length) {
    return null;
  }

  const representativeIndex = getClosestIndexForReference(
    hourlyTimes,
    getReferenceDateForDay(dayKey),
    dayIndices,
  );

  return values[representativeIndex] ?? null;
};

const getRepresentativeNumberForDay = (
  hourlyTimes: string[] | undefined,
  values: (number | null | undefined)[] | undefined,
  dayKey: string,
  fallback = 0,
): number => {
  const value = getRepresentativeValueForDay(hourlyTimes, values, dayKey);
  return value === null ? fallback : Math.round(value);
};

const getRepresentativeUvForDay = (
  hourlyTimes: string[] | undefined,
  values: (number | null | undefined)[] | undefined,
  dayKey: string,
  fallback: number,
): number => {
  const value = getRepresentativeValueForDay(hourlyTimes, values, dayKey);
  return Number((value ?? fallback).toFixed(1));
};

const fetchJson = async <T>(url: string): Promise<T> => {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error('Hava durumu verisi alinamadi.');
  }

  return (await response.json()) as T;
};

const fetchOptionalJson = async <T>(url: string): Promise<T | null> => {
  try {
    const response = await fetch(url);

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as T;
  } catch {
    return null;
  }
};

const formatTime = (value: string | undefined): string => {
  if (!value) {
    return '--:--';
  }

  const date = new Date(value);
  return date.toLocaleTimeString('tr-TR', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

const buildForecastUrl = (latitude: number, longitude: number): string => {
  const params = new URLSearchParams({
    latitude: latitude.toString(),
    longitude: longitude.toString(),
    current:
      'temperature_2m,windspeed_10m,winddirection_10m,surface_pressure,relativehumidity_2m,weathercode,uv_index',
    hourly:
      'temperature_2m,wind_speed_10m,wind_direction_10m,surface_pressure,relative_humidity_2m,precipitation_probability,weather_code,uv_index',
    daily:
      'weathercode,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset,uv_index_max',
    forecast_days: FORECAST_DAYS.toString(),
    timezone: 'auto',
  });

  return `${FORECAST_URL}?${params.toString()}`;
};

const buildMarineUrl = (latitude: number, longitude: number): string => {
  const params = new URLSearchParams({
    latitude: latitude.toString(),
    longitude: longitude.toString(),
    current: 'wave_height,wave_direction,sea_surface_temperature',
    hourly: 'wave_height,wave_direction,wave_period',
    daily: 'wave_height_max',
    forecast_days: FORECAST_DAYS.toString(),
    timezone: 'auto',
  });

  return `${MARINE_URL}?${params.toString()}`;
};

const BATHYMETRY_DATASETS = [
  { dataset: 'gebco2025', source: 'GEBCO 2025' },
  { dataset: 'gebco2024', source: 'GEBCO 2024' },
  { dataset: 'gebco2023', source: 'GEBCO 2023' },
  { dataset: 'etopo1', source: 'ETOPO1' },
] as const;

const BATHYMETRY_SAMPLE_OFFSETS = [
  { lat: 0, lon: 0 },
  { lat: 0.0015, lon: 0 },
  { lat: -0.0015, lon: 0 },
  { lat: 0, lon: 0.0015 },
  { lat: 0, lon: -0.0015 },
  { lat: 0.0015, lon: 0.0015 },
  { lat: 0.0015, lon: -0.0015 },
  { lat: -0.0015, lon: 0.0015 },
  { lat: -0.0015, lon: -0.0015 },
  { lat: 0.003, lon: 0 },
  { lat: -0.003, lon: 0 },
  { lat: 0, lon: 0.003 },
  { lat: 0, lon: -0.003 },
] as const;

const hasMarineWaveData = (marine: MarineApiResponse | null): boolean => {
  if (!marine) {
    return false;
  }

  if (typeof marine.current?.wave_height === 'number') {
    return true;
  }

  return Boolean(
    marine.hourly?.wave_height?.some(
      (value) => typeof value === 'number' && Number.isFinite(value),
    ),
  );
};

const fetchMarineDataWithFallback = async (
  latitude: number,
  longitude: number,
): Promise<MarineApiResponse | null> => {
  const primaryMarine = await fetchOptionalJson<MarineApiResponse>(
    buildMarineUrl(latitude, longitude),
  );

  if (hasMarineWaveData(primaryMarine)) {
    return primaryMarine;
  }

  for (const sample of BATHYMETRY_SAMPLE_OFFSETS) {
    if (sample.lat === 0 && sample.lon === 0) {
      continue;
    }

    const marine = await fetchOptionalJson<MarineApiResponse>(
      buildMarineUrl(latitude + sample.lat, longitude + sample.lon),
    );

    if (hasMarineWaveData(marine)) {
      return marine;
    }
  }

  return primaryMarine;
};

const fetchDatasetElevation = async (
  lat: number,
  lon: number,
  dataset: (typeof BATHYMETRY_DATASETS)[number],
): Promise<number | null> => {
  try {
    const response = await fetchWithTimeout(
      `${OPEN_TOPO_DATA_URL}/${dataset.dataset}?locations=${lat},${lon}`,
      BATHYMETRY_TIMEOUT_MS,
    );

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as {
      results?: { elevation?: number | null }[];
    };

    return data.results?.[0]?.elevation ?? null;
  } catch {
    return null;
  }
};

export const fetchSeaDepth = async (
  lat: number,
  lon: number,
): Promise<SeaDepthResult> => {
  const sampledCandidates: {
    depth: number;
    source: string;
    distance: number;
  }[] = [];

  for (const dataset of BATHYMETRY_DATASETS) {
    for (const sample of BATHYMETRY_SAMPLE_OFFSETS) {
      const sampledLat = lat + sample.lat;
      const sampledLon = lon + sample.lon;
      const elevation = await fetchDatasetElevation(sampledLat, sampledLon, dataset);

      if (elevation === null || elevation >= 0) {
        continue;
      }

      const depth = Math.abs(elevation);
      const distance = Math.sqrt(sample.lat ** 2 + sample.lon ** 2);

      if (distance === 0) {
        return {
          depth,
          source: dataset.source,
          isApproximate: false,
        };
      }

      sampledCandidates.push({
        depth,
        source: dataset.source,
        distance,
      });
    }
  }

  if (!sampledCandidates.length) {
    return {
      depth: null,
      source: null,
      isApproximate: false,
    };
  }

  sampledCandidates.sort((left, right) => left.distance - right.distance);
  const bestMatch = sampledCandidates[0];

  return {
    depth: bestMatch.depth,
    source: bestMatch.source,
    isApproximate: true,
  };
};

const fetchWithTimeout = async (
  input: string,
  timeoutMs: number,
): Promise<Response> => {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  try {
    const timeout = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error('request_timeout')), timeoutMs);
    });

    return await Promise.race([fetch(input), timeout]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
};

const calculateGoldenHour = (
  sunrise: string,
  sunset: string,
): GoldenHourInfo => {
  const now = new Date();
  const sunriseDate = getDateFromClockTime(sunrise);
  const sunsetDate = getDateFromClockTime(sunset);

  const goldenDuration = 60 * 60 * 1000; // 1 hour

  const morningStart = sunriseDate
    ? new Date(sunriseDate.getTime() - 30 * 60 * 1000)
    : null;
  const morningEnd = sunriseDate
    ? new Date(sunriseDate.getTime() + goldenDuration)
    : null;
  const eveningStart = sunsetDate
    ? new Date(sunsetDate.getTime() - goldenDuration)
    : null;
  const eveningEnd = sunsetDate
    ? new Date(sunsetDate.getTime() + 30 * 60 * 1000)
    : null;

  const isMorningActive = Boolean(
    morningStart && morningEnd && now >= morningStart && now <= morningEnd
  );
  const isEveningActive = Boolean(
    eveningStart && eveningEnd && now >= eveningStart && now <= eveningEnd
  );

  let nextGoldenHour: string | null = null;
  if (!isMorningActive && !isEveningActive) {
    if (morningStart && now < morningStart) {
      nextGoldenHour = formatTimeFromDate(morningStart);
    } else if (eveningStart && now < eveningStart) {
      nextGoldenHour = formatTimeFromDate(eveningStart);
    }
  }

  return {
    morningStart: morningStart ? formatTimeFromDate(morningStart) : sunrise,
    morningEnd: morningEnd ? formatTimeFromDate(morningEnd) : sunrise,
    eveningStart: eveningStart ? formatTimeFromDate(eveningStart) : sunset,
    eveningEnd: eveningEnd ? formatTimeFromDate(eveningEnd) : sunset,
    isActive: isMorningActive || isEveningActive,
    nextGoldenHour,
  };
};

const formatTimeFromDate = (date: Date): string =>
  date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

const calculateEstimatedTideData = (
  latitude: number,
  moonPhase: { phase: number },
): TideData | null => {
  // Simplified tide calculation based on moon phase
  // Real implementation would use a tide API
  const now = new Date();
  const hour = now.getHours();
  const moonInfluence = Math.sin((moonPhase.phase / 29.53) * 2 * Math.PI);
  
  // Approximate tide times based on moon phase
  const highTideHour1 = Math.round((moonPhase.phase * 0.8) % 12);
  const highTideHour2 = (highTideHour1 + 12) % 24;
  const lowTideHour1 = (highTideHour1 + 6) % 24;
  const lowTideHour2 = (lowTideHour1 + 12) % 24;

  const events: TideEvent[] = [
    { time: `${String(highTideHour1).padStart(2, '0')}:00`, type: 'high' as const, height: 1.5 + moonInfluence * 0.5 },
    { time: `${String(lowTideHour1).padStart(2, '0')}:00`, type: 'low' as const, height: 0.3 - moonInfluence * 0.1 },
    { time: `${String(highTideHour2).padStart(2, '0')}:00`, type: 'high' as const, height: 1.4 + moonInfluence * 0.4 },
    { time: `${String(lowTideHour2).padStart(2, '0')}:00`, type: 'low' as const, height: 0.4 - moonInfluence * 0.1 },
  ].sort((a, b) => a.time.localeCompare(b.time));

  // Determine current state
  const isRising = hour < highTideHour1 || (hour >= lowTideHour1 && hour < highTideHour2) || hour >= lowTideHour2;
  const currentState: TideData['currentState'] = isRising ? 'rising' : 'falling';

  // Find next event
  const nextEvent = events.find(e => {
    const eventHour = parseInt(e.time.split(':')[0] ?? '0', 10);
    return eventHour > hour;
  }) ?? events[0] ?? null;

  return {
    currentState,
    nextEvent,
    events,
  };
};

interface StormglassTideResponse {
  data?: Array<{
    height?: number;
    time?: string;
    type?: 'high' | 'low';
  }>;
}

interface TideTimelineEvent {
  date: Date;
  event: TideEvent;
}

const buildStormglassTideUrl = (latitude: number, longitude: number): string => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 2);

  const params = new URLSearchParams({
    lat: latitude.toString(),
    lng: longitude.toString(),
    start: start.toISOString(),
    end: end.toISOString(),
  });

  return `${STORMGLASS_TIDE_URL}?${params.toString()}`;
};

const parseStormglassEvents = (data: StormglassTideResponse): TideTimelineEvent[] => {
  const rawEvents = data.data ?? [];

  return rawEvents
    .flatMap((item) => {
      if (!item.time || (item.type !== 'high' && item.type !== 'low')) {
        return [];
      }

      const parsedDate = new Date(item.time);
      if (Number.isNaN(parsedDate.getTime())) {
        return [];
      }

      const height = typeof item.height === 'number' && Number.isFinite(item.height)
        ? item.height
        : 0;

      return [{
        date: parsedDate,
        event: {
          time: parsedDate.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
          type: item.type,
          height,
        },
      } satisfies TideTimelineEvent];
    })
    .sort((left, right) => left.date.getTime() - right.date.getTime());
};

const deriveCurrentStateFromEvents = (
  now: Date,
  rawEvents: StormglassTideResponse['data'] | undefined,
): TideData['currentState'] => {
  const timeline = (rawEvents ?? [])
    .flatMap((item) => {
      if (!item.time || (item.type !== 'high' && item.type !== 'low')) {
        return [];
      }

      const parsedDate = new Date(item.time);
      if (Number.isNaN(parsedDate.getTime())) {
        return [];
      }

      return [{ time: parsedDate, type: item.type }];
    })
    .sort((left, right) => left.time.getTime() - right.time.getTime());

  if (!timeline.length) {
    return 'slack';
  }

  const previous = [...timeline].reverse().find((item) => item.time.getTime() <= now.getTime()) ?? null;
  const next = timeline.find((item) => item.time.getTime() > now.getTime()) ?? null;

  if (!previous || !next) {
    return 'slack';
  }

  if (previous.type === 'low' && next.type === 'high') {
    return 'rising';
  }

  if (previous.type === 'high' && next.type === 'low') {
    return 'falling';
  }

  return 'slack';
};

const fetchRealTideData = async (
  latitude: number,
  longitude: number,
): Promise<TideData | null> => {
  const apiKey = publicEnv.stormglassApiKey;

  if (!apiKey) {
    return null;
  }

  try {
    const response = await fetch(buildStormglassTideUrl(latitude, longitude), {
      headers: {
        Authorization: apiKey,
      },
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as StormglassTideResponse;
    const timeline = parseStormglassEvents(payload);
    const events = timeline.map((item) => item.event);

    if (!timeline.length) {
      return null;
    }

    const currentState = deriveCurrentStateFromEvents(new Date(), payload.data);
    const nextEvent = timeline.find((item) => item.date.getTime() > Date.now())?.event ?? events[0] ?? null;

    return {
      currentState,
      nextEvent,
      events,
    };
  } catch {
    return null;
  }
};

const getSpeciesRecommendations = (
  temperature: number,
  seaTemp: number | null,
  moonPhase: { phase: number; label: string },
  weatherCode: number,
  windSpeed: number,
  hour: number,
): SpeciesRecommendation[] => {
  const recommendations: SpeciesRecommendation[] = [];
  const effectiveSeaTemp = seaTemp ?? temperature - 5;
  const isCalm = windSpeed < 15;
  const isCloudy = weatherCode >= 2 && weatherCode <= 3;
  const isNewOrFullMoon = moonPhase.phase < 2 || (moonPhase.phase > 13 && moonPhase.phase < 16);
  const moonBonus = isNewOrFullMoon ? 10 : 0;
  
  // Levrek (Sea Bass) - morning/evening, 14-22°C water temp
  if (effectiveSeaTemp >= 12 && effectiveSeaTemp <= 24) {
    const isBestTime = hour >= 5 && hour <= 9;
    recommendations.push({
      speciesId: 1,
      speciesName: 'Levrek',
      confidence: Math.min(95, (isBestTime && isCalm ? 85 : 65) + moonBonus),
      reason: isBestTime ? 'Sabah saatleri levrek için ideal' : 'Uygun su sıcaklığı',
      bestTime: 'morning',
    });
  }

  // Çupra (Sea Bream) - evening, warm water
  if (effectiveSeaTemp >= 15 && effectiveSeaTemp <= 26) {
    const isBestTime = hour >= 16 && hour <= 20;
    recommendations.push({
      speciesId: 2,
      speciesName: 'Çupra',
      confidence: isBestTime ? 80 : 60,
      reason: isBestTime ? 'Akşam saatleri çupra için verimli' : 'Sıcak su tercih eder',
      bestTime: 'evening',
    });
  }

  // Lüfer (Bluefish) - active hunters, choppy conditions
  if (effectiveSeaTemp >= 14 && effectiveSeaTemp <= 22 && !isCalm) {
    recommendations.push({
      speciesId: 3,
      speciesName: 'Lüfer',
      confidence: 70,
      reason: 'Dalgalı havada aktif avlanır',
      bestTime: 'any',
    });
  }

  // Palamut (Bonito) - cooler water, morning/evening
  if (effectiveSeaTemp >= 10 && effectiveSeaTemp <= 18) {
    const isBestTime = hour >= 6 && hour <= 10;
    recommendations.push({
      speciesId: 4,
      speciesName: 'Palamut',
      confidence: isBestTime ? 75 : 55,
      reason: 'Serin sularda aktif',
      bestTime: 'morning',
    });
  }

  // İstavrit (Horse Mackerel) - cloudy days, moderate temps
  if (isCloudy && effectiveSeaTemp >= 12 && effectiveSeaTemp <= 20) {
    recommendations.push({
      speciesId: 5,
      speciesName: 'İstavrit',
      confidence: 70,
      reason: 'Bulutlu havalarda yüzeye çıkar',
      bestTime: 'midday',
    });
  }

  // Kefal (Mullet) - calm water, any time
  if (isCalm && effectiveSeaTemp >= 10) {
    recommendations.push({
      speciesId: 6,
      speciesName: 'Kefal',
      confidence: 65,
      reason: 'Sakin sularda bol bulunur',
      bestTime: 'any',
    });
  }

  // Sort by confidence and return top 3
  return recommendations
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 3);
};

const calculateBestTimes = (
  sunrise: string,
  sunset: string,
  hourlyData: HourlyForecastDatum[],
  tideData: TideData | null,
): BestFishingTime[] => {
  const bestTimes: BestFishingTime[] = [];
  const sunriseDate = getDateFromClockTime(sunrise);
  const sunsetDate = getDateFromClockTime(sunset);

  // Golden hours are always good
  if (sunriseDate) {
    const goldenMorningStart = new Date(sunriseDate.getTime() - 30 * 60 * 1000);
    bestTimes.push({
      time: formatTimeFromDate(goldenMorningStart),
      score: 9,
      label: 'Altın Saat',
      reason: 'Sabah altın saati, balıklar çok aktif',
    });
  }

  if (sunsetDate) {
    const goldenEveningStart = new Date(sunsetDate.getTime() - 60 * 60 * 1000);
    bestTimes.push({
      time: formatTimeFromDate(goldenEveningStart),
      score: 9,
      label: 'Altın Saat',
      reason: 'Akşam altın saati, yem aktivitesi yüksek',
    });
  }

  // Tide changes are good fishing times
  if (tideData?.events) {
    for (const event of tideData.events.slice(0, 2)) {
      const eventHour = parseInt(event.time.split(':')[0] ?? '12', 10);
      if (eventHour >= 5 && eventHour <= 21) {
        bestTimes.push({
          time: event.time,
          score: event.type === 'high' ? 8 : 7.5,
          label: event.type === 'high' ? 'Yüksek Gelgit' : 'Alçak Gelgit',
          reason: event.type === 'high' 
            ? 'Gelgit zirvesi, balıklar kıyıya yaklaşır' 
            : 'Gelgit alçalırken balıklar aktifleşir',
        });
      }
    }
  }

  // Find calmest hours from hourly data
  const todayEntries = hourlyData.filter(entry => {
    const entryHour = new Date(entry.time).getHours();
    return entryHour >= 5 && entryHour <= 21;
  }).slice(0, 16);

  if (todayEntries.length > 0) {
    const calmestEntry = todayEntries.reduce((best, entry) =>
      entry.windSpeed < best.windSpeed ? entry : best
    );
    const calmTime = new Date(calmestEntry.time).toLocaleTimeString('tr-TR', {
      hour: '2-digit',
      minute: '2-digit',
    });
    
    if (!bestTimes.some(t => t.time === calmTime)) {
      bestTimes.push({
        time: calmTime,
        score: 7,
        label: 'En Sakin',
        reason: `Günün en sakin saati (${calmestEntry.windSpeed} km/sa)`,
      });
    }
  }

  // Sort by score and return top 4
  return bestTimes
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);
};

const calculateTomorrowTrend = (
  todayScore: number,
  forecastDays: WeatherForecastDay[],
): 'better' | 'worse' | 'same' | null => {
  if (forecastDays.length < 2) {
    return null;
  }

  const tomorrowScore = forecastDays[1]?.fishingScore ?? todayScore;
  const diff = tomorrowScore - todayScore;

  if (diff >= 0.5) return 'better';
  if (diff <= -0.5) return 'worse';
  return 'same';
};

const buildForecastDays = (
  forecast: ForecastApiResponse,
  marine: MarineApiResponse | null,
  currentWeather: WeatherData,
  hourlyWaveData: HourlyWaveDatum[],
  realTideData: TideData | null,
): WeatherForecastDay[] => {
  const dayKeys = forecast.daily?.time ?? [];
  const currentHourlyWave = getCurrentHourlyWave(hourlyWaveData);

  return dayKeys.slice(0, FORECAST_DAYS).map((dayKey, index) => {
    const referenceDate = new Date(`${dayKey}T12:00:00`);
    const waveHeight =
      index === 0
        ? getFirstNumber(
            currentHourlyWave?.waveHeight,
            currentWeather.waveHeight,
          )
        : getFirstNumber(marine?.daily?.wave_height_max?.[index]);
    const waveDirection =
      index === 0
        ? getFirstNumber(
            currentHourlyWave?.waveDirection,
            currentWeather.waveDirection,
          )
        : getRepresentativeValueForDay(
            marine?.hourly?.time,
            marine?.hourly?.wave_direction,
            dayKey,
          );
    const seaTemp =
      index === 0
        ? currentWeather.seaTemp
        : getRepresentativeValueForDay(
            marine?.hourly?.time,
            marine?.hourly?.sea_surface_temperature,
            dayKey,
          );

    const snapshot: WeatherForecastDay = {
      date: dayKey,
      label: getDayLabel(dayKey, index),
      shortLabel: getDayShortLabel(referenceDate),
      isToday: index === 0,
      temperature:
        index === 0
          ? currentWeather.temperature
          : getRepresentativeNumberForDay(
              forecast.hourly?.time,
              forecast.hourly?.temperature_2m,
              dayKey,
              currentWeather.temperature,
            ),
      windSpeed:
        index === 0
          ? currentWeather.windSpeed
          : getRepresentativeNumberForDay(
              forecast.hourly?.time,
              forecast.hourly?.wind_speed_10m,
              dayKey,
              currentWeather.windSpeed,
            ),
      windDirection:
        index === 0
          ? currentWeather.windDirection
          : getRepresentativeNumberForDay(
              forecast.hourly?.time,
              forecast.hourly?.wind_direction_10m,
              dayKey,
              currentWeather.windDirection,
            ),
      windDirectionLabel:
        index === 0
          ? currentWeather.windDirectionLabel
          : getWindDirectionLabel(
              getRepresentativeNumberForDay(
                forecast.hourly?.time,
                forecast.hourly?.wind_direction_10m,
                dayKey,
                currentWeather.windDirection,
              ),
            ),
      pressure:
        index === 0
          ? currentWeather.pressure
          : getRepresentativeNumberForDay(
              forecast.hourly?.time,
              forecast.hourly?.surface_pressure,
              dayKey,
              currentWeather.pressure,
            ),
      pressureTrend:
        index === 0
          ? currentWeather.pressureTrend
          : getPressureTrendForDay(
              forecast.hourly?.time,
              forecast.hourly?.surface_pressure,
              dayKey,
            ),
      humidity:
        index === 0
          ? currentWeather.humidity
          : getRepresentativeNumberForDay(
              forecast.hourly?.time,
              forecast.hourly?.relative_humidity_2m,
              dayKey,
              currentWeather.humidity,
            ),
      weatherCode:
        index === 0
          ? currentWeather.weatherCode
          : getRepresentativeNumberForDay(
              forecast.hourly?.time,
              forecast.hourly?.weather_code,
              dayKey,
              currentWeather.weatherCode,
            ),
      weatherLabel:
        index === 0
          ? currentWeather.weatherLabel
          : getWeatherLabel(
              getRepresentativeNumberForDay(
                forecast.hourly?.time,
                forecast.hourly?.weather_code,
                dayKey,
                currentWeather.weatherCode,
              ),
            ),
      uvIndex:
        index === 0
          ? currentWeather.uvIndex
          : getRepresentativeUvForDay(
              forecast.hourly?.time,
              forecast.hourly?.uv_index,
              dayKey,
              forecast.daily?.uv_index_max?.[index] ?? currentWeather.uvIndex,
            ),
      sunrise: formatTime(forecast.daily?.sunrise?.[index]),
      sunset: formatTime(forecast.daily?.sunset?.[index]),
      waveHeight,
      waveDirection,
      seaTemp,
      moonPhase: getMoonPhase(referenceDate),
      fishingScore: 5,
      fishingScoreLabel: 'Orta',
      fishingScoreFactors: [],
      tideData: null,
      goldenHour: calculateGoldenHour(
        formatTime(forecast.daily?.sunrise?.[index]),
        formatTime(forecast.daily?.sunset?.[index]),
      ),
      bestTimes: [],
      speciesRecommendations: [],
    };

    const scoreResult = calculateFishingScore(snapshot);
    const tideData =
      index === 0 && realTideData
        ? realTideData
        : calculateEstimatedTideData(currentWeather.latitude, snapshot.moonPhase);
    const hourlyForDay = getHourlyForecastDataForDay(
      forecast,
      hourlyWaveData,
      dayKey,
    );
    const bestTimes = calculateBestTimes(
      snapshot.sunrise,
      snapshot.sunset,
      hourlyForDay,
      tideData,
    );
    const speciesRecommendations = getSpeciesRecommendations(
      snapshot.temperature,
      seaTemp,
      snapshot.moonPhase,
      snapshot.weatherCode,
      snapshot.windSpeed,
      referenceDate.getHours(),
    );

    return {
      ...snapshot,
      fishingScore: scoreResult.score,
      fishingScoreLabel: scoreResult.label,
      fishingScoreFactors: scoreResult.factors,
      tideData,
      bestTimes,
      speciesRecommendations,
    };
  });
};

const getHourlyForecastDataForDay = (
  forecast: ForecastApiResponse,
  hourlyWaveData: HourlyWaveDatum[],
  dayKey: string,
): HourlyForecastDatum[] => {
  const hourlyTimes = forecast.hourly?.time ?? [];
  const temperatures = forecast.hourly?.temperature_2m ?? [];
  const weatherCodes = forecast.hourly?.weather_code ?? [];
  const windSpeeds = forecast.hourly?.wind_speed_10m ?? [];
  const windDirections = forecast.hourly?.wind_direction_10m ?? [];
  const pressures = forecast.hourly?.surface_pressure ?? [];
  const precipitationProbabilities = forecast.hourly?.precipitation_probability ?? [];
  const waveByTime = new Map(hourlyWaveData.map((item) => [item.time, item.waveHeight]));

  return hourlyTimes.flatMap((time, index) => {
    if (getDayKey(time) !== dayKey) {
      return [];
    }

    const temperature = temperatures[index];
    const weatherCode = weatherCodes[index];
    const windSpeed = windSpeeds[index];
    const windDirection = windDirections[index];
    const pressure = pressures[index];

    if (
      typeof temperature !== 'number' ||
      !Number.isFinite(temperature) ||
      typeof windSpeed !== 'number' ||
      !Number.isFinite(windSpeed)
    ) {
      return [];
    }

    return [
      {
        time,
        temperature: Math.round(temperature),
        weatherCode: Math.round(weatherCode ?? 0),
        windSpeed: Math.round(windSpeed),
        windDirection: Math.round(windDirection ?? 0),
        pressure: Math.round(pressure ?? 1013),
        precipitationProbability:
          typeof precipitationProbabilities[index] === 'number'
            ? Math.round(precipitationProbabilities[index] as number)
            : null,
        waveHeight: waveByTime.get(time) ?? null,
      },
    ];
  });
};

export const getWeatherAndFishingConditions = async (
  latitude: number,
  longitude: number,
): Promise<WeatherData> => {
  try {
    const [forecast, marineData, seaDepthResult, locationLabel, realTideData] = await Promise.all([
      fetchJson<ForecastApiResponse>(buildForecastUrl(latitude, longitude)),
      fetchMarineDataWithFallback(latitude, longitude),
      fetchSeaDepth(latitude, longitude),
      reverseGeocode(latitude, longitude),
      fetchRealTideData(latitude, longitude),
    ]);

    if (__DEV__) {
      console.log('marine API response:', JSON.stringify(marineData).slice(0, 500));
    }

    const moonPhase = getMoonPhase(new Date());
    const current = forecast.current ?? {};
    const marineCurrent = marineData?.current;
    const dailyForecast = getDailyForecast(forecast);
    const hourlyWaveData = getHourlyWaveData(
      marineData?.hourly?.time,
      marineData?.hourly?.wave_height,
      marineData?.hourly?.wave_direction,
      marineData?.hourly?.wave_period,
    );
    const hourlyForecastData = getHourlyForecastData(forecast, hourlyWaveData);
    const currentHourlyWave = getCurrentHourlyWave(hourlyWaveData);
    const pressureTrend = getPressureTrend(
      forecast.hourly?.time,
      forecast.hourly?.surface_pressure,
    );
    const baseData: WeatherData = {
      latitude,
      longitude,
      locationLabel,
      temperature: Math.round(getFirstNumber(current.temperature_2m, 0) ?? 0),
      windSpeed: Math.round(
        getFirstNumber(current.windspeed_10m, current.wind_speed_10m, 0) ?? 0,
      ),
      windDirection:
        Math.round(
          getFirstNumber(
            current.winddirection_10m,
            current.wind_direction_10m,
            0,
          ) ?? 0,
        ),
      windDirectionLabel: getWindDirectionLabel(
        Math.round(
          getFirstNumber(
            current.winddirection_10m,
            current.wind_direction_10m,
            0,
          ) ?? 0,
        ),
      ),
      pressure: Math.round(getFirstNumber(current.surface_pressure, 0) ?? 0),
      pressureTrend,
      humidity: Math.round(
        getFirstNumber(
          current.relativehumidity_2m,
          current.relative_humidity_2m,
          0,
        ) ?? 0,
      ),
      weatherCode: Math.round(
        getFirstNumber(current.weathercode, current.weather_code, 0) ?? 0,
      ),
      weatherLabel: getWeatherLabel(
        Math.round(
          getFirstNumber(current.weathercode, current.weather_code, 0) ?? 0,
        ),
      ),
      uvIndex: Number(
        (getFirstNumber(current.uv_index, forecast.daily?.uv_index_max?.[0], 0) ?? 0).toFixed(1),
      ),
      sunrise: formatTime(forecast.daily?.sunrise?.[0]),
      sunset: formatTime(forecast.daily?.sunset?.[0]),
      waveHeight: getFirstNumber(
        marineCurrent?.wave_height,
        currentHourlyWave?.waveHeight,
        marineData?.daily?.wave_height_max?.[0],
      ),
      waveDirection: getFirstNumber(
        marineCurrent?.wave_direction,
        currentHourlyWave?.waveDirection,
      ),
      seaTemp: getFirstNumber(marineCurrent?.sea_surface_temperature),
      seaDepth: seaDepthResult.depth,
      seaDepthSource: seaDepthResult.source,
      seaDepthIsApproximate: seaDepthResult.isApproximate,
      moonPhase,
      fishingScore: 5,
      fishingScoreLabel: 'Orta',
      fishingScoreFactors: [],
      dailyForecast,
      hourlyWaveData,
      hourlyForecastData,
      forecastDays: [],
      tideData: null,
      goldenHour: calculateGoldenHour(
        formatTime(forecast.daily?.sunrise?.[0]),
        formatTime(forecast.daily?.sunset?.[0]),
      ),
      bestTimes: [],
      speciesRecommendations: [],
      tomorrowTrend: null,
    };

    const fishingScore = calculateFishingScore(baseData);
    const forecastDays = buildForecastDays(forecast, marineData, {
      ...baseData,
      fishingScore: fishingScore.score,
      fishingScoreLabel: fishingScore.label,
      fishingScoreFactors: fishingScore.factors,
    }, hourlyWaveData, realTideData);

    const tideData = realTideData ?? calculateEstimatedTideData(latitude, moonPhase);
    const bestTimes = calculateBestTimes(
      baseData.sunrise,
      baseData.sunset,
      hourlyForecastData,
      tideData,
    );
    const speciesRecommendations = getSpeciesRecommendations(
      baseData.temperature,
      baseData.seaTemp,
      moonPhase,
      baseData.weatherCode,
      baseData.windSpeed,
      new Date().getHours(),
    );
    const tomorrowTrend = calculateTomorrowTrend(fishingScore.score, forecastDays);

    if (__DEV__) {
      console.log('forecastDays[0]:', JSON.stringify(forecastDays[0]));
    }

    return {
      ...baseData,
      fishingScore: fishingScore.score,
      fishingScoreLabel: fishingScore.label,
      fishingScoreFactors: fishingScore.factors,
      forecastDays,
      tideData,
      bestTimes,
      speciesRecommendations,
      tomorrowTrend,
    };
  } catch (error: unknown) {
    captureError(error, {
      latitude,
      longitude,
      service: 'getWeatherAndFishingConditions',
    });
    throw new Error('Hava durumu verisi şu anda alınamadı.');
  }
};
