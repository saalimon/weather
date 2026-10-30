<script lang="ts">
  import { Spring, prefersReducedMotion } from 'svelte/motion';
  import { app, TABS, type Tab } from '../state/app.svelte';

  let { onchange }: { onchange?: (from: Tab, to: Tab) => void } = $props();

  let buttons: HTMLButtonElement[] = $state([]);
  let row: HTMLDivElement;
  const x = new Spring(0, { stiffness: 0.18, damping: 0.72 });
  const w = new Spring(0, { stiffness: 0.18, damping: 0.72 });

  function place(instant = false) {
    const i = TABS.findIndex((t) => t.id === app.tab);
    const b = buttons[i];
    if (!b) return;
    const opts = { instant: instant || prefersReducedMotion.current };
    x.set(b.offsetLeft, opts);
    w.set(b.offsetWidth, opts);
    // Keep the active tab visible in the row without scrolling the panel itself.
    const left = Math.min(Math.max(row.scrollLeft, b.offsetLeft + b.offsetWidth - row.clientWidth + 8), b.offsetLeft - 8);
    if (left !== row.scrollLeft) row.scrollTo({ left, behavior: opts.instant ? 'auto' : 'smooth' });
  }

  $effect(() => {
    void app.tab;
    place();
  });

  $effect(() => {
    const ro = new ResizeObserver(() => place(true));
    ro.observe(row);
    return () => ro.disconnect();
  });

  function pick(id: Tab) {
    if (id === app.tab) return;
    const from = app.tab;
    app.tab = id;
    onchange?.(from, id);
  }

  function onKey(e: KeyboardEvent) {
    const i = TABS.findIndex((t) => t.id === app.tab);
    const n = e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowLeft' ? i - 1 : -1;
    if (n < 0 || n >= TABS.length) return;
    e.preventDefault();
    pick(TABS[n].id);
    buttons[n]?.focus();
  }
</script>

<div class="tabs" role="tablist" aria-label="Forecast range" bind:this={row} onkeydown={onKey} tabindex="-1">
  <span class="indicator" style:transform="translateX({x.current}px)" style:width="{w.current}px" aria-hidden="true"></span>
  {#each TABS as t, i (t.id)}
    <button
      bind:this={buttons[i]}
      role="tab"
      aria-selected={app.tab === t.id}
      aria-controls="tabpanel"
      tabindex={app.tab === t.id ? 0 : -1}
      title={t.hint}
      onclick={() => pick(t.id)}
    >
      {t.label}
    </button>
  {/each}
</div>

<style>
  .tabs {
    position: relative;
    display: flex;
    gap: 2px;
    padding: 4px;
    border-radius: var(--r-pill);
    background: var(--canvas);
    border: 1px solid var(--hairline-soft);
    overflow-x: auto;
    scrollbar-width: none;
    outline: none;
  }
  .tabs::-webkit-scrollbar {
    display: none;
  }
  .indicator {
    position: absolute;
    top: 4px;
    bottom: 4px;
    left: 0;
    border-radius: var(--r-pill);
    background: var(--surface-2);
    box-shadow: inset 0 0.5px 0 rgba(255, 255, 255, 0.1);
  }
  button {
    position: relative;
    flex: 1 0 auto;
    padding: 9px 13px;
    border: 0;
    border-radius: var(--r-pill);
    background: transparent;
    color: var(--ink-muted);
    font-size: 14px;
    font-weight: 500;
    white-space: nowrap;
    cursor: pointer;
    transition: color var(--dur-2) var(--ease-out);
  }
  button[aria-selected='true'] {
    color: var(--ink);
  }
  button:hover {
    color: var(--ink);
  }
</style>
