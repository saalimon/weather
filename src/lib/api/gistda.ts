import type { FeatureCollection } from 'geojson';
import { fetchJson } from './http';

/**
 * GISTDA data is fetched server-side by a scheduled GitHub Actions job (the API key
 * stays a repository secret) and published next to the site as data/gistda.json.
 */
export interface GistdaSnapshot {
  status: 'ok' | 'partial' | 'not_configured' | 'error';
  generated: string | null;
  hotspots: FeatureCollection | null;
  flood: FeatureCollection | null;
  errors: string[];
}

export async function fetchGistda(): Promise<GistdaSnapshot> {
  try {
    const snap = await fetchJson<GistdaSnapshot>(`${import.meta.env.BASE_URL}data/gistda.json`, { cache: 'no-cache' });
    if (!snap || typeof snap !== 'object' || !('status' in snap)) throw new Error('bad snapshot');
    return snap;
  } catch {
    return { status: 'not_configured', generated: null, hotspots: null, flood: null, errors: [] };
  }
}
