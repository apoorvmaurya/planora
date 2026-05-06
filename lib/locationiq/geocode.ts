const LOCATIONIQ_KEY = process.env.NEXT_PUBLIC_LOCATIONIQ_KEY;

export async function autocomplete(query: string) {
  if (!LOCATIONIQ_KEY || !query || query.length < 2) return [];

  try {
    const res = await fetch(
      `https://us1.locationiq.com/v1/autocomplete?key=${LOCATIONIQ_KEY}&q=${encodeURIComponent(query)}&format=json`
    );
    if (!res.ok) throw new Error("Failed to fetch autocomplete data");
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("LocationIQ Autocomplete Error:", error);
    return [];
  }
}

export async function reverseGeocode(lat: number, lng: number) {
  if (!LOCATIONIQ_KEY) return null;

  try {
    const res = await fetch(
      `https://us1.locationiq.com/v1/reverse?key=${LOCATIONIQ_KEY}&lat=${lat}&lon=${lng}&format=json`
    );
    if (!res.ok) throw new Error("Failed to fetch reverse geocode data");
    return await res.json();
  } catch (error) {
    console.error("LocationIQ Reverse Geocode Error:", error);
    return null;
  }
}
