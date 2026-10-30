<script lang="ts">
  import { app, type LayerId, type Resource } from '../state/app.svelte';
  import { RAIN_SCALE } from '../api/thaiwater';
  import { pop, rise, stagger } from '../motion';
  import Icon from './Icon.svelte';

  let open = $state(typeof window !== 'undefined' && window.innerWidth >= 810);

  interface Row {
    id: LayerId;
    label: string;
    source: string;
    swatch: string;
    res?: () => Resource<unknown>;
    count?: () => string | null;
  }

  const gistdaCount = (key: 'hotspots' | 'flood') => () => {
    const g = app.gistda.data;
    if (!g || g.status === 'not_configured') return 'not configured';
    const n = g[key]?.features.length;
    return n == null ? 'unavailable' : n.toLocaleString();
  };

  const rows: Row[] = [
    { id: 'radar', label: 'Rain radar', source: 'RainViewer · 10 min', swatch: 'linear-gradient(90deg,#88ddee,#0099cc,#0077aa)', res: () => app.radar, count: () => (app.radar.data ? `${app.radar.data.length} frames` : null) },
    { id: 'satellite', label: 'Satellite clouds (IR)', source: 'Himawari-9 · NASA GIBS', swatch: 'linear-gradient(90deg,#333,#ddd)' },
    { id: 'rain', label: 'Rain gauges, 24 h', source: 'ThaiWater · hourly', swatch: 'linear-gradient(90deg,#4cc3ff,#ff7a3d,#d44df0)', res: () => app.rain, count: () => (app.rain.data ? `${app.rain.data.filter((r) => r.rain24h > 0).length.toLocaleString()} wet` : null) },
    { id: 'water', label: 'River water level', source: 'ThaiWater · hourly', swatch: 'linear-gradient(90deg,#ffc000,#22c55e,#2f7bff,#ff3b30)', res: () => app.water, count: () => (app.water.data ? `${app.water.data.length}` : null) },
    { id: 'hotspots', label: 'Fire hotspots', source: 'GISTDA · VIIRS 24 h', swatch: '#ff7a3d', res: () => app.gistda, count: gistdaCount('hotspots') },
    { id: 'flood', label: 'Flood extent', source: 'GISTDA · satellite', swatch: '#4cc3ff', res: () => app.gistda, count: gistdaCount('flood') },
  ];

  const WATER_LEGEND = [
    ['#ff3b30', 'Overflowing  > 100%'],
    ['#2f7bff', 'High  70–100%'],
    ['#22c55e', 'Normal  30–70%'],
    ['#ffc000', 'Low  10–30%'],
    ['#c2571a', 'Critical  ≤ 10%'],
  ];
</script>

<div class="layers">
  <button class="icon-btn toggle" aria-expanded={open} aria-controls="layer-panel" onclick={() => (open = !open)} title="Map layers">
    <Icon name={open ? 'close' : 'layers'} />
  </button>

  {#if open}
    <div class="panel" id="layer-panel" transition:pop>
      <div class="hd">
        <span class="caption">Map layers</span>
        <div class="base" role="group" aria-label="Base map">
          <button class="pill ghost sm" aria-pressed={app.darkBase} onclick={() => (app.darkBase = true)}>Dark</button>
          <button class="pill ghost sm" aria-pressed={!app.darkBase} onclick={() => (app.darkBase = false)}>Light</button>
        </div>
      </div>
      <ul>
        {#each rows as r, i (r.id)}
          {@const res = r.res?.()}
          <li in:rise={{ delay: stagger(i, 30), y: 6, duration: 360 }}>
            <label>
              <input type="checkbox" bind:checked={app.layers[r.id]} />
              <span class="sw" style:background={r.swatch}></span>
              <span class="txt">
                <span class="lbl">{r.label}</span>
                <span class="micro">{r.source}</span>
              </span>
              <span class="status micro">
                {#if res?.loading}<span class="spin" aria-label="loading"></span>
                {:else if res?.error}<span class="bad" title={res.error}>offline</span>
                {:else}{r.count?.() ?? ''}{/if}
              </span>
            </label>
          </li>
        {/each}
      </ul>

      {#if app.layers.rain}
        <div class="legend" transition:pop>
          <span class="micro">Rain, 24 h (mm)</span>
          {#each RAIN_SCALE as s (s.color)}<span class="key"><i style:background={s.color}></i>{s.label}</span>{/each}
        </div>
      {/if}
      {#if app.layers.water}
        <div class="legend" transition:pop>
          <span class="micro">Water level, % of bank</span>
          {#each WATER_LEGEND as [c, l] (c)}<span class="key"><i style:background={c}></i>{l}</span>{/each}
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .layers {
    position: absolute;
    top: 16px;
    right: 16px;
    z-index: 900;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 8px;
  }
  .toggle {
    box-shadow: var(--elev-2);
  }
  .panel {
    width: 300px;
    max-height: calc(100dvh - 150px);
    overflow-y: auto;
    padding: 14px;
    border-radius: var(--r-xl);
    background: rgba(9, 9, 9, 0.88);
    backdrop-filter: blur(16px) saturate(1.2);
    -webkit-backdrop-filter: blur(16px) saturate(1.2);
    border: 1px solid var(--hairline-soft);
    box-shadow: var(--elev-2);
    transform-origin: top right;
  }
  .hd {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;
  }
  .base {
    display: flex;
    gap: 2px;
    padding: 2px;
    border-radius: var(--r-pill);
    background: var(--canvas);
  }
  .pill.sm {
    min-height: 28px;
    padding: 6px 11px;
    font-size: 12px;
  }
  ul {
    margin: 0;
    padding: 0;
    list-style: none;
  }
  label {
    display: grid;
    grid-template-columns: 16px 22px 1fr auto;
    align-items: center;
    gap: 10px;
    padding: 9px 6px;
    border-radius: var(--r-md);
    cursor: pointer;
    transition: background-color var(--dur-2);
  }
  label:hover {
    background: rgba(255, 255, 255, 0.04);
  }
  input {
    appearance: none;
    width: 16px;
    height: 16px;
    margin: 0;
    border-radius: 5px;
    border: 1.5px solid #555;
    display: grid;
    place-items: center;
    cursor: pointer;
    transition: all var(--dur-2) var(--ease-out);
  }
  input:checked {
    background: var(--primary);
    border-color: var(--primary);
  }
  input:checked::after {
    content: '';
    width: 8px;
    height: 4px;
    border-left: 2px solid #000;
    border-bottom: 2px solid #000;
    transform: rotate(-45deg) translate(1px, -1px);
  }
  input:focus-visible {
    box-shadow: var(--ring);
  }
  .sw {
    width: 22px;
    height: 8px;
    border-radius: var(--r-pill);
  }
  .txt {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }
  .lbl {
    font-size: 14px;
    font-weight: 500;
  }
  .status {
    text-align: right;
    white-space: nowrap;
  }
  .bad {
    color: var(--g-coral);
  }
  .spin {
    display: inline-block;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    border: 1.5px solid #444;
    border-top-color: #fff;
    animation: spin 0.8s linear infinite;
  }
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
  .legend {
    display: flex;
    flex-direction: column;
    gap: 5px;
    margin-top: 10px;
    padding: 12px;
    border-radius: var(--r-md);
    background: var(--surface-1);
  }
  .key {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    white-space: pre;
  }
  .key i {
    width: 10px;
    height: 10px;
    border-radius: 50%;
  }
  @media (max-width: 809px) {
    .layers {
      top: 12px;
      right: 12px;
    }
    .panel {
      width: min(300px, calc(100vw - 24px));
      max-height: calc(50dvh - 70px);
    }
  }
</style>
