<script lang="ts">
  import { describeCode } from '../weatherCodes';

  let { code, isDay = true, size = 24 }: { code: number | null | undefined; isDay?: boolean; size?: number } = $props();

  const info = $derived(describeCode(code, isDay));
  const kind = $derived.by(() => {
    if (code == null) return 'cloud';
    if (code === 0) return isDay ? 'sun' : 'moon';
    if (code <= 2) return isDay ? 'partly' : 'partly-night';
    if (info.mood === 'storm') return 'storm';
    if (info.mood === 'rain') return 'rain';
    if (info.mood === 'snow') return 'snow';
    if (info.mood === 'fog') return 'fog';
    return 'cloud';
  });
</script>

<svg
  width={size}
  height={size}
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="1.6"
  stroke-linecap="round"
  stroke-linejoin="round"
  role="img"
  aria-label={info.label}
  class="wi wi-{kind}"
>
  {#if kind === 'sun'}
    <circle cx="12" cy="12" r="4.2" />
    <g class="rays">
      {#each [0, 45, 90, 135, 180, 225, 270, 315] as a (a)}
        <line x1="12" y1="2.6" x2="12" y2="4.6" transform="rotate({a} 12 12)" />
      {/each}
    </g>
  {:else if kind === 'moon'}
    <path d="M19.5 14.6A7.6 7.6 0 1 1 9.4 4.5a6 6 0 0 0 10.1 10.1Z" />
  {:else}
    {#if kind === 'partly'}
      <g class="rays">
        <circle cx="8.5" cy="8.5" r="3" />
        {#each [0, 60, 120, 180, 270, 315] as a (a)}
          <line x1="8.5" y1="3" x2="8.5" y2="4" transform="rotate({a} 8.5 8.5)" />
        {/each}
      </g>
    {:else if kind === 'partly-night'}
      <path d="M12 7.6A4.4 4.4 0 1 1 6.2 3.4a3.4 3.4 0 0 0 5.8 4.2Z" />
    {/if}
    <path d="M7.2 18.5h9.6a3.7 3.7 0 0 0 .4-7.4 5 5 0 0 0-9.6 1.1 3.2 3.2 0 0 0-.4 6.3Z" class="cloud" />
    {#if kind === 'rain'}
      <g class="drops"><line x1="9" y1="20.6" x2="8.4" y2="22.2" /><line x1="12.6" y1="20.6" x2="12" y2="22.2" /><line x1="16.2" y1="20.6" x2="15.6" y2="22.2" /></g>
    {:else if kind === 'storm'}
      <path d="m12.8 19.4-1.9 2.6h2.4l-1.6 2" class="bolt" />
    {:else if kind === 'snow'}
      <g class="drops"><circle cx="9" cy="21.4" r=".5" /><circle cx="12.5" cy="21.8" r=".5" /><circle cx="16" cy="21.4" r=".5" /></g>
    {:else if kind === 'fog'}
      <line x1="5" y1="21" x2="19" y2="21" /><line x1="7" y1="23" x2="17" y2="23" />
    {/if}
  {/if}
</svg>

<style>
  .wi {
    flex: none;
    overflow: visible;
  }
  .rays {
    transform-origin: center;
    transform-box: fill-box;
    animation: spin 40s linear infinite;
  }
  .drops {
    animation: fall 1.6s var(--ease-in-out) infinite;
  }
  .bolt {
    animation: flash 2.4s steps(1) infinite;
  }
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
  @keyframes fall {
    0% {
      transform: translateY(-1px);
      opacity: 0.2;
    }
    50% {
      opacity: 1;
    }
    100% {
      transform: translateY(1.5px);
      opacity: 0.2;
    }
  }
  @keyframes flash {
    0%,
    86% {
      opacity: 1;
    }
    88% {
      opacity: 0.2;
    }
    92% {
      opacity: 1;
    }
  }
</style>
