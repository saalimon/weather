<script lang="ts">
  import uPlot from 'uplot';
  import 'uplot/dist/uPlot.min.css';

  let {
    data,
    options,
    height = 180,
  }: {
    data: uPlot.AlignedData;
    options: (width: number, height: number) => uPlot.Options;
    height?: number;
  } = $props();

  let el: HTMLDivElement;
  let plot: uPlot | null = null;

  $effect(() => {
    const width = el.clientWidth || 360;
    plot = new uPlot({ legend: { show: false }, ...options(width, height) }, data, el);
    const ro = new ResizeObserver(([entry]) => {
      const w = Math.floor(entry.contentRect.width);
      if (w > 0 && plot && w !== plot.width) plot.setSize({ width: w, height });
    });
    ro.observe(el);
    return () => {
      ro.disconnect();
      plot?.destroy();
      plot = null;
    };
  });
</script>

<div class="chart" bind:this={el}></div>

<style>
  .chart {
    width: 100%;
    min-height: 1px;
  }
  .chart :global(.u-wrap) {
    font-family: var(--font-body);
  }
</style>
