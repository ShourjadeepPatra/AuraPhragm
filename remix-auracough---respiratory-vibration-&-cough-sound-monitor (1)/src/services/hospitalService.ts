import { SupportedLanguage } from '../config/appConfig';
import { NearbyHospital, UserCoordinates } from '../types';

export interface GeolocationResult {
  coords?: UserCoordinates;
  errorType?: 'denied' | 'unavailable' | 'timeout' | 'unsupported';
  message?: string;
}

export interface NearbyHospitalsResponse {
  hospitals: NearbyHospital[];
  error?: string;
  quotaExceeded?: boolean;
}

export function requestBrowserLocation(): Promise<GeolocationResult> {
  return new Promise((resolve) => {
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      resolve({
        errorType: 'unsupported',
        message: 'Location services are not supported in this browser.',
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          coords: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracyMeters: Math.round(position.coords.accuracy),
            updatedAt: new Date().toISOString(),
          },
        });
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          resolve({
            errorType: 'denied',
            message: 'Location permission was declined. You can still call 108 Ambulance anytime.',
          });
        } else if (err.code === err.TIMEOUT) {
          resolve({
            errorType: 'timeout',
            message: 'Location request timed out. Please try again outdoors or check GPS.',
          });
        } else {
          resolve({
            errorType: 'unavailable',
            message: 'Unable to determine current GPS position.',
          });
        }
      },
      {
        enableHighAccuracy: false,
        timeout: 12000,
        maximumAge: 300000,
      }
    );
  });
}

export async function fetchNearbyHospitals(
  coords: UserCoordinates,
  language: SupportedLanguage
): Promise<NearbyHospitalsResponse> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return {
      hospitals: [],
      error: 'Offline mode active — nearby hospital directory requires internet, but 108 Ambulance dial works offline.',
    };
  }

  try {
    const response = await fetch('/api/hospitals/nearby', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        latitude: coords.latitude,
        longitude: coords.longitude,
        radiusMeters: 20000,
        languageCode: language,
      }),
    });

    const data = await response.json().catch(() => ({}));

    // Tier 2 Demo Key quota handling: check HTTP 429 or RESOURCE_EXHAUSTED
    if (
      response.status === 429 ||
      data?.quotaExceeded === true ||
      data?.error?.status === 'RESOURCE_EXHAUSTED'
    ) {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
      }
      return {
        hospitals: [],
        quotaExceeded: true,
        error: 'Google Maps lookup quota temporarily reached. Please use 108 Ambulance or local health helpline.',
      };
    }

    if (!response.ok) {
      return {
        hospitals: [],
        error: data?.message || 'Unable to load nearby hospitals right now.',
      };
    }

    return {
      hospitals: Array.isArray(data?.hospitals) ? data.hospitals : [],
    };
  } catch (err) {
    console.warn('Failed to fetch nearby hospitals:', err);
    return {
      hospitals: [],
      error: 'Network unavailable while searching nearby hospitals.',
    };
  }
}
