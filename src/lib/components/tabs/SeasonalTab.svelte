<script lang="ts">
  import type uPlot from 'uplot';
  import { untrack } from 'svelte';
  import { app } from '../../state/app.svelte';
  import { axis, bars } from '../../chartTheme';
  import { rise, stagger } from '../../motion';
  import Chart from '../Chart.svelte';

  $effect(() => {
    void app.locKey;
    untrack(() => app.ensureSeasonal());
  });

  const s = $derived(app.seasonal.data);
  const weeks = $derived(s?.weeks ?? []);
  const times = $derived(weeks.map((w) => Date.parse(`${w.start}T00:00:00Z`) / 1000));

  const tempData = $derived<uPlot.AlignedData>([
    times,
    weeks.map((w) => w.tMax.p90),
    weeks.map((w) => w.tMax.p50),
    weeks.map((w) => w.tMax.p10),
    weeks.map((w) => w.tMin.p90),
    weeks.map((w) => w.tMin.p50),
    weeks.map((w) => w.tMin.p10),
  ]);
  const rainData = $derived<uPlot.AlignedData>([times, weeks.map((w) => w.precip.p50), weeks.map((w) => w.precip.p90)]);

  const monthFmt = (t: number) => new Date(t * 1000).toLocaleDateString('en-GB', { month: 'short', timeZone: 'UTC' });
  const xAxis = () => axis({ values: (_u, ticks) => ticks.map(monthFmt), space: 50 });

  function tempOptions(width: number, height: number): uPlot.Options {
    const band = (color: string) => ({ stroke: 'transparent', fill: color, points: { show: false }, width: 0 });
    return {
      width,
      height,
      padding: [10, 6, 0, 0],
      cursor: { y: false, points: { show: false } },
      scales: { x: { time: true } },
      axes: [xAxis(), axis({ values: (_u, t) => t.map((v) => `${v}°`) })],
      bands: [
        { series: [1, 3], fill: 'rgba(255,122,61,0.22)' },
        { series: [4, 6], fill: 'rgba(106,76,245,0.32)' },
      ],
      series: [
        {},
        band('transparent'),
        { label: 'Max (median)', stroke: '#ff7a3d', width: 2, points: { show: false } },
        band('transparent'),
        band('transparent'),
        { label: 'Min (median)', stroke: '#8a6cf0', width: 2, points: { show: false } },
        band('transparent'),
      ],
    };
  }

  function rainOptions(width: number, height: number): uPlot.Options {
    return {
      width,
      height,
      padding: [10, 6, 0, 0],
      cursor: { y: false, points: { show: false } },
      scales: { x: { time: true }, y: { range: (_u, _a, max) => [0, Math.max(10, max * 1.1)] } },
      axes: [xAxis(), axis({ values: (_u, t) => t.map((v) => `${v}`) })],
      series: [
        {},
        { label: 'Median', paths: bars(0.7), fill: 'rgba(76,195,255,0.75)', stroke: 'transparent', points: { show: false } },
        { label: '90th pct', stroke: 'rgba(255,255,255,0.5)', width: 1, dash: [3, 3], points: { show: false } },
      ],
    };
  }

  /** Calendar-month rollup of weekly medians. */
  const months = $derived.by(() => {
    const groups = new Map<string, { tMax: number[]; tMin: number[]; rain: number }>();
    for (const w of weeks) {
      const key = w.start.slice(0, 7);
      const g = groups.get(key) ?? { tMax: [], tMin: [], rain: 0 };
      g.tMax.push(w.tMax.p50);
      g.tMin.push(w.tMin.p50);
      g.rain += w.precip.p50;
      groups.set(key, g);
    }
    const avg = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length;
    return [...groups].map(([k, g]) => ({
      label: new Date(`${k}-01T00:00:00Z`).toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' }),
      tMax: avg(g.tMax),
      tMin: avg(g.tMin),
      rain: g.rain,
      weeks: g.tMax.length,
    }));
  });
</script>

{#if s && weeks.length}
  <div class="head" in:rise>
    <span class="caption">Long-range · {s.members}-member seasonal ensemble · weekly</span>
    <h2 class="display">Next 6 months</h2>
  </div>

  <div class="card" in:rise={{ delay: stagger(1) }}>
    <div class="legend micro"><span class="sw max"></span>Daily max <span class="sw min"></span>Daily min <span class="hint">bands = 10–90% of members</span></div>
    {#key app.locKey}
      <Chart data={tempData} options={tempOptions} height={180} />
    {/key}
  </div>

  <div class="card" in:rise={{ delay: stagger(2) }}>
    <div class="legend micro"><span class="sw rain"></span>Weekly rain, median (mm) <span class="sw p90"></span>wet scenario (90%)</div>
    {#key app.locKey}
      <Chart data={rainData} options={rainOptions} height={150} />
    {/key}
  </div>

  <table class="months" in:rise={{ delay: stagger(3) }}>
    <thead><tr><th>Month</th><th>Max</th><th>Min</th><th>Rain</th></tr></thead>
    <tbody>
      {#each months as m (m.label)}
        <tr>
          <td>{m.label}{#if m.weeks < 4}<small> · partial</small>{/if}</td>
          <td class="num">{m.tMax.toFixed(1)}°</td>
          <td class="num">{m.tMin.toFixed(1)}°</td>
          <td class="num">{Math.round(m.rain)} mm</td>
        </tr>
      {/each}
    </tbody>
  </table>
  <p class="micro note">
    Seasonal forecasts show likely tendencies, not day-by-day weather. Use the spread between ensemble members as a guide to
    how confident the model is.
  </p>
{:else if app.seasonal.error}
  <div class="card"><p class="micro">Seasonal forecast unavailable: {app.seasonal.error}</p><button class="pill" onclick={() => app.ensureSeasonal()}>Retry</button></div>
{:else}
  <div class="loading">
    <div class="skeleton" style="height:56px"></div>
    <div class="skeleton" style="height:200px"></div>
    <div class="skeleton" style="height:170px"></div>
  </div>
{/if}

<style>
  .head {
    margin: 4px 2px 14px;
  }
  h2 {
    margin: 8px 0 0;
    font-size: 32px;
    letter-spacing: -0.04em;
  }
  .card {
    margin-bottom: 8px;
    border-radius: var(--r-lg);
  }
  .legend {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
    margin-bottom: 8px;
  }
  .hint {
    margin-left: auto;
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
  .sw.max {
    background: #ff7a3d;
  }
  .sw.min {
    background: #8a6cf0;
  }
  .sw.rain {
    background: #4cc3ff;
  }
  .sw.p90 {
    height: 0;
    border-top: 1px dashed rgba(255, 255, 255, 0.6);
  }
  .months {
    width: 100%;
    border-collapse: collapse;
    background: var(--surface-1);
    border-radius: var(--r-lg);
    overflow: hidden;
    font-size: 14px;
  }
  th {
    padding: 10px 14px;
    text-align: right;
    font-size: 12px;
    font-weight: 500;
    color: var(--ink-muted);
  }
  th:first-child,
  td:first-child {
    text-align: left;
  }
  td {
    padding: 10px 14px;
    text-align: right;
    border-top: 1px solid var(--hairline-soft);
  }
  td small {
    color: var(--ink-muted);
  }
  .note {
    margin: 10px 4px 0;
  }
  .loading {
    display: grid;
    gap: 8px;
  }
</style>
