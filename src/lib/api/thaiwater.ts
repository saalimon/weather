import { fetchJson } from './http';

const BASE = 'https://api-v3.thaiwater.net/api/v1/thaiwater30/public';

type L10n = { th?: string; en?: string };

export interface RainStation {
  id: number;
  name: string;
  province: string;
  district: string;
  agency: string;
  lat: number;
  lon: number;
  rain1h: number;
  rain24h: number;
  time: string; // local Bangkok time, "YYYY-MM-DD HH:mm"
}

export interface WaterLevelStation {
  id: number;
  name: string;
  province: string;
  basin: string;
  agency: string;
  lat: number;
  lon: number;
  levelMsl: number | null;
  storagePercent: number | null;
  situation: Situation;
  time: string;
}

export type SituationLevel = 0 | 1 | 2 | 3 | 4 | 5;

export interface Situation {
  level: SituationLevel;
  label: string;
  color: string;
}

/** ThaiWater's own bank-full % scale (rule_web): >100 overflow, >70 high, >30 normal, >10 low, else critical low. */
export function situationFor(storagePercent: number | null): Situation {
  if (storagePercent == null || !Number.isFinite(storagePercent)) return { level: 0, label: 'No data', color: '#666666' };
  if (storagePercent > 100) return { level: 5, label: 'Overflowing bank', color: '#ff3b30' };
  if (storagePercent > 70) return { level: 4, label: 'High water', color: '#2f7bff' };
  if (storagePercent > 30) return { level: 3, label: 'Normal', color: '#22c55e' };
  if (storagePercent > 10) return { level: 2, label: 'Low water', color: '#ffc000' };
  return { level: 1, label: 'Critically low', color: '#c2571a' };
}

/** Rain intensity scale for 24h accumulation (mm), loosely after TMD categories. */
export const RAIN_SCALE = [
  { min: 90.1, color: '#d44df0', label: 'Very heavy  > 90' },
  { min: 35.1, color: '#ff5577', label: 'Heavy  35–90' },
  { min: 10.1, color: '#ff7a3d', label: 'Moderate  10–35' },
  { min: 0.1, color: '#4cc3ff', label: 'Light  0.1–10' },
] as const;

export function rainColor(mm: number): string | null {
  for (const s of RAIN_SCALE) if (mm >= s.min) return s.color;
  return null;
}

const l = (v: L10n | undefined, prefer: 'en' | 'th' = 'en') => (v?.[prefer] || v?.th || v?.en || '').trim();

export function parseRain(payload: any): RainStation[] {
  const rows: any[] = payload?.data ?? [];
  const out: RainStation[] = [];
  for (const r of rows) {
    const lat = Number(r.station?.tele_station_lat);
    const lon = Number(r.station?.tele_station_long);
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || (lat === 0 && lon === 0)) continue;
    out.push({
      id: r.station?.id ?? r.id,
      name: l(r.station?.tele_station_name, 'th') || `Station ${r.station?.id}`,
      province: l(r.geocode?.province_name),
      district: l(r.geocode?.amphoe_name),
      agency: l(r.agency?.agency_shortname),
      lat,
      lon,
      rain1h: Number(r.rain_1h) || 0,
      rain24h: Number(r.rain_24h) || 0,
      time: r.rainfall_datetime,
    });
  }
  return out;
}

export function parseWaterLevel(payload: any): WaterLevelStation[] {
  const wl = payload?.waterlevel_data;
  const rows: any[] = Array.isArray(wl) ? wl : (wl?.data ?? []);
  const out: WaterLevelStation[] = [];
  for (const r of rows) {
    const lat = Number(r.station?.tele_station_lat);
    const lon = Number(r.station?.tele_station_long);
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || (lat === 0 && lon === 0)) continue;
    const pct = r.storage_percent == null ? null : Number(r.storage_percent);
    const msl = r.waterlevel_msl == null ? null : Number(r.waterlevel_msl);
    out.push({
      id: r.station?.id ?? r.id,
      name: l(r.station?.tele_station_name),
      province: l(r.geocode?.province_name),
      basin: l(r.basin?.basin_name),
      agency: l(r.agency?.agency_shortname),
      lat,
      lon,
      levelMsl: Number.isFinite(msl) ? msl : null,
      storagePercent: pct != null && Number.isFinite(pct) ? pct : null,
      situation: situationFor(pct),
      time: r.waterlevel_datetime,
    });
  }
  return out;
}

export async function fetchRain(): Promise<RainStation[]> {
  return parseRain(await fetchJson(`${BASE}/rain_24h`, { timeoutMs: 45_000 }));
}

export async function fetchWaterLevel(): Promise<WaterLevelStation[]> {
  return parseWaterLevel(await fetchJson(`${BASE}/waterlevel_load`, { timeoutMs: 45_000 }));
}
