<script lang="ts">
  import { app } from '../state/app.svelte';
  import { describeCode, type Mood } from '../weatherCodes';
  import { ago } from '../format';
  import AnimatedNumber from './AnimatedNumber.svelte';
  import WeatherIcon from './WeatherIcon.svelte';

  let { now }: { now: number } = $props();

  const fc = $derived(app.forecast.data);
  const cur = $derived(fc?.current);
  const info = $derived(describeCode(cur?.code, cur?.isDay));

  // Spotlight palette follows the sky: sunset wash for clear days, violet for
  // cloud and rain, magenta-coral for storms, deep violet at night.
  const PALETTES: Record<Mood | 'night', [string, string, string]> = {
    clear: ['var(--g-orange)', 'var(--g-coral)', 'var(--g-magenta)'],
    cloud: ['var(--g-violet)', '#4b3bb8', 'var(--g-magenta)'],
    fog: ['#5a4fa8', 'var(--g-violet)', '#8a6cf0'],
    rain: ['var(--g-violet)', '#3a2fb0', 'var(--g-magenta)'],
    storm: ['var(--g-magenta)', 'var(--g-coral)', 'var(--g-violet)'],
    snow: ['#8a6cf0', 'var(--g-violet)', '#c4b5fd'],
    night: ['#2a1f7a', 'var(--g-violet)', 'var(--g-magenta)'],
  };
  const palette = $derived(cur && !cur.isDay && info.mood === 'clear' ? PALETTES.night : PALETTES[info.mood]);
</script>

<section
  class="spot"
  style:--c1={palette[0]}
  style:--c2={palette[1]}
  style:--c3={palette[2]}
  aria-live="polite"
  aria-busy={app.forecast.loading}
>
  <div class="glow" aria-hidden="true"></div>
  {#if cur && fc}
    <div class="top">
      <span class="eyebrow">Now · {info.label}</span>
      <WeatherIcon code={cur.code} isDay={cur.isDay} size={40} />
    </div>
    <div class="temp display"><AnimatedNumber value={cur.temperature} /><span class="deg">°</span></div>
    <div class="meta">
      <span>Feels <b><AnimatedNumber value={cur.apparent} />°</b></span>
      <span>H <b>{Math.round(fc.daily.tMax[0])}°</b> L <b>{Math.round(fc.daily.tMin[0])}°</b></span>
      <span class="upd">{app.forecast.updated ? `Updated ${ago(app.forecast.updated, now)}` : ''}</span>
    </div>
  {:else if app.forecast.error}
    <div class="top"><span class="eyebrow">Open-Meteo unavailable</span></div>
    <p class="err">{app.forecast.error}. <button class="pill" onclick={() => app.loadLocation()}>Retry</button></p>
  {:else}
    <div class="top"><span class="eyebrow">Loading conditions…</span></div>
    <div class="temp display ghost">––°</div>
    <div class="meta"><span>&nbsp;</span></div>
  {/if}
</section>

<style>
  .spot {
    position: relative;
    isolation: isolate;
    overflow: hidden;
    padding: 22px 24px 20px;
    border-radius: var(--r-xxl);
    background: var(--c2);
    transition: background-color 1.2s var(--ease-in-out);
    min-height: 196px;
  }
  .glow {
    position: absolute;
    inset: -40%;
    z-index: -1;
    background:
      radial-gradient(40% 45% at 25% 30%, var(--c1), transparent 70%),
      radial-gradient(45% 50% at 80% 70%, var(--c3), transparent 70%),
      radial-gradient(35% 35% at 70% 15%, rgba(255, 255, 255, 0.18), transparent 70%);
    filter: blur(8px);
    animation: drift 18s var(--ease-in-out) infinite alternate;
  }
  @keyframes drift {
    0% {
      transform: translate3d(-4%, -2%, 0) rotate(0deg) scale(1);
    }
    50% {
      transform: translate3d(4%, 3%, 0) rotate(8deg) scale(1.05);
    }
    100% {
      transform: translate3d(-2%, 5%, 0) rotate(-6deg) scale(1.02);
    }
  }
  .top {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
  }
  .eyebrow {
    font-size: 13px;
    font-weight: 500;
    color: rgba(255, 255, 255, 0.82);
  }
  .temp {
    display: flex;
    align-items: flex-start;
    font-size: 104px;
    letter-spacing: -0.06em;
    margin: 8px 0 12px -4px;
    line-height: 0.85;
  }
  .deg {
    font-size: 0.5em;
    margin-top: 0.08em;
    margin-left: 0.04em;
    opacity: 0.85;
  }
  .ghost {
    opacity: 0.35;
  }
  .meta {
    display: flex;
    flex-wrap: wrap;
    gap: 4px 16px;
    font-size: 14px;
    color: rgba(255, 255, 255, 0.82);
  }
  .meta b {
    color: #fff;
    font-weight: 600;
  }
  .upd {
    margin-left: auto;
    font-size: 12px;
    opacity: 0.8;
  }
  .err {
    margin: 24px 0 0;
  }
  .err .pill {
    margin-left: 8px;
  }
  @media (max-width: 809px) {
    .temp {
      font-size: 84px;
    }
  }
</style>
