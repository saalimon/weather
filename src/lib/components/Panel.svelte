<script lang="ts">
  import { app, TABS, type Tab } from '../state/app.svelte';
  import { exit, rise, slide, stagger } from '../motion';
  import SearchBox from './SearchBox.svelte';
  import Spotlight from './Spotlight.svelte';
  import Tabs from './Tabs.svelte';
  import NowTab from './tabs/NowTab.svelte';
  import NowcastTab from './tabs/NowcastTab.svelte';
  import HourlyTab from './tabs/HourlyTab.svelte';
  import DailyTab from './tabs/DailyTab.svelte';
  import SeasonalTab from './tabs/SeasonalTab.svelte';
  import Icon from './Icon.svelte';

  let { now, expanded = $bindable(false) }: { now: number; expanded?: boolean } = $props();

  let dir = $state(1);

  function onTabChange(from: Tab, to: Tab) {
    dir = TABS.findIndex((t) => t.id === to) > TABS.findIndex((t) => t.id === from) ? 1 : -1;
    expanded = true;
  }
</script>

<aside class="panel" class:expanded aria-label="Weather details">
  <button class="handle" onclick={() => (expanded = !expanded)} aria-label={expanded ? 'Collapse panel' : 'Expand panel'}>
    <span></span>
  </button>

  <div class="scroll">
    <header class="brand" in:rise>
      <div class="mark">
        <span class="logo display">Fah<span class="dot">.</span></span>
        <span class="micro">ฟ้า · Thailand weather, live</span>
      </div>
      <span class="live micro"><i></i>Live</span>
    </header>

    <div in:rise={{ delay: stagger(1) }}><SearchBox /></div>

    <div class="place" in:rise={{ delay: stagger(2) }}>
      {#key app.location.name}
        <h1 class="display" in:rise={{ y: 8, duration: 420 }}>{app.location.name}</h1>
      {/key}
      <span class="caption">
        {app.location.detail ? `${app.location.detail} · ` : ''}{app.location.lat.toFixed(3)}°, {app.location.lon.toFixed(3)}°
      </span>
    </div>

    <div in:rise={{ delay: stagger(3) }}><Spotlight {now} /></div>

    <div class="tabs-wrap" in:rise={{ delay: stagger(4) }}><Tabs onchange={onTabChange} /></div>

    <div class="content" id="tabpanel" role="tabpanel">
      {#key app.tab}
        <div class="pane" in:slide={{ dir }} out:exit>
          {#if app.tab === 'now'}<NowTab />
          {:else if app.tab === 'nowcast'}<NowcastTab {now} />
          {:else if app.tab === 'hourly'}<HourlyTab />
          {:else if app.tab === 'daily'}<DailyTab />
          {:else}<SeasonalTab />{/if}
        </div>
      {/key}
    </div>

    <footer class="micro">
      <p>
        Data: <a href="https://open-meteo.com/" target="_blank" rel="noopener">Open-Meteo</a> (CC BY 4.0) ·
        <a href="https://www.thaiwater.net/" target="_blank" rel="noopener">ThaiWater / HII</a> ·
        <a href="https://www.gistda.or.th/" target="_blank" rel="noopener">GISTDA</a> ·
        <a href="https://www.rainviewer.com/" target="_blank" rel="noopener">RainViewer</a> ·
        <a href="https://earthdata.nasa.gov/gibs" target="_blank" rel="noopener">NASA GIBS</a> · map ©
        <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>
      </p>
      <p>
        Forecasts are model output and may be wrong. For official warnings see the
        <a href="https://www.tmd.go.th/en" target="_blank" rel="noopener">Thai Meteorological Department <Icon name="external" size={11} /></a>.
      </p>
    </footer>
  </div>
</aside>

<style>
  .panel {
    position: absolute;
    z-index: 1000;
    top: 16px;
    left: 16px;
    bottom: 16px;
    width: 440px;
    display: flex;
    flex-direction: column;
    border-radius: var(--r-xl);
    background: rgba(9, 9, 9, 0.9);
    backdrop-filter: blur(20px) saturate(1.2);
    -webkit-backdrop-filter: blur(20px) saturate(1.2);
    border: 1px solid var(--hairline-soft);
    box-shadow: var(--elev-2);
    overflow: hidden;
  }
  .handle {
    display: none;
  }
  .scroll {
    flex: 1;
    overflow-y: auto;
    padding: 18px 18px 8px;
    scrollbar-width: thin;
    scrollbar-color: var(--hairline) transparent;
    overscroll-behavior: contain;
  }
  .brand {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
  }
  .mark {
    display: flex;
    align-items: baseline;
    gap: 10px;
  }
  .logo {
    font-size: 26px;
    letter-spacing: -0.06em;
  }
  .logo .dot {
    color: var(--accent);
  }
  .live {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 5px 10px;
    border-radius: var(--r-pill);
    background: var(--surface-1);
    color: var(--ink);
  }
  .live i {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--success);
    animation: blink 2s var(--ease-in-out) infinite;
  }
  @keyframes blink {
    50% {
      opacity: 0.25;
    }
  }
  .place {
    margin: 22px 2px 14px;
  }
  h1 {
    margin: 0 0 6px;
    font-size: 44px;
    line-height: 1;
    letter-spacing: -0.055em;
    overflow-wrap: anywhere;
  }
  .tabs-wrap {
    position: sticky;
    top: -18px;
    z-index: 5;
    margin: 14px -18px 12px;
    padding: 10px 18px;
    background: linear-gradient(rgba(9, 9, 9, 0.98) 70%, rgba(9, 9, 9, 0));
  }
  .content {
    display: grid;
    min-height: 320px;
  }
  .pane {
    grid-area: 1 / 1;
    min-width: 0;
  }
  footer {
    margin-top: 28px;
    padding: 16px 2px 8px;
    border-top: 1px solid var(--hairline-soft);
    line-height: 1.5;
  }
  footer p {
    margin: 0 0 6px;
  }

  @media (max-width: 809px) {
    .panel {
      top: auto;
      left: 0;
      right: 0;
      bottom: 0;
      width: auto;
      height: var(--sheet-h);
      border-radius: var(--r-xl) var(--r-xl) 0 0;
      border-bottom: 0;
      transition: height var(--dur-3) var(--ease-out);
    }
    .handle {
      display: grid;
      place-items: center;
      flex: none;
      height: 22px;
      border: 0;
      background: transparent;
      cursor: pointer;
    }
    .handle span {
      width: 40px;
      height: 4px;
      border-radius: var(--r-pill);
      background: #444;
    }
    .scroll {
      padding: 4px 16px 8px;
    }
    .brand {
      margin-bottom: 12px;
    }
    .place {
      margin: 16px 2px 12px;
    }
    h1 {
      font-size: 36px;
    }
    .tabs-wrap {
      top: -4px;
      margin: 12px -16px 10px;
      padding: 8px 16px;
    }
  }
</style>
