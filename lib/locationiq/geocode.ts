const LOCATIONIQ_KEY = process.env.NEXT_PUBLIC_LOCATIONIQ_KEY;

// ── In-Memory Cache to minimize API calls ──
const geocodeCache = new Map<string, { lat: number; lng: number; display_name: string } | null>();
const reverseCache = new Map<string, any>();
const autocompleteCache = new Map<string, any[]>();

// ── Throttling Queue to prevent concurrent rate limits ──
class RequestQueue {
  private lastRequestTime = 0;
  private minInterval = 650; // LocationIQ free tier limit is 2 req/sec; 650ms guarantees safe spacing

  async enqueue<T>(fn: () => Promise<T>): Promise<T> {
    const now = Date.now();
    const timeSinceLast = now - this.lastRequestTime;
    const timeToWait = Math.max(0, this.minInterval - timeSinceLast);

    if (timeToWait > 0) {
      await new Promise((resolve) => setTimeout(resolve, timeToWait));
    }

    this.lastRequestTime = Date.now();
    return fn();
  }
}

const geocodeQueue = new RequestQueue();

/**
 * Robust fetch wrapper with exponential backoff retry for rate limits (429) and network errors
 */
async function fetchWithRetry(url: string, retries = 3, baseDelay = 800): Promise<any> {
  let delay = baseDelay;
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url);
      
      if (res.status === 429) {
        console.warn(`[LocationIQ API] Rate limited (429). Retrying in ${delay}ms... (Attempt ${i + 1}/${retries})`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay *= 2; // Exponential backoff
        continue;
      }
      
      if (res.status === 404) {
        return null;
      }
      
      if (!res.ok) {
        throw new Error(`HTTP Error ${res.status}: ${res.statusText}`);
      }
      
      return await res.json();
    } catch (err) {
      if (i === retries - 1) {
        throw err;
      }
      console.warn(`[LocationIQ API] Request failed: ${err}. Retrying in ${delay}ms... (Attempt ${i + 1}/${retries})`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay *= 2;
    }
  }
  throw new Error("Request failed after maximum retries");
}

export async function autocomplete(query: string) {
  if (!LOCATIONIQ_KEY || !query || query.length < 2) return [];

  const cacheKey = query.trim().toLowerCase();
  if (autocompleteCache.has(cacheKey)) {
    return autocompleteCache.get(cacheKey)!;
  }

  try {
    const data = await geocodeQueue.enqueue(() =>
      fetchWithRetry(
        `https://us1.locationiq.com/v1/autocomplete?key=${LOCATIONIQ_KEY}&q=${encodeURIComponent(query)}&format=json`
      )
    );
    const result = Array.isArray(data) ? data : [];
    autocompleteCache.set(cacheKey, result);
    return result;
  } catch (error) {
    console.error("LocationIQ Autocomplete Error:", error);
    return [];
  }
}

export async function reverseGeocode(lat: number, lng: number) {
  if (!LOCATIONIQ_KEY) return null;

  const cacheKey = `${lat.toFixed(5)},${lng.toFixed(5)}`;
  if (reverseCache.has(cacheKey)) {
    return reverseCache.get(cacheKey);
  }

  try {
    const data = await geocodeQueue.enqueue(() =>
      fetchWithRetry(
        `https://us1.locationiq.com/v1/reverse?key=${LOCATIONIQ_KEY}&lat=${lat}&lon=${lng}&format=json`
      )
    );
    reverseCache.set(cacheKey, data);
    return data;
  } catch (error) {
    console.error("LocationIQ Reverse Geocode Error:", error);
    return null;
  }
}

export async function forwardGeocode(query: string, biasDestination?: string) {
  if (!LOCATIONIQ_KEY || !query) return null;

  let searchQuery = query;
  if (biasDestination) {
    const simpleDestination = biasDestination.split(',')[0].trim();
    if (simpleDestination && !query.toLowerCase().includes(simpleDestination.toLowerCase())) {
      searchQuery = `${query}, ${simpleDestination}`;
    }
  }

  const cacheKey = searchQuery.trim().toLowerCase();
  if (geocodeCache.has(cacheKey)) {
    return geocodeCache.get(cacheKey)!;
  }

  try {
    const data = await geocodeQueue.enqueue(() =>
      fetchWithRetry(
        `https://us1.locationiq.com/v1/search?key=${LOCATIONIQ_KEY}&q=${encodeURIComponent(searchQuery)}&format=json`
      )
    );

    if (Array.isArray(data) && data.length > 0) {
      const coords = {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon),
        display_name: data[0].display_name,
      };
      geocodeCache.set(cacheKey, coords);
      return coords;
    }

    // ── Fallback with Jitter if no specific venue is found ──
    if (biasDestination) {
      return await getBiasFallback(biasDestination, cacheKey);
    }

    return null;
  } catch (error) {
    console.error("LocationIQ Forward Geocode Error for query:", searchQuery, error);
    
    // ── Fallback with Jitter on persistent rate limits or failures ──
    if (biasDestination) {
      return await getBiasFallback(biasDestination, cacheKey);
    }
    
    return null;
  }
}

/**
 * Geocodes the general destination and applies a small random jitter to place
 * items naturally in the same city instead of at [0,0] in the ocean.
 */
async function getBiasFallback(biasDestination: string, cacheKey: string) {
  const simpleDest = biasDestination.split(',')[0].trim();
  const destCacheKey = `__fallback_dest_${simpleDest.toLowerCase()}`;

  let destCoords = geocodeCache.get(destCacheKey);
  
  if (destCoords === undefined) {
    try {
      const data = await geocodeQueue.enqueue(() =>
        fetchWithRetry(
          `https://us1.locationiq.com/v1/search?key=${LOCATIONIQ_KEY}&q=${encodeURIComponent(simpleDest)}&format=json`
        )
      );
      if (Array.isArray(data) && data.length > 0) {
        destCoords = {
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon),
          display_name: data[0].display_name,
        };
        geocodeCache.set(destCacheKey, destCoords);
      } else {
        destCoords = null;
      }
    } catch {
      destCoords = null;
    }
  }

  if (destCoords) {
    // Apply random jitter of approx ±1.5km (±0.015 degrees) so markers scatter nicely in the city
    const jitterLat = (Math.random() - 0.5) * 0.015;
    const jitterLng = (Math.random() - 0.5) * 0.015;
    const jitteredResult = {
      lat: destCoords.lat + jitterLat,
      lng: destCoords.lng + jitterLng,
      display_name: `${destCoords.display_name} (Estimated Area)`,
    };
    // Cache the specific query's fallback to prevent repeating this fallback process
    geocodeCache.set(cacheKey, jitteredResult);
    return jitteredResult;
  }

  return null;
}

/**
 * Enterprise geocoding wrapper that safely extracts coordinates from location names
 * using a search query biased toward the trip destination. Returns 0,0 on failure.
 */
export async function getCoordinatesForLocation(
  locationName: string,
  destinationName?: string
): Promise<{ lat: number; lng: number }> {
  try {
    const coords = await forwardGeocode(locationName, destinationName)
    if (coords) {
      return { lat: coords.lat, lng: coords.lng }
    }
  } catch (err) {
    console.error(`[Geocoding Helper] Failed for location "${locationName}" with destination "${destinationName}":`, err)
  }
  return { lat: 0, lng: 0 }
}

