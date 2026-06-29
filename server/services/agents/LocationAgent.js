import { config } from '../../config/index.js';
import {
  buildMapsCacheKey,
  normalizeCoordinates,
  withGovernedRequest,
} from '../governance/index.js';

export async function analyzeLocation(lat, lng) {
  const coords = normalizeCoordinates(lat, lng, 5);
  const result = {
    lat: coords.lat,
    lng: coords.lng,
    address: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
    ward: null,
    landmark: null,
    road: null,
    nearbyPlaces: [],
  };

  if (!config.flags.enableMaps || !config.googleMapsApiKey) {
    return result;
  }

  try {
    const geocodeData = await withGovernedRequest({
      api: 'maps',
      operation: 'reverse_geocode',
      cacheKey: buildMapsCacheKey('reverse_geocode', coords),
      cacheTtlMs: 24 * 60 * 60 * 1000,
      timeoutMs: 10_000,
      appDailyLimit: 400,
      metadata: coords,
      requestFn: async ({ signal }) => {
        const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${coords.lat},${coords.lng}&key=${config.googleMapsApiKey}`;
        const geocodeRes = await fetch(geocodeUrl, { signal });
        const data = await geocodeRes.json();
        if (!geocodeRes.ok) {
          const error = new Error(`Reverse geocoding failed: ${geocodeRes.status}`);
          error.status = geocodeRes.status;
          throw error;
        }
        if (data.status && data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
          const error = new Error(`Reverse geocoding failed: ${data.status}`);
          error.status = data.status === 'OVER_QUERY_LIMIT' ? 429 : 502;
          throw error;
        }
        return data;
      },
    });

    if (geocodeData.results?.[0]) {
      const place = geocodeData.results[0];
      result.address = place.formatted_address;

      for (const component of place.address_components || []) {
        if (component.types.includes('sublocality') || component.types.includes('neighborhood')) {
          result.ward = component.long_name;
        }
        if (component.types.includes('route')) {
          result.road = component.long_name;
        }
      }
    }

    const placesData = await withGovernedRequest({
      api: 'maps',
      operation: 'places_nearby',
      cacheKey: buildMapsCacheKey('places_nearby', coords),
      cacheTtlMs: 6 * 60 * 60 * 1000,
      timeoutMs: 10_000,
      appDailyLimit: 200,
      metadata: coords,
      requestFn: async ({ signal }) => {
        const placesUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${coords.lat},${coords.lng}&radius=500&type=point_of_interest&key=${config.googleMapsApiKey}`;
        const placesRes = await fetch(placesUrl, { signal });
        const data = await placesRes.json();
        if (!placesRes.ok) {
          const error = new Error(`Places lookup failed: ${placesRes.status}`);
          error.status = placesRes.status;
          throw error;
        }
        if (data.status && data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
          const error = new Error(`Places lookup failed: ${data.status}`);
          error.status = data.status === 'OVER_QUERY_LIMIT' ? 429 : 502;
          throw error;
        }
        return data;
      },
    });

    if (placesData.results?.length > 0) {
      result.landmark = placesData.results[0].name;
      result.nearbyPlaces = placesData.results.slice(0, 5).map((p) => ({
        name: p.name,
        type: p.types?.[0],
        distance: p.geometry?.location,
      }));
    }
  } catch (error) {
    console.error('LocationAgent error:', error.message);
  }

  return result;
}

export async function reverseGeocode(lat, lng) {
  const location = await analyzeLocation(lat, lng);
  return location.address;
}

export const LocationAgent = { analyzeLocation, reverseGeocode };
