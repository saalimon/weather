<script lang="ts">
  import L from 'leaflet';
  import { onMount } from 'svelte';
  import 'leaflet/dist/leaflet.css';
  import { prefersReducedMotion } from 'svelte/motion';
  import { app } from '../state/app.svelte';
  import { HIMAWARI_IR_URL } from '../api/rainviewer';
  import { rainColor } from '../api/thaiwater';

  const THAILAND = L.latLngBounds([5.6, 97.3], [20.5, 105.7]);

  let el: HTMLDivElement;
  let map = $state<L.Map | null>(null);
  let base: L.TileLayer;
  let marker: L.Marker;

  const esc = (s: unknown) =>
    String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

  // ---- map lifecycle -------------------------------------------------------
  onMount(() => {
    const m = L.map(el, {
      zoomControl: false,
      minZoom: 3,
      maxZoom: 14,
      worldCopyJump: true,
      zoomSnap: 0.5,
    });
    // Frame Thailand inside the part of the map not covered by the floating panels.
    const desktop = window.innerWidth >= 810;
    m.fitBounds(THAILAND, {
      paddingTopLeft: desktop ? [470, 20] : [10, 10],
      paddingBottomRight: desktop ? [330, 20] : [10, window.innerHeight * 0.42],
    });

    L.control.zoom({ position: 'bottomright' }).addTo(m);
    m.attributionControl.setPrefix(false);

    // OSM standard tiles; darkened with a CSS filter to sit on the black canvas.
    base = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(m);

    for (const [name, z] of [
      ['sat', 330],
      ['radar', 350],
      ['flood', 370],
      ['stations', 420],
    ] as const) {
      m.createPane(name).style.zIndex = String(z);
    }
    m.getPane('sat')!.style.mixBlendMode = 'screen';
    m.getPane('sat')!.style.pointerEvents = 'none';
    m.getPane('radar')!.style.pointerEvents = 'none';

    marker = L.marker([app.location.lat, app.location.lon], {
      icon: L.divIcon({ className: 'loc-marker', html: '<span class="ring"></span><span class="dot"></span>', iconSize: [20, 20] }),
      keyboard: false,
      interactive: false,
      zIndexOffset: 1000,
    }).addTo(m);

    m.on('click', (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng.wrap();
      app.select({ lat, lon: lng, name: `${lat.toFixed(2)}°, ${lng.toFixed(2)}°` }, { reverse: true });
    });

    map = m;
    return () => {
      m.remove();
      map = null;
    };
  });

  // ---- base map theme ------------------------------------------------------
  $effect(() => {
    if (!map) return;
    base.getContainer()?.classList.toggle('basemap-dark', app.darkBase);
  });

  // ---- selected location ---------------------------------------------------
  $effect(() => {
    if (!map) return;
    const ll = L.latLng(app.location.lat, app.location.lon);
    marker.setLatLng(ll);
    const padded = map.getBounds().pad(-0.15);
    if (!padded.contains(ll)) {
      const zoom = Math.max(map.getZoom(), 7);
      if (prefersReducedMotion.current) map.setView(ll, zoom);
      else map.flyTo(ll, zoom, { duration: 0.9, easeLinearity: 0.2 });
    }
  });

  // ---- satellite (Himawari IR) ---------------------------------------------
  $effect(() => {
    if (!map || !app.layers.satellite) return;
    const layer = L.tileLayer(HIMAWARI_IR_URL, {
      pane: 'sat',
      opacity: 0.5,
      maxNativeZoom: 6,
      maxZoom: 14,
      attribution: 'Himawari-9 IR &copy; <a href="https://earthdata.nasa.gov/gibs">NASA GIBS</a>',
    }).addTo(map);
    // GIBS "default" resolves to the newest 10-min frame; re-request periodically.
    const t = setInterval(() => layer.setUrl(`${HIMAWARI_IR_URL}?t=${Date.now()}`), 10 * 60_000);
    return () => {
      clearInterval(t);
      layer.remove();
    };
  });

  // ---- radar (RainViewer) --------------------------------------------------
  const radarLayers = new Map<string, L.TileLayer>();

  function radarLayer(url: string) {
    let layer = radarLayers.get(url);
    if (!layer) {
      layer = L.tileLayer(url, {
        pane: 'radar',
        opacity: 0,
        maxNativeZoom: 7,
        maxZoom: 14,
        tileSize: 256,
        className: 'radar-frame',
        attribution: 'Radar &copy; <a href="https://www.rainviewer.com/api.html">RainViewer</a>',
      });
      radarLayers.set(url, layer);
    }
    return layer;
  }

  $effect(() => {
    const frames = app.radar.data;
    const on = app.layers.radar;
    const idx = app.radarIndex;
    if (!map) return;
    const m = map;
    if (!on || !frames?.length) {
      radarLayers.forEach((l) => l.remove());
      return;
    }
    const keep = new Set(frames.map((f) => f.url));
    for (const [url, l] of radarLayers) {
      if (!keep.has(url)) {
        l.remove();
        radarLayers.delete(url);
      }
    }
    const cur = frames[Math.min(idx, frames.length - 1)];
    const next = frames[(idx + 1) % frames.length];
    for (const f of [cur, next]) {
      const l = radarLayer(f.url);
      if (!m.hasLayer(l)) l.addTo(m);
    }
    radarLayers.forEach((l, url) => l.setOpacity(url === cur.url ? 0.78 : 0));
  });

  // ---- ThaiWater rain stations ---------------------------------------------
  $effect(() => {
    const rows = app.rain.data;
    if (!map || !app.layers.rain || !rows) return;
    const renderer = L.canvas({ pane: 'stations', padding: 0.3 });
    const group = L.layerGroup();
    const wet = rows.filter((r) => r.rain24h > 0).sort((a, b) => a.rain24h - b.rain24h);
    for (const r of wet) {
      const color = rainColor(r.rain24h)!;
      L.circleMarker([r.lat, r.lon], {
        renderer,
        radius: Math.min(11, 2.5 + Math.sqrt(r.rain24h) * 0.75),
        color,
        weight: 1,
        opacity: 0.9,
        fillColor: color,
        fillOpacity: 0.55,
      })
        .bindPopup(
          `<b>${esc(r.name)}</b><br><span style="color:#999">${esc([r.district, r.province].filter(Boolean).join(', '))}</span><br>` +
            `Rain 24 h: <b>${r.rain24h.toFixed(1)} mm</b> · 1 h: ${r.rain1h.toFixed(1)} mm<br>` +
            `<span style="color:#999">${esc(r.time)} · ${esc(r.agency)} via ThaiWater</span>`,
        )
        .addTo(group);
    }
    group.addTo(map);
    return () => {
      group.remove();
    };
  });

  // ---- ThaiWater water level -----------------------------------------------
  $effect(() => {
    const rows = app.water.data;
    if (!map || !app.layers.water || !rows) return;
    const renderer = L.canvas({ pane: 'stations', padding: 0.3 });
    const group = L.layerGroup();
    for (const r of [...rows].sort((a, b) => a.situation.level - b.situation.level)) {
      if (r.situation.level === 0) continue;
      const critical = r.situation.level === 5;
      L.circleMarker([r.lat, r.lon], {
        renderer,
        radius: critical ? 7 : 5,
        color: critical ? '#ffffff' : r.situation.color,
        weight: critical ? 1.5 : 1,
        fillColor: r.situation.color,
        fillOpacity: 0.85,
      })
        .bindPopup(
          `<b>${esc(r.name)}</b><br><span style="color:#999">${esc([r.basin, r.province].filter(Boolean).join(' · '))}</span><br>` +
            `<span style="color:${r.situation.color}">●</span> ${esc(r.situation.label)} — <b>${r.storagePercent?.toFixed(0)}%</b> of bank<br>` +
            (r.levelMsl != null ? `Level ${r.levelMsl.toFixed(2)} m MSL<br>` : '') +
            `<span style="color:#999">${esc(r.time)} · ${esc(r.agency)} via ThaiWater</span>`,
        )
        .addTo(group);
    }
    group.addTo(map);
    return () => {
      group.remove();
    };
  });

  // ---- GISTDA hotspots + flood ---------------------------------------------
  $effect(() => {
    const fc = app.gistda.data?.flood;
    if (!map || !app.layers.flood || !fc?.features?.length) return;
    const layer = L.geoJSON(fc, {
      pane: 'flood',
      style: { color: '#4cc3ff', weight: 0.6, fillColor: '#4cc3ff', fillOpacity: 0.35 },
      attribution: 'Flood &copy; GISTDA',
    }).addTo(map);
    return () => {
      layer.remove();
    };
  });

  $effect(() => {
    const fc = app.gistda.data?.hotspots;
    if (!map || !app.layers.hotspots || !fc?.features?.length) return;
    const renderer = L.canvas({ pane: 'stations' });
    const layer = L.geoJSON(fc, {
      pointToLayer: (_f, ll) =>
        L.circleMarker(ll, { renderer, radius: 3.5, color: '#ff7a3d', weight: 1, fillColor: '#ffb36b', fillOpacity: 0.9 }),
      onEachFeature: (f, l) => {
        const p = (f.properties ?? {}) as Record<string, unknown>;
        const where = [p.pv_en ?? p.pv_tn, p.ap_en ?? p.ap_tn].filter(Boolean).join(', ');
        l.bindPopup(
          `<b>VIIRS fire hotspot</b><br>${esc(where)}<br><span style="color:#999">${esc(p.acq_date ?? '')} ${esc(p.acq_time ?? '')} · GISTDA</span>`,
        );
      },
      attribution: 'Hotspots &copy; GISTDA',
    }).addTo(map);
    return () => {
      layer.remove();
    };
  });
</script>

<div class="map" bind:this={el} role="application" aria-label="Weather map. Click to select a location."></div>

<style>
  .map {
    position: absolute;
    inset: 0;
  }
  :global(.loc-marker) {
    position: relative;
  }
  :global(.loc-marker .dot) {
    position: absolute;
    inset: 5px;
    border-radius: 50%;
    background: #fff;
    box-shadow: 0 0 0 3px rgba(0, 0, 0, 0.6);
  }
  :global(.loc-marker .ring) {
    position: absolute;
    inset: 0;
    border-radius: 50%;
    border: 2px solid rgba(255, 255, 255, 0.8);
    animation: ping 2.2s var(--ease-out) infinite;
  }
  @keyframes ping {
    from {
      transform: scale(0.6);
      opacity: 1;
    }
    to {
      transform: scale(2.6);
      opacity: 0;
    }
  }
</style>
