<script lang="ts">
  import { app } from '../../state/app.svelte';
  import { localTime } from '../../format';
  import { describeCode } from '../../weatherCodes';
  import { rise, stagger } from '../../motion';
  import WeatherIcon from '../WeatherIcon.svelte';

  const d = $derived(app.forecast.data?.daily);
  const off = $derived(app.forecast.data?.utcOffset ?? 0);
  const lo = $derived(d ? Math.floor(Math.min(...d.tMin)) : 0);
  const hi = $derived(d ? Math.ceil(Math.max(...d.tMax)) : 1);
  const pct = (v: number) => ((v - lo) / Math.max(1, hi - lo)) * 100;
</script>

{#if d}
  <div class="head caption" in:rise>16-day outlook · {lo}° to {hi}°</div>
  <ol class="days">
    {#each d.time as t, i (t)}
      <li in:rise={{ delay: stagger(i, 35), y: 10 }} title={describeCode(d.code[i]).label}>
        <span class="day">{i === 0 ? 'Today' : localTime(t, off, { weekday: 'short' })}<small>{localTime(t, off, { day: 'numeric', month: 'short' })}</small></span>
        <WeatherIcon code={d.code[i]} size={22} />
        <span class="prob num" style:opacity={(d.precipProb[i] ?? 0) >= 20 ? 1 : 0.35}>{d.precipProb[i] ?? 0}%</span>
        <span class="t num muted">{Math.round(d.tMin[i])}°</span>
        <span class="range">
          <span class="fill" style:left="{pct(d.tMin[i])}%" style:right="{100 - pct(d.tMax[i])}%" style:animation-delay="{stagger(i, 35) + 200}ms"></span>
        </span>
        <span class="t num">{Math.round(d.tMax[i])}°</span>
        <span class="mm num">{d.precipSum[i] >= 0.1 ? `${d.precipSum[i].toFixed(1)} mm` : ''}</span>
      </li>
    {/each}
  </ol>
  <p class="micro note">Days 1–7 come from high-resolution models; days 8–16 have lower skill and show the trend, not the details.</p>
{:else}
  <div class="skeleton" style="height:420px"></div>
{/if}

<style>
  .head {
    margin: 2px 2px 10px;
  }
  .days {
    margin: 0;
    padding: 4px 0;
    list-style: none;
    background: var(--surface-1);
    border-radius: var(--r-lg);
  }
  li {
    display: grid;
    grid-template-columns: 56px 24px 36px 30px 1fr 30px 54px;
    align-items: center;
    gap: 8px;
    padding: 9px 14px;
  }
  li + li {
    border-top: 1px solid var(--hairline-soft);
  }
  .day {
    display: flex;
    flex-direction: column;
    font-size: 14px;
    font-weight: 500;
  }
  .day small {
    font-size: 11px;
    font-weight: 400;
    color: var(--ink-muted);
  }
  .prob {
    font-size: 12px;
    font-weight: 500;
    color: #4cc3ff;
    text-align: right;
  }
  .t {
    text-align: right;
    font-weight: 500;
  }
  .muted {
    color: var(--ink-muted);
  }
  .range {
    position: relative;
    height: 6px;
    border-radius: var(--r-pill);
    background: var(--surface-2);
  }
  .fill {
    position: absolute;
    top: 0;
    bottom: 0;
    border-radius: var(--r-pill);
    background: linear-gradient(90deg, var(--g-violet), var(--g-orange));
    transform-origin: left;
    animation: grow 700ms var(--ease-out) both;
  }
  @keyframes grow {
    from {
      transform: scaleX(0);
    }
  }
  .mm {
    font-size: 12px;
    color: var(--ink-muted);
    text-align: right;
  }
  .note {
    margin: 10px 4px 0;
  }
  @media (max-width: 420px) {
    li {
      grid-template-columns: 48px 22px 32px 28px 1fr 28px;
      padding: 9px 10px;
    }
    .mm {
      display: none;
    }
  }
</style>
