import { fetchJson, qs } from '../api/http';
import { fetchAirQuality, fetchForecast, fetchSeasonal, type AirQuality, type Forecast, type Seasonal } from '../api/openmeteo';
import { fetchRadarFrames, type RadarFrame } from '../api/rainviewer';
import { fetchRain, fetchWaterLevel, type RainStation, type WaterLevelStation } from '../api/thaiwater';
import { fetchGistda, type GistdaSnapshot } from '../api/gistda';

export type Tab = 'now' | 'nowcast' | 'hourly' | 'daily' | 'seasonal';

export const TABS: { id: Tab; label: string; hint: string }[] = [
  { id: 'now', label: 'Now', hint: 'Current conditions' },
  { id: 'nowcast', label: 'Nowcast', hint: 'Next 6 hours, 15-min steps' },
  { id: 'hourly', label: '48 h', hint: 'Short-range, hourly' },
  { id: 'daily', label: '16 days', hint: 'Medium-range, daily' },
  { id: 'seasonal', label: 'Seasonal', hint: 'Long-range, 6 months' },
];

export interface Loc {
  lat: number;
  lon: number;
  name: string;
  detail?: string;
}

export interface Resource<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
  updated: number | null;
}

export type LayerId = 'radar' | 'satellite' | 'rain' | 'water' | 'hotspots' | 'flood';

const BANGKOK: Loc = { lat: 13.7563, lon: 100.5018, name: 'Bangkok', detail: 'Thailand' };

const empty = <T>(): Resource<T> => ({ data: null, error: null, loading: false, updated: null });

async function load<T>(res: Resource<T>, fn: () => Promise<T>, isCurrent: () => boolean = () => true) {
  res.loading = true;
  try {
    const data = await fn();
    if (!isCurrent()) return;
    res.data = data;
    res.error = null;
    res.updated = Date.now();
  } catch (err) {
    if (!isCurrent()) return;
    res.error = (err as Error).message || 'Unavailable';
  } finally {
    if (isCurrent()) res.loading = false;
  }
}

function locFromHash(): Loc | null {
  const m = location.hash.match(/^#(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)(?:,(.+))?$/);
  if (!m) return null;
  const lat = Number(m[1]);
  const lon = Number(m[2]);
  if (Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
  return { lat, lon, name: m[3] ? decodeURIComponent(m[3]) : `${lat.toFixed(2)}, ${lon.toFixed(2)}` };
}

class AppState {
  location = $state<Loc>(locFromHash() ?? BANGKOK);
  tab = $state<Tab>('now');
  darkBase = $state(true);
  layers = $state<Record<LayerId, boolean>>({
    radar: true,
    satellite: false,
    rain: true,
    water: false,
    hotspots: true,
    flood: true,
  });

  forecast = $state<Resource<Forecast>>(empty());
  air = $state<Resource<AirQuality>>(empty());
  seasonal = $state<Resource<Seasonal>>(empty());
  rain = $state<Resource<RainStation[]>>(empty());
  water = $state<Resource<WaterLevelStation[]>>(empty());
  radar = $state<Resource<RadarFrame[]>>(empty());
  gistda = $state<Resource<GistdaSnapshot>>(empty());

  radarIndex = $state(0);
  radarPlaying = $state(true);

  #locToken = 0;
  #seasonalFor = '';

  get locKey() {
    return `${this.location.lat.toFixed(3)},${this.location.lon.toFixed(3)}`;
  }

  select(loc: Loc, opts: { reverse?: boolean } = {}) {
    this.location = loc;
    history.replaceState(null, '', `#${loc.lat.toFixed(4)},${loc.lon.toFixed(4)},${encodeURIComponent(loc.name)}`);
    this.loadLocation();
    if (opts.reverse) this.#reverseName(loc);
  }

  /** Follow manual edits / shared links of the #lat,lon,name hash. */
  syncFromHash = () => {
    const loc = locFromHash();
    if (loc && `${loc.lat.toFixed(3)},${loc.lon.toFixed(3)}` !== this.locKey) {
      this.location = loc;
      this.loadLocation();
    }
  };

  loadLocation() {
    const token = ++this.#locToken;
    const current = () => token === this.#locToken;
    const { lat, lon } = this.location;
    load(this.forecast, () => fetchForecast(lat, lon), current);
    load(this.air, () => fetchAirQuality(lat, lon), current);
    if (this.tab === 'seasonal') this.ensureSeasonal();
  }

  ensureSeasonal() {
    const key = this.locKey;
    if (this.#seasonalFor === key && (this.seasonal.data || this.seasonal.loading)) return;
    this.#seasonalFor = key;
    const { lat, lon } = this.location;
    this.seasonal.data = null;
    load(this.seasonal, () => fetchSeasonal(lat, lon), () => this.#seasonalFor === key);
  }

  loadRadar = async () => {
    await load(this.radar, fetchRadarFrames);
    const frames = this.radar.data ?? [];
    const lastPast = frames.findLastIndex((f) => !f.nowcast);
    this.radarIndex = Math.max(0, lastPast);
  };
  loadRain = () => load(this.rain, fetchRain);
  loadWater = () => load(this.water, fetchWaterLevel);
  loadGistda = () => load(this.gistda, fetchGistda);

  async #reverseName(loc: Loc) {
    const token = this.#locToken;
    try {
      const r = await fetchJson<{ name?: string; address?: Record<string, string> }>(
        `https://nominatim.openstreetmap.org/reverse?${qs({ format: 'jsonv2', lat: loc.lat, lon: loc.lon, zoom: 12, 'accept-language': 'en' })}`,
        { timeoutMs: 8000 },
      );
      if (token !== this.#locToken) return;
      const a = r.address ?? {};
      const name = a.city || a.town || a.village || a.suburb || a.county || r.name;
      const detail = [a.state || a.province, a.country].filter(Boolean).join(', ');
      if (name) {
        this.location = { ...loc, name, detail };
        history.replaceState(null, '', `#${loc.lat.toFixed(4)},${loc.lon.toFixed(4)},${encodeURIComponent(name)}`);
      }
    } catch {
      /* keep coordinate label */
    }
  }
}

export const app = new AppState();
