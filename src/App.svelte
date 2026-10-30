<script lang="ts">
  import { onMount } from 'svelte';
  import { app } from './lib/state/app.svelte';
  import MapView from './lib/components/MapView.svelte';
  import Panel from './lib/components/Panel.svelte';
  import LayerControl from './lib/components/LayerControl.svelte';
  import RadarTimeline from './lib/components/RadarTimeline.svelte';

  let now = $state(Date.now());
  let expanded = $state(false);

  const MIN = 60_000;
  const schedule: [() => unknown, number][] = [
    [app.loadRadar, 5 * MIN],
    [app.loadRain, 10 * MIN],
    [app.loadWater, 10 * MIN],
    [() => app.loadLocation(), 15 * MIN],
    [app.loadGistda, 30 * MIN],
  ];

  onMount(() => {
    schedule.forEach(([fn]) => fn());

    const timers = schedule.map(([fn, ms]) => setInterval(() => !document.hidden && fn(), ms));
    const clock = setInterval(() => (now = Date.now()), 30_000);

    // Catch up after the tab has been in the background.
    let hiddenAt = 0;
    const onVis = () => {
      if (document.hidden) hiddenAt = Date.now();
      else if (hiddenAt && Date.now() - hiddenAt > 5 * MIN) {
        now = Date.now();
        schedule.forEach(([fn]) => fn());
      }
    };
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('hashchange', app.syncFromHash);

    return () => {
      window.removeEventListener('hashchange', app.syncFromHash);
      timers.forEach(clearInterval);
      clearInterval(clock);
      document.removeEventListener('visibilitychange', onVis);
    };
  });
</script>

<main class="shell" style:--sheet-h={expanded ? '86dvh' : '42dvh'}>
  <MapView />
  <Panel {now} bind:expanded />
  <LayerControl />
  <RadarTimeline />
</main>

<style>
  .shell {
    position: relative;
    height: 100dvh;
    width: 100vw;
    overflow: hidden;
  }
</style>
