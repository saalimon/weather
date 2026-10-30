<script lang="ts">
  import type uPlot from 'uplot';
  import { app } from '../../state/app.svelte';
  import { localTime } from '../../format';
  import { axis, bars, fadeFill, smooth } from '../../chartTheme';
  import { rise, stagger } from '../../motion';
  import Chart from '../Chart.svelte';
  import WeatherIcon from '../WeatherIcon.svelte';

  const fc = $derived(app.forecast.data);
  const h = $derived(fc?.hourly);

  const data = $derived<uPlot.AlignedData>(h ? [h.time, h.temperature, h.precipProb.map((v) => v ?? 0)] : [[]]);

  const isDayAt = (t: number) => {
    if (!fc) return true;
    const i = fc.daily.time.findLastIndex((d) => d <= t);
    if (i < 0) return true;
    return t >= fc.daily.sunrise[i] && t < fc.daily.sunset[i];
  };

  function options(width: number, height: number): uPlot.Options {
    const off = fc?.utcOffset ?? 0;
    return {
      width,
      height,
      padding: [12, 0, 0, 0],
      cursor: { y: false, points: { size: 6 } },
      scales: { x: { time: true }, t: { auto: true }, p: { range: [0, 100] } },
      axes: [
        axis({ values: (_u, ticks) => ticks.map((t) => localTime(t, off, { weekday: 'short', hour: '2-digit' })), space: 70 }),
        axis({ scale: 't', values: (_u, t) => t.map((v) => `${v}°`), size: 34 }),
        axis({ scale: 'p', side: 1, grid: { show: false }, values: (_u, t) => t.map((v) => `${v}%`), size: 38 }),
      ],
      series: [
        {},
        { label: 'Temp', scale: 't', stroke: '#ff7a3d', width: 2, paths: smooth(), fill: fadeFill('#ff7a3d', 0.28), points: { show: false } },
        { label: 'Rain chance', scale: 'p', paths: bars(0.6), fill: 'rgba(76,195,255,0.55)', stroke: 'rgba(76,195,255,0.9)', points: { show: false } },
      ],
    };
  }
</script>

{#if fc && h}
  <div class="card" in:rise>
    <div class="legend micro"><span class="sw temp"></span>Temperature <span class="sw rain"></span>Chance of rain</div>
    {#key app.locKey}
      <Chart {data} {options} height={200} />
    {/key}
  </div>

  <div class="strip" role="list" aria-label="Hourly forecast">
    {#each h.time as t, i (t)}
      <div class="hour" role="listitem" in:rise={{ delay: stagger(i, 22), y: 10 }}>
        <span class="micro">{i === 0 ? 'Now' : localTime(t, fc.utcOffset, { hour: '2-digit', minute: '2-digit' })}</span>
        <WeatherIcon code={h.code[i]} isDay={isDayAt(t)} size={22} />
        <b class="num">{Math.round(h.temperature[i])}°</b>
        <span class="prob num" style:opacity={(h.precipProb[i] ?? 0) > 0 ? 1 : 0.35}>{h.precipProb[i] ?? 0}%</span>
        <span class="micro num">{h.wind[i].toFixed(0)} km/h</span>
      </div>
    {/each}
  </div>
{:else}
  <div class="skeleton" style="height:260px"></div>
{/if}

<style>
  .card {
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
  .sw.temp {
    margin-left: 0;
    background: #ff7a3d;
  }
  .sw.rain {
    background: #4cc3ff;
  }
  .strip {
    display: flex;
    gap: 6px;
    margin: 10px -2px 0;
    padding: 2px 2px 8px;
    overflow-x: auto;
    scroll-snap-type: x proximity;
    scrollbar-width: thin;
    scrollbar-color: var(--hairline) transparent;
  }
  .hour {
    flex: none;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 7px;
    width: 64px;
    padding: 12px 6px;
    border-radius: var(--r-lg);
    background: var(--surface-1);
    scroll-snap-align: start;
  }
  .hour b {
    font-family: var(--font-display);
    font-size: 20px;
    font-weight: 500;
    letter-spacing: -0.03em;
  }
  .prob {
    font-size: 12px;
    font-weight: 500;
    color: #4cc3ff;
  }
</style>
