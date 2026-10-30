#!/usr/bin/env node
// Fetch GISTDA disaster layers (VIIRS fire hotspots, flood extent) into
// public/data/gistda.json so the static site can show them without exposing the
// API key. Runs in GitHub Actions with the GISTDA_API_KEY repository secret.
//
//   GISTDA_API_KEY=xxxx node scripts/fetch-gistda.mjs
//
// Register for a free key at https://api-gateway.gistda.or.th/

import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = resolve(dirname(fileURLToPath(import.meta.url)), '../public/data/gistda.json');
const BASE = process.env.GISTDA_BASE ?? 'https://api-gateway.gistda.or.th/api/2.0/resources/features';
const KEY = process.env.GISTDA_API_KEY?.trim();
const PAGE = 1000;
const MAX_FEATURES = 20_000;
const MAX_BYTES = 8 * 1024 * 1024;

const LAYERS = {
  hotspots: process.env.GISTDA_HOTSPOT_PATH ?? 'viirs/1day',
  flood: process.env.GISTDA_FLOOD_PATH ?? 'flood/1day',
};

async function fetchPage(path, offset) {
  const url = `${BASE}/${path}?limit=${PAGE}&offset=${offset}`;
  const res = await fetch(url, {
    headers: { 'API-Key': KEY, accept: 'application/json' },
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) throw new Error(`${path}: HTTP ${res.status} ${(await res.text()).trim().slice(0, 160)}`);
  return res.json();
}

/** Page through an OGC-API-Features style endpoint into one FeatureCollection. */
async function fetchCollection(path) {
  const features = [];
  for (let offset = 0; offset < MAX_FEATURES; offset += PAGE) {
    const body = await fetchPage(path, offset);
    const page = body.features ?? body.data?.features ?? body.data ?? [];
    if (!Array.isArray(page)) throw new Error(`${path}: unexpected response shape`);
    features.push(...page.filter((f) => f?.geometry));
    const total = body.numberMatched ?? body.totalFeatures ?? body.total;
    if (page.length < PAGE || (typeof total === 'number' && features.length >= total)) break;
  }
  return { type: 'FeatureCollection', features };
}

/** Round coordinates to ~10 m to keep the snapshot small. */
function shrink(fc) {
  const r = (v) => (typeof v === 'number' ? Math.round(v * 1e4) / 1e4 : Array.isArray(v) ? v.map(r) : v);
  for (const f of fc.features) f.geometry.coordinates = r(f.geometry.coordinates);
  return fc;
}

async function main() {
  const snap = { status: 'not_configured', generated: new Date().toISOString(), hotspots: null, flood: null, errors: [] };

  if (!KEY) {
    console.log('GISTDA_API_KEY not set; writing not_configured snapshot.');
  } else {
    let ok = 0;
    for (const [name, path] of Object.entries(LAYERS)) {
      try {
        const fc = shrink(await fetchCollection(path));
        snap[name] = fc;
        ok++;
        console.log(`${name}: ${fc.features.length} features`);
      } catch (err) {
        snap.errors.push(`${name}: ${err.message}`);
        console.warn(`${name} failed: ${err.message}`);
      }
    }
    snap.status = ok === Object.keys(LAYERS).length ? 'ok' : ok > 0 ? 'partial' : 'error';
  }

  let json = JSON.stringify(snap);
  if (json.length > MAX_BYTES && snap.flood) {
    snap.errors.push(`flood: dropped, snapshot exceeded ${MAX_BYTES} bytes`);
    snap.flood = null;
    snap.status = snap.hotspots ? 'partial' : 'error';
    json = JSON.stringify(snap);
  }

  await mkdir(dirname(OUT), { recursive: true });
  await writeFile(OUT, json);
  console.log(`Wrote ${OUT} (${(json.length / 1024).toFixed(0)} KB, status ${snap.status})`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
