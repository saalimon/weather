<script lang="ts">
  import { app } from '../state/app.svelte';
  import { rise } from '../motion';
  import Icon from './Icon.svelte';

  const frames = $derived(app.radar.data ?? []);
  const cur = $derived(frames[app.radarIndex]);
  const nowIdx = $derived(frames.findLastIndex((f) => !f.nowcast));

  // Advance one frame every 600 ms; hold on the newest frame a little longer.
  $effect(() => {
    if (!app.radarPlaying || !app.layers.radar || frames.length < 2) return;
    const hold = app.radarIndex === nowIdx ? 1800 : 600;
    const t = setTimeout(() => {
      app.radarIndex = (app.radarIndex + 1) % frames.length;
    }, hold);
    return () => clearTimeout(t);
  });

  const fmt = (t: number) => new Date(t * 1000).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  const rel = $derived.by(() => {
    if (!cur) return '';
    const mins = Math.round((cur.time - (frames[nowIdx]?.time ?? cur.time)) / 60);
    return mins === 0 ? 'latest' : mins > 0 ? `+${mins} min` : `${mins} min`;
  });
</script>

{#if app.layers.radar && frames.length}
  <div class="timeline" in:rise={{ y: 20 }}>
    <button
      class="icon-btn play"
      onclick={() => (app.radarPlaying = !app.radarPlaying)}
      aria-label={app.radarPlaying ? 'Pause radar' : 'Play radar'}
    >
      <Icon name={app.radarPlaying ? 'pause' : 'play'} size={16} />
    </button>
    <div class="track" role="group" aria-label="Radar frames">
      {#each frames as f, i (f.time)}
        <button
          class="tick"
          class:active={i === app.radarIndex}
          class:past={i < app.radarIndex}
          class:future={f.nowcast}
          aria-label="Radar {fmt(f.time)}"
          onclick={() => {
            app.radarPlaying = false;
            app.radarIndex = i;
          }}
        ></button>
      {/each}
    </div>
    <div class="label">
      <b class="num">{cur ? fmt(cur.time) : '–'}</b>
      <span class="micro">{rel}</span>
    </div>
  </div>
{/if}

<style>
  .timeline {
    position: absolute;
    left: 50%;
    bottom: 24px;
    z-index: 800;
    transform: translateX(-50%);
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 6px 16px 6px 6px;
    border-radius: var(--r-pill);
    background: rgba(9, 9, 9, 0.88);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border: 1px solid var(--hairline-soft);
    box-shadow: var(--elev-2);
  }
  .play {
    background: var(--primary);
    color: var(--on-primary);
  }
  .play:hover {
    background: #e6e6e6;
  }
  .track {
    display: flex;
    align-items: center;
    gap: 3px;
  }
  .tick {
    width: 10px;
    height: 22px;
    padding: 0;
    border: 0;
    background: transparent;
    cursor: pointer;
    position: relative;
  }
  .tick::before {
    content: '';
    position: absolute;
    left: 3px;
    right: 3px;
    top: 7px;
    bottom: 7px;
    border-radius: 2px;
    background: #3a3a3a;
    transition:
      background-color var(--dur-2) var(--ease-out),
      top var(--dur-2) var(--ease-out),
      bottom var(--dur-2) var(--ease-out);
  }
  .tick.past::before {
    background: #8a8a8a;
  }
  .tick.future::before {
    background: rgba(106, 76, 245, 0.6);
  }
  .tick.active::before {
    background: #fff;
    top: 2px;
    bottom: 2px;
  }
  .label {
    display: flex;
    flex-direction: column;
    min-width: 56px;
    line-height: 1.15;
  }
  .label b {
    font-size: 15px;
    font-weight: 600;
  }
  @media (max-width: 809px) {
    .timeline {
      bottom: calc(var(--sheet-h, 40dvh) + 12px);
      padding-right: 12px;
      gap: 8px;
      transition: bottom var(--dur-3) var(--ease-out);
    }
    .tick {
      width: 8px;
    }
  }
</style>
