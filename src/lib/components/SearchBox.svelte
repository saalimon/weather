<script lang="ts">
  import { searchPlaces, type Place } from '../api/openmeteo';
  import { app } from '../state/app.svelte';
  import { rise, stagger } from '../motion';
  import Icon from './Icon.svelte';

  let query = $state('');
  let results = $state<Place[]>([]);
  let open = $state(false);
  let active = $state(-1);
  let locating = $state(false);
  let ctrl: AbortController | null = null;
  let timer: ReturnType<typeof setTimeout>;

  function onInput() {
    clearTimeout(timer);
    timer = setTimeout(async () => {
      ctrl?.abort();
      ctrl = new AbortController();
      try {
        results = await searchPlaces(query, ctrl.signal);
        open = true;
        active = results.length ? 0 : -1;
      } catch {
        /* aborted or offline */
      }
    }, 220);
  }

  function choose(p: Place) {
    app.select({ lat: p.lat, lon: p.lon, name: p.name, detail: [p.admin, p.country].filter(Boolean).join(', ') });
    query = '';
    results = [];
    open = false;
  }

  function onKey(e: KeyboardEvent) {
    if (!open || !results.length) return;
    if (e.key === 'ArrowDown') active = (active + 1) % results.length;
    else if (e.key === 'ArrowUp') active = (active - 1 + results.length) % results.length;
    else if (e.key === 'Enter' && active >= 0) choose(results[active]);
    else if (e.key === 'Escape') open = false;
    else return;
    e.preventDefault();
  }

  function locate() {
    if (!navigator.geolocation) return;
    locating = true;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        locating = false;
        const { latitude: lat, longitude: lon } = pos.coords;
        app.select({ lat, lon, name: 'My location' }, { reverse: true });
      },
      () => (locating = false),
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 300_000 },
    );
  }
</script>

<div class="search">
  <label class="field">
    <Icon name="search" size={16} />
    <input
      type="search"
      placeholder="Search a city or district"
      autocomplete="off"
      spellcheck="false"
      bind:value={query}
      oninput={onInput}
      onkeydown={onKey}
      onfocus={() => (open = results.length > 0)}
      onblur={() => setTimeout(() => (open = false), 150)}
      aria-label="Search places"
      aria-expanded={open}
      aria-controls="search-results"
      role="combobox"
    />
  </label>
  <button class="icon-btn" class:busy={locating} onclick={locate} title="Use my location" aria-label="Use my location">
    <Icon name="locate" />
  </button>

  {#if open && results.length}
    <ul class="results" id="search-results" role="listbox">
      {#each results as r, i (r.id)}
        <li role="option" aria-selected={i === active} in:rise={{ delay: stagger(i, 25), y: 6, duration: 300 }}>
          <button onmousedown={() => choose(r)} class:active={i === active}>
            <span>{r.name}</span>
            <span class="micro">{[r.admin, r.country].filter(Boolean).join(', ')}</span>
          </button>
        </li>
      {/each}
    </ul>
  {/if}
</div>

<style>
  .search {
    position: relative;
    display: flex;
    gap: 8px;
  }
  .field {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 0 14px;
    height: 40px;
    border-radius: var(--r-pill);
    background: var(--surface-1);
    color: var(--ink-muted);
    transition: box-shadow var(--dur-2) var(--ease-out);
  }
  .field:focus-within {
    box-shadow: var(--ring);
  }
  input {
    flex: 1;
    min-width: 0;
    border: 0;
    outline: 0;
    background: transparent;
    color: var(--ink);
    font: inherit;
    font-size: 14px;
  }
  input:focus-visible {
    box-shadow: none;
  }
  input::placeholder {
    color: var(--ink-muted);
  }
  input::-webkit-search-cancel-button {
    filter: invert(1) opacity(0.5);
  }
  .busy {
    animation: pulse 1s var(--ease-in-out) infinite alternate;
  }
  @keyframes pulse {
    to {
      opacity: 0.4;
    }
  }
  .results {
    position: absolute;
    z-index: 10;
    top: 46px;
    left: 0;
    right: 48px;
    margin: 0;
    padding: 6px;
    list-style: none;
    background: var(--surface-2);
    border-radius: var(--r-lg);
    box-shadow: var(--elev-2);
  }
  .results button {
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;
    padding: 9px 10px;
    border: 0;
    border-radius: var(--r-md);
    background: transparent;
    text-align: left;
    cursor: pointer;
  }
  .results button.active,
  .results button:hover {
    background: rgba(255, 255, 255, 0.06);
  }
</style>
