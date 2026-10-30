<script lang="ts">
  type Name = 'search' | 'locate' | 'play' | 'pause' | 'layers' | 'close' | 'chevron' | 'external';
  let { name, size = 18 }: { name: Name; size?: number } = $props();
</script>

<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  {#if name === 'search'}
    <circle cx="11" cy="11" r="6.5" /><path d="m20 20-4.2-4.2" />
  {:else if name === 'locate'}
    <circle cx="12" cy="12" r="3.5" /><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3" />
  {:else if name === 'play'}
    <path d="M8 5.5v13l10.5-6.5L8 5.5Z" fill="currentColor" stroke="none" />
  {:else if name === 'pause'}
    <path d="M8 5v14M16 5v14" stroke-width="3" />
  {:else if name === 'layers'}
    <path d="m12 3 9 5-9 5-9-5 9-5Z" /><path d="m3 13 9 5 9-5" />
  {:else if name === 'close'}
    <path d="M6 6l12 12M18 6 6 18" />
  {:else if name === 'chevron'}
    <path d="m6 9 6 6 6-6" />
  {:else if name === 'external'}
    <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
  {/if}
</svg>
