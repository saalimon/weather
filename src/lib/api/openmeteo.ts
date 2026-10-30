import { fetchJson, qs } from './http';

const FORECAST = 'https://api.open-meteo.com/v1/forecast';
const SEASONAL = 'https://seasonal-api.open-meteo.com/v1/seasonal';
const AIR = 'https://air-quality-api.open-meteo.com/v1/air-quality';
const GEOCODE = 'https://geocoding-api.open-meteo.com/v1/search';

export interface Current {
  time: string;
  temperature: number;
  apparent: number;
  humidity: number;
  precipitation: number;
  code: number;
  isDay: boolean;
  cloudCover: number;
  pressure: number;
  windSpeed: number;
  windDir: number;
  windGust: number;
  uv: number | null;
}

export interface Forecast {
  timezone: string;
  utcOffset: number;
  current: Current;
  nowcast: { time: number[]; precipitation: number[]; temperature: number[] };
  hourly: {
    time: number[];
    temperature: number[];
    precipProb: (number | null)[];
    precipitation: number[];
    code: number[];
    wind: number[];
    humidity: number[];
  };
  daily: {
    time: number[];
    code: number[];
    tMax: number[];
    tMin: number[];
    precipSum: number[];
    precipProb: (number | null)[];
    windMax: number[];
    uvMax: (number | null)[];
    sunrise: number[];
    sunset: number[];
  };
}

export async function fetchForecast(lat: number, lon: number): Promise<Forecast> {
  const url = `${FORECAST}?${qs({
    latitude: lat.toFixed(4),
    longitude: lon.toFixed(4),
    timezone: 'auto',
    timeformat: 'unixtime',
    wind_speed_unit: 'kmh',
    current: [
      'temperature_2m',
      'apparent_temperature',
      'relative_humidity_2m',
      'precipitation',
      'weather_code',
      'is_day',
      'cloud_cover',
      'surface_pressure',
      'wind_speed_10m',
      'wind_direction_10m',
      'wind_gusts_10m',
      'uv_index',
    ],
    minutely_15: ['precipitation', 'temperature_2m'],
    forecast_minutely_15: 24,
    hourly: [
      'temperature_2m',
      'precipitation_probability',
      'precipitation',
      'weather_code',
      'wind_speed_10m',
      'relative_humidity_2m',
    ],
    forecast_hours: 48,
    daily: [
      'weather_code',
      'temperature_2m_max',
      'temperature_2m_min',
      'precipitation_sum',
      'precipitation_probability_max',
      'wind_speed_10m_max',
      'uv_index_max',
      'sunrise',
      'sunset',
    ],
    forecast_days: 16,
  })}`;
  const d = await fetchJson<any>(url);
  const c = d.current;
  return {
    timezone: d.timezone,
    utcOffset: d.utc_offset_seconds,
    current: {
      time: c.time,
      temperature: c.temperature_2m,
      apparent: c.apparent_temperature,
      humidity: c.relative_humidity_2m,
      precipitation: c.precipitation,
      code: c.weather_code,
      isDay: c.is_day === 1,
      cloudCover: c.cloud_cover,
      pressure: c.surface_pressure,
      windSpeed: c.wind_speed_10m,
      windDir: c.wind_direction_10m,
      windGust: c.wind_gusts_10m,
      uv: c.uv_index ?? null,
    },
    nowcast: {
      time: d.minutely_15.time,
      precipitation: d.minutely_15.precipitation.map((v: number | null) => v ?? 0),
      temperature: d.minutely_15.temperature_2m,
    },
    hourly: {
      time: d.hourly.time,
      temperature: d.hourly.temperature_2m,
      precipProb: d.hourly.precipitation_probability,
      precipitation: d.hourly.precipitation.map((v: number | null) => v ?? 0),
      code: d.hourly.weather_code,
      wind: d.hourly.wind_speed_10m,
      humidity: d.hourly.relative_humidity_2m,
    },
    daily: {
      time: d.daily.time,
      code: d.daily.weather_code,
      tMax: d.daily.temperature_2m_max,
      tMin: d.daily.temperature_2m_min,
      precipSum: d.daily.precipitation_sum.map((v: number | null) => v ?? 0),
      precipProb: d.daily.precipitation_probability_max,
      windMax: d.daily.wind_speed_10m_max,
      uvMax: d.daily.uv_index_max,
      sunrise: d.daily.sunrise,
      sunset: d.daily.sunset,
    },
  };
}

export interface AirQuality {
  pm25: number | null;
  pm10: number | null;
  usAqi: number | null;
}

export async function fetchAirQuality(lat: number, lon: number): Promise<AirQuality> {
  const d = await fetchJson<any>(
    `${AIR}?${qs({ latitude: lat.toFixed(4), longitude: lon.toFixed(4), current: ['pm2_5', 'pm10', 'us_aqi'] })}`,
  );
  return { pm25: d.current?.pm2_5 ?? null, pm10: d.current?.pm10 ?? null, usAqi: d.current?.us_aqi ?? null };
}

export interface SeasonalWeek {
  start: string; // ISO date of week start
  tMax: Quantiles;
  tMin: Quantiles;
  precip: Quantiles; // weekly total, mm
}

export interface Quantiles {
  p10: number;
  p50: number;
  p90: number;
}

export interface Seasonal {
  members: number;
  weeks: SeasonalWeek[];
}

export async function fetchSeasonal(lat: number, lon: number): Promise<Seasonal> {
  const d = await fetchJson<any>(
    `${SEASONAL}?${qs({
      latitude: lat.toFixed(4),
      longitude: lon.toFixed(4),
      timezone: 'auto',
      daily: ['temperature_2m_max', 'temperature_2m_min', 'precipitation_sum'],
      forecast_days: 183,
    })}`,
    { timeoutMs: 30_000 },
  );
  return aggregateSeasonal(d.daily);
}

export function quantile(sorted: number[], q: number): number {
  if (sorted.length === 0) return NaN;
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

function quantiles(values: number[]): Quantiles {
  const s = [...values].sort((a, b) => a - b);
  return { p10: quantile(s, 0.1), p50: quantile(s, 0.5), p90: quantile(s, 0.9) };
}

/**
 * Collapse a daily ensemble (control `var` + `var_memberNN` columns) into weekly
 * member-spread quantiles: mean daily max/min temperature and total precipitation.
 * Weeks with fewer than 4 valid days are dropped.
 */
export function aggregateSeasonal(daily: Record<string, (number | null)[] | string[]>): Seasonal {
  const time = daily.time as string[];
  const columnsFor = (v: string) =>
    Object.keys(daily)
      .filter((k) => k === v || k.startsWith(`${v}_member`))
      .map((k) => daily[k] as (number | null)[]);
  const tmax = columnsFor('temperature_2m_max');
  const tmin = columnsFor('temperature_2m_min');
  const prcp = columnsFor('precipitation_sum');

  const weeks: SeasonalWeek[] = [];
  for (let start = 0; start < time.length; start += 7) {
    const end = Math.min(start + 7, time.length);
    const perMember = (cols: (number | null)[][], reduce: 'mean' | 'sum') =>
      cols
        .map((col) => {
          const vals = col.slice(start, end).filter((v): v is number => v != null && Number.isFinite(v));
          if (vals.length < 4) return null;
          const sum = vals.reduce((a, b) => a + b, 0);
          return reduce === 'sum' ? (sum / vals.length) * 7 : sum / vals.length;
        })
        .filter((v): v is number => v != null);
    const mx = perMember(tmax, 'mean');
    const mn = perMember(tmin, 'mean');
    const pr = perMember(prcp, 'sum');
    if (!mx.length || !mn.length || !pr.length) continue;
    weeks.push({ start: time[start], tMax: quantiles(mx), tMin: quantiles(mn), precip: quantiles(pr) });
  }
  return { members: tmax.length, weeks };
}

export interface Place {
  id: number;
  name: string;
  admin?: string;
  country?: string;
  lat: number;
  lon: number;
}

export async function searchPlaces(query: string, signal?: AbortSignal): Promise<Place[]> {
  if (query.trim().length < 2) return [];
  const d = await fetchJson<any>(`${GEOCODE}?${qs({ name: query.trim(), count: 8, language: 'en' })}`, { signal });
  return (d.results ?? []).map((r: any) => ({
    id: r.id,
    name: r.name,
    admin: r.admin1,
    country: r.country,
    lat: r.latitude,
    lon: r.longitude,
  }));
}

export interface NowcastSummary {
  raining: boolean;
  headline: string;
  startsInMin: number | null;
  totalMm: number;
}

/** Plain-language summary of the next hours of 15-minute precipitation. */
export function summarizeNowcast(time: number[], precip: number[], nowSec: number, threshold = 0.1): NowcastSummary {
  const idx = time.findIndex((t) => t + 15 * 60 > nowSec);
  const from = idx < 0 ? time.length : idx;
  const ahead = precip.slice(from);
  const aheadTime = time.slice(from);
  const totalMm = Math.round(ahead.reduce((a, b) => a + b, 0) * 10) / 10;
  const hours = Math.round((ahead.length * 15) / 60);
  if (ahead.length === 0) return { raining: false, headline: 'No nowcast data', startsInMin: null, totalMm: 0 };

  const raining = ahead[0] >= threshold;
  if (raining) {
    const stop = ahead.findIndex((v) => v < threshold);
    const headline =
      stop < 0
        ? `Rain continuing for the next ${hours} h`
        : `Rain easing in ~${Math.max(15, Math.round((aheadTime[stop] - nowSec) / 60 / 5) * 5)} min`;
    return { raining, headline, startsInMin: 0, totalMm };
  }
  const start = ahead.findIndex((v) => v >= threshold);
  if (start < 0) return { raining, headline: `No rain expected in the next ${hours} h`, startsInMin: null, totalMm };
  const mins = Math.max(15, Math.round((aheadTime[start] - nowSec) / 60 / 5) * 5);
  return { raining, headline: `Rain likely in ~${mins} min`, startsInMin: mins, totalMm };
}
