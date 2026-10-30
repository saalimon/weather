<script lang="ts">
  import type uPlot from 'uplot';
  import { app } from '../../state/app.svelte';
  import { summarizeNowcast } from '../../api/openmeteo';
  import { localTime } from '../../format';
  import { axis, bars, fadeFill } from '../../chartTheme';
  import { rise, stagger } from '../../motion';
  import Chart from '../Chart.svelte';

  let { now }: { now: number } = $props();

  const fc = $derived(app.forecast.data);
  const summary = $derived(fc ? summarizeNowcast(fc.nowcast.time, fc.nowcast.precipitation, now / 1000) : null);
  const peak = $derived(fc ? Math.max(0, ...fc.nowcast.precipitation) * 4 : 0); // mm/15min -> mm/h

  const data = $derived<uPlot.AlignedData>(fc ? [fc.nowcast.time, fc.nowcast.precipitation, fc.nowcast.temperature] : [[]]);

  function options(width: number, height: number): uPlot.Options {
    const off = fc?.utcOffset ?? 0;
    return {
      width,
      height,
      padding: [8, 0, 0, 0],
      cursor: { y: false, points: { size: 6 } },
      scales: { x: { time: true }, mm: { range: (_u, _min, max) => [0, Math.max(1, max * 1.2)] }, t: { auto: true } },
      axes: [
        axis({ values: (_u, ticks) => ticks.map((t) => localTime(t, off, { hour: '2-digit', minute: '2-digit' })), space: 60 }),
        axis({ scale: 'mm', values: (_u, t) => t.map((v) => `${v}`), size: 30 }),
        axis({ scale: 't', side: 1, grid: { show: false }, values: (_u, t) => t.map((v) => `${v}°`), size: 34 }),
      ],
      series: [
        {},
        { label: 'Rain', scale: 'mm', paths: bars(0.75), fill: '#4cc3ff', stroke: '#4cc3ff', points: { show: false } },
        { label: 'Temp', scale: 't', stroke: 'rgba(255,255,255,0.75)', width: 1.5, fill: fadeFill('#ffffff', 0.06), points: { show: false } },
      ],
    };
  }
</script>

{#if fc && summary}
  <div class="head" in:rise>
    <span class="caption">Next 6 hours · 15-minute model nowcast</span>
    <h2 class="display">{summary.headline}</h2>
  </div>

  <div class="card" in:rise={{ delay: stagger(1) }}>
    <div class="legend micro"><span class="sw rain"></span>Precipitation (mm / 15 min) <span class="sw temp"></span>Temperature</div>
    {#key app.locKey}
      <Chart {data} {options} height={190} />
    {/key}
  </div>

  <div class="row" in:rise={{ delay: stagger(2) }}>
    <div class="card mini"><span class="caption">Total, 6 h</span><b class="num">{summary.totalMm} <small>mm</small></b></div>
    <div class="card mini"><span class="caption">Peak rate</span><b class="num">{peak.toFixed(1)} <small>mm/h</small></b></div>
  </div>

  <div class="card radar" in:rise={{ delay: stagger(3) }}>
    <span class="caption">Live radar · RainViewer</span>
    <p>
      The map plays the past ~2 hours of rain radar at 10-minute steps. Use the timeline at the bottom of the map to
      scrub through frames and see where storms are moving.
    </p>
    <div class="actions">
      <button class="pill" aria-pressed={app.layers.radar} onclick={() => (app.layers.radar = !app.layers.radar)}>
        {app.layers.radar ? 'Hide radar' : 'Show radar'}
      </button>
      <button class="pill" aria-pressed={app.layers.satellite} onclick={() => (app.layers.satellite = !app.layers.satellite)}>
        {app.layers.satellite ? 'Hide clouds' : 'Show satellite clouds'}
      </button>
    </div>
  </div>
{:else}
  <div class="skeleton" style="height:260px"></div>
{/if}

<style>
  .head {
    margin: 4px 2px 14px;
  }
  h2 {
    margin: 8px 0 0;
    font-size: 32px;
    line-height: 1.05;
    letter-spacing: -0.04em;
  }
  .card {
    margin-bottom: 8px;
    border-radius: var(--r-lg);
  }
  .legend {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 8px;
  }
  .sw {
    width: 10px;
    height: 10px;
    border-radius: 3px;
    margin-left: 6px;
  }
  .sw:first-child {
    margin-left: 0;
  }
  .sw.rain {
    background: #4cc3ff;
  }
  .sw.temp {
    background: rgba(255, 255, 255, 0.75);
    height: 2px;
  }
  .row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }
  .mini {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .mini b {
    font-family: var(--font-display);
    font-size: 26px;
    font-weight: 500;
    letter-spacing: -0.04em;
  }
  .mini small {
    font-family: var(--font-body);
    font-size: 12px;
    color: var(--ink-muted);
    letter-spacing: 0;
  }
  .radar p {
    margin: 8px 0 12px;
    color: #cfcfcf;
    font-size: 14px;
  }
  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .actions .pill {
    background: var(--surface-2);
  }
  .actions .pill[aria-pressed='false'] {
    background: var(--primary);
    color: var(--on-primary);
  }
</style>
