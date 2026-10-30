import { fetchJson } from './http';

export interface RadarFrame {
  time: number; // unix seconds
  url: string; // Leaflet tile template
  nowcast: boolean;
}

interface Maps {
  host: string;
  radar: { past: { time: number; path: string }[]; nowcast?: { time: number; path: string }[] };
}

/** Color scheme 2 (universal blue), smoothed, snow shown. */
export function frameUrl(host: string, path: string): string {
  return `${host}${path}/256/{z}/{x}/{y}/2/1_1.png`;
}

export function parseFrames(maps: Maps): RadarFrame[] {
  const past = maps.radar.past.map((f) => ({ time: f.time, url: frameUrl(maps.host, f.path), nowcast: false }));
  const next = (maps.radar.nowcast ?? []).map((f) => ({ time: f.time, url: frameUrl(maps.host, f.path), nowcast: true }));
  return [...past, ...next].sort((a, b) => a.time - b.time);
}

export async function fetchRadarFrames(): Promise<RadarFrame[]> {
  return parseFrames(await fetchJson<Maps>('https://api.rainviewer.com/public/weather-maps.json'));
}

/** Himawari-9 AHI band 13 (clean IR) via NASA GIBS: latest 10-minute geostationary frame. */
export const HIMAWARI_IR_URL =
  'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/Himawari_AHI_Band13_Clean_Infrared/default/default/GoogleMapsCompatible_Level6/{z}/{y}/{x}.png';
