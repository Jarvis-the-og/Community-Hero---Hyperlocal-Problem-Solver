import { config } from '../../config/index.js';

export async function analyzeLocation(lat, lng) {
  const result = {
    lat,
    lng,
    address: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
    ward: null,
    landmark: null,
    road: null,
    nearbyPlaces: [],
  };

  if (!config.googleMapsApiKey) {
    return result;
  }

  try {
    const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${config.googleMapsApiKey}`;
    const geocodeRes = await fetch(geocodeUrl);
    const geocodeData = await geocodeRes.json();

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

    const placesUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=500&type=point_of_interest&key=${config.googleMapsApiKey}`;
    const placesRes = await fetch(placesUrl);
    const placesData = await placesRes.json();

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
