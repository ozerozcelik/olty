import { useQuery } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { useEffect, useState } from 'react';

import { getWeatherAndFishingConditions } from '@/services/weather.service';
import type { WeatherLocationSelection } from '@/types/app.types';

const ISTANBUL_LOCATION: WeatherLocationSelection = {
  latitude: 41.0,
  longitude: 28.97,
  label: 'İstanbul',
};

export const WEATHER_LOCATION_KEY = 'weather_location';

export const resolveWeatherLocationLabel = async (
  latitude: number,
  longitude: number,
  fallback: string,
): Promise<string> => {
  try {
    const results = await Location.reverseGeocodeAsync({ latitude, longitude });
    const place = results[0];

    if (!place) {
      return fallback;
    }

    const parts = [place.subregion, place.district, place.city].filter(
      (value, index, array): value is string =>
        Boolean(value?.trim()) && array.indexOf(value) === index,
    );

    return parts.slice(0, 2).join(', ') || place.city || fallback;
  } catch {
    return fallback;
  }
};

const readStoredWeatherLocation =
  async (): Promise<WeatherLocationSelection | null> => {
    try {
      const storedValue = await AsyncStorage.getItem(WEATHER_LOCATION_KEY);

      if (!storedValue) {
        return null;
      }

      const parsed = JSON.parse(storedValue) as WeatherLocationSelection;

      if (
        typeof parsed.latitude !== 'number' ||
        typeof parsed.longitude !== 'number' ||
        typeof parsed.label !== 'string'
      ) {
        return null;
      }

      return parsed;
    } catch {
      return null;
    }
  };

const persistWeatherLocation = async (
  location: WeatherLocationSelection,
): Promise<void> => {
  await AsyncStorage.setItem(WEATHER_LOCATION_KEY, JSON.stringify(location));
};

export const resolveCurrentWeatherLocation =
  async (): Promise<WeatherLocationSelection> => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        return ISTANBUL_LOCATION;
      }

      const coords = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Low,
      });
      const label = await resolveWeatherLocationLabel(
        coords.coords.latitude,
        coords.coords.longitude,
        'Mevcut Konumum',
      );

      return {
        latitude: coords.coords.latitude,
        longitude: coords.coords.longitude,
        label,
      };
    } catch {
      return ISTANBUL_LOCATION;
    }
  };

export const useWeather = () => {
  const [location, setLocation] = useState<WeatherLocationSelection | null>(null);
  const [isLocationLoading, setIsLocationLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;

    void (async () => {
      const storedLocation = await readStoredWeatherLocation();
      const nextLocation = storedLocation ?? (await resolveCurrentWeatherLocation());

      if (!isMounted) {
        return;
      }

      setLocation(nextLocation);
      setIsLocationLoading(false);
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  const setWeatherLocation = async (
    nextLocation: WeatherLocationSelection,
  ): Promise<void> => {
    await persistWeatherLocation(nextLocation);
    setLocation(nextLocation);
  };

  const useCurrentLocation = async (): Promise<WeatherLocationSelection> => {
    const nextLocation = await resolveCurrentWeatherLocation();
    await setWeatherLocation(nextLocation);
    return nextLocation;
  };

  const query = useQuery({
    enabled: Boolean(location) && !isLocationLoading,
    queryKey: ['weather', location?.latitude, location?.longitude],
    queryFn: async () => {
      if (!location) {
        return getWeatherAndFishingConditions(
          ISTANBUL_LOCATION.latitude,
          ISTANBUL_LOCATION.longitude,
        );
      }

      return getWeatherAndFishingConditions(location.latitude, location.longitude);
    },
    staleTime: 30 * 60 * 1000, // 30 minutes
    gcTime: 60 * 60 * 1000, // 1 hour cache
    retry: 2,
    retryDelay: 1000,
  });

  return {
    ...query,
    location,
    isLocationLoading,
    setWeatherLocation,
    useCurrentLocation,
  };
};
