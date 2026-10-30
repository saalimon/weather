const COMPASS = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];

export const compass = (deg: number) => COMPASS[Math.round((((deg % 360) + 360) % 360) / 22.5) % 16];

export const round = (v: number | null | undefined, digits = 0) =>
  v == null || !Number.isFinite(v) ? '–' : v.toFixed(digits);

/** Format a unix timestamp in the forecast location's own UTC offset. */
export function localTime(unix: number, utcOffset: number, opts: Intl.DateTimeFormatOptions): string {
  return new Date((unix + utcOffset) * 1000).toLocaleString('en-GB', { ...opts, timeZone: 'UTC' });
}

export function ago(fromMs: number, nowMs = Date.now()): string {
  const s = Math.max(0, Math.round((nowMs - fromMs) / 1000));
  if (s < 45) return 'just now';
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  return `${h} h ago`;
}

export function aqiBand(aqi: number | null): { label: string; color: string } {
  if (aqi == null) return { label: '–', color: 'var(--ink-muted)' };
  if (aqi <= 50) return { label: 'Good', color: '#22c55e' };
  if (aqi <= 100) return { label: 'Moderate', color: '#ffc000' };
  if (aqi <= 150) return { label: 'Unhealthy (sensitive)', color: '#ff7a3d' };
  if (aqi <= 200) return { label: 'Unhealthy', color: '#ff5577' };
  return { label: 'Very unhealthy', color: '#d44df0' };
}
