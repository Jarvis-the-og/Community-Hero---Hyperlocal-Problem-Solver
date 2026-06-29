'use client';

import { useState, useEffect, useCallback } from 'react';
import { DEFAULT_LOCATION } from '@/constants';

interface LocationState {
  lat: number;
  lng: number;
  loading: boolean;
  error: string | null;
  hasLocation: boolean;
}

export function useGeolocation() {
  const [location, setLocation] = useState<LocationState>({
    lat: DEFAULT_LOCATION.lat,
    lng: DEFAULT_LOCATION.lng,
    loading: true,
    error: null,
    hasLocation: false,
  });

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocation((prev) => ({
        ...prev,
        loading: false,
        error: 'Geolocation not supported',
      }));
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          loading: false,
          error: null,
          hasLocation: true,
        });
      },
      (err) => {
        setLocation((prev) => ({
          ...prev,
          loading: false,
          hasLocation: false,
          error:
            err.code === err.PERMISSION_DENIED
              ? 'Location permission denied'
              : 'Unable to get location. Using default.',
        }));
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  const refresh = useCallback(() => {
    if (!navigator.geolocation) return;

    setLocation((prev) => ({ ...prev, loading: true }));
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          loading: false,
          error: null,
          hasLocation: true,
        });
      },
      (err) =>
        setLocation((prev) => ({
          ...prev,
          loading: false,
          hasLocation: false,
          error:
            err.code === err.PERMISSION_DENIED
              ? 'Location permission denied'
              : 'Unable to get location. Using default.',
        })),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, []);

  return { ...location, refresh };
}
