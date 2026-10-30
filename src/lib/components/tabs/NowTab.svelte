<script lang="ts">
  import { app } from '../../state/app.svelte';
  import { aqiBand, compass, round } from '../../format';
  import { distanceKm, nearest } from '../../geo';
  import { rise, stagger } from '../../motion';
  import AnimatedNumber from '../AnimatedNumber.svelte';

  const cur = $derived(app.forecast.data?.current);
  const air = $derived(app.air.data);
  const aqi = $derived(aqiBand(air?.usAqi ?? null));

  const stats = $derived(
    cur
      ? [
          { label: 'Humidity', value: cur.humidity, unit: '%', digits: 0 },
          { label: 'Wind', value: cur.windSpeed, unit: 'km/h', digits: 0, dir: cur.windDir },
          { label: 'Gusts', value: cur.windGust, unit: 'km/h', digits: 0 },
          { label: 'Rain now', value: cur.precipitation, unit: 'mm', digits: 1 },
          { label: 'Cloud cover', value: cur.cloudCover, unit: '%', digits: 0 },
          { label: 'Pressure', value: cur.pressure, unit: 'hPa', digits: 0 },
          { label: 'UV index', value: cur.uv, unit: '', digits: 1 },
          { label: 'PM2.5', value: air?.pm25 ?? null, unit: 'µg/m³', digits: 0, note: aqi },
        ]
      : [],
  );

  const { lat, lon } = $derived(app.location);
  const rainNear = $derived(app.rain.data ? nearest(app.rain.data, lat, lon, 30) : null);
  const waterNear = $derived(app.water.data ? nearest(app.water.data.filter((s) => s.situation.level > 0), lat, lon, 50) : null);
  const hotspots = $derived.by(() => {
    const fc = app.gistda.data?.hotspots;
    if (!fc) return null;
    let near = 0;
    for (const f of fc.features) {
      if (f.geometry?.type !== 'Point') continue;
      const [x, y] = f.geometry.coordinates;
      if (distanceKm(lat, lon, y, x) <= 50) near++;
    }
    return { total: fc.features.length, near };
  });
</script>

<div class="grid">
  {#each stats as s, i (s.label)}
    <div class="stat card" in:rise={{ delay: stagger(i) }}>
      <span class="caption">{s.label}</span>
      <span class="value">
        <AnimatedNumber value={s.value} digits={s.digits} /><small>{s.unit}</small>
        {#if s.dir != null}
          <span class="arrow" style:transform="rotate({s.dir + 180}deg)" title="From {compass(s.dir)}">↑</span>
        {/if}
      </span>
      {#if s.dir != null}<span class="micro">from {compass(s.dir)}</span>{/if}
      {#if s.note}<span class="micro" style:color={s.note.color}>US AQI {round(air?.usAqi)} · {s.note.label}</span>{/if}
    </div>
  {:else}
    {#each Array(8) as _, i (i)}<div class="stat skeleton" style="height:84px"></div>{/each}
  {/each}
</div>

<h3 class="section" in:rise={{ delay: stagger(8) }}>Ground observations</h3>

<div class="obs card" in:rise={{ delay: stagger(9) }}>
  <div class="obs-head">
    <span class="caption">Nearest rain gauge · ThaiWater</span>
    {#if app.rain.loading && !app.rain.data}<span class="micro">loading…</span>{/if}
  </div>
  {#if rainNear}
    <div class="obs-row">
      <div>
        <div class="name">{rainNear.item.name}</div>
        <div class="micro">{rainNear.item.province} · {rainNear.km.toFixed(1)} km away · {rainNear.item.time}</div>
      </div>
      <div class="nums">
        <div><b class="num">{rainNear.item.rain1h.toFixed(1)}</b><small>mm 1 h</small></div>
        <div><b class="num">{rainNear.item.rain24h.toFixed(1)}</b><small>mm 24 h</small></div>
      </div>
    </div>
  {:else if app.rain.error}
    <p class="micro">ThaiWater unavailable: {app.rain.error}</p>
  {:else if app.rain.data}
    <p class="micro">No ThaiWater rain gauge within 30 km.</p>
  {/if}
</div>

<div class="obs card" in:rise={{ delay: stagger(10) }}>
  <div class="obs-head"><span class="caption">Nearest river / canal level · ThaiWater</span></div>
  {#if waterNear}
    {@const s = waterNear.item}
    <div class="obs-row">
      <div>
        <div class="name">{s.name}</div>
        <div class="micro">{s.basin} · {waterNear.km.toFixed(1)} km away · {s.time}</div>
      </div>
      <div class="chip" style:--c={s.situation.color}>
        <span class="dot"></span>{s.situation.label}
        <b class="num">{round(s.storagePercent)}%</b>
      </div>
    </div>
  {:else if app.water.error}
    <p class="micro">ThaiWater unavailable: {app.water.error}</p>
  {:else if app.water.data}
    <p class="micro">No water-level station within 50 km.</p>
  {:else}
    <p class="micro">Loading water levels…</p>
  {/if}
</div>

<div class="obs card" in:rise={{ delay: stagger(11) }}>
  <div class="obs-head"><span class="caption">Satellite fire hotspots · GISTDA (VIIRS, 24 h)</span></div>
  {#if hotspots}
    <div class="obs-row">
      <div class="micro">{hotspots.total.toLocaleString()} hotspots in Thailand</div>
      <div class="nums"><div><b class="num">{hotspots.near}</b><small>within 50 km</small></div></div>
    </div>
  {:else if app.gistda.data?.status === 'not_configured'}
    <p class="micro">GISTDA feed not configured yet. Add the <code>GISTDA_API_KEY</code> repository secret to enable it.</p>
  {:else}
    <p class="micro">{app.gistda.data?.errors?.join('; ') || 'Loading…'}</p>
  {/if}
</div>

<style>
  .grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
  }
  .stat {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 14px 15px;
    border-radius: var(--r-lg);
  }
  .value {
    display: flex;
    align-items: baseline;
    gap: 4px;
    font-family: var(--font-display);
    font-size: 28px;
    font-weight: 500;
    letter-spacing: -0.04em;
  }
  .value small {
    font-family: var(--font-body);
    font-size: 12px;
    font-weight: 500;
    letter-spacing: 0;
    color: var(--ink-muted);
  }
  .arrow {
    display: inline-block;
    margin-left: auto;
    font-size: 18px;
    transition: transform 900ms var(--ease-out);
  }
  .section {
    margin: 22px 2px 10px;
    font-size: 13px;
    font-weight: 500;
    color: var(--ink-muted);
  }
  .obs {
    margin-bottom: 8px;
    border-radius: var(--r-lg);
  }
  .obs p {
    margin: 8px 0 0;
  }
  .obs code {
    color: var(--ink);
  }
  .obs-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    margin-top: 10px;
  }
  .name {
    font-size: 15px;
    font-weight: 500;
    margin-bottom: 3px;
  }
  .nums {
    display: flex;
    gap: 14px;
    text-align: right;
  }
  .nums b {
    display: block;
    font-family: var(--font-display);
    font-size: 22px;
    font-weight: 500;
    letter-spacing: -0.03em;
  }
  .nums small {
    font-size: 11px;
    color: var(--ink-muted);
    white-space: nowrap;
  }
  .chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    flex: none;
    padding: 6px 10px;
    border-radius: var(--r-pill);
    background: var(--surface-2);
    font-size: 12px;
    font-weight: 500;
  }
  .chip .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--c);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--c) 25%, transparent);
  }
</style>
