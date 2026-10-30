<script lang="ts">
  import { Tween, prefersReducedMotion } from 'svelte/motion';
  import { cubicOut } from 'svelte/easing';

  let { value, digits = 0 }: { value: number | null | undefined; digits?: number } = $props();

  const tween = new Tween(0, { duration: 900, easing: cubicOut });

  $effect(() => {
    if (value != null && Number.isFinite(value)) tween.set(value, { duration: prefersReducedMotion.current ? 0 : 900 });
  });
</script>

<span class="num">{value == null || !Number.isFinite(value) ? '–' : tween.current.toFixed(digits)}</span>
