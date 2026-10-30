const R = 6371; // km

export function distanceKm(aLat: number, aLon: number, bLat: number, bLon: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLon = toRad(bLon - aLon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function nearest<T extends { lat: number; lon: number }>(
  items: T[],
  lat: number,
  lon: number,
  maxKm = Infinity,
): { item: T; km: number } | null {
  let best: { item: T; km: number } | null = null;
  for (const item of items) {
    const km = distanceKm(lat, lon, item.lat, item.lon);
    if (km <= maxKm && (!best || km < best.km)) best = { item, km };
  }
  return best;
}
