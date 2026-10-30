import uPlot from 'uplot';

export const AXIS_FONT = '500 11px Inter, system-ui, sans-serif';

export function axis(overrides: Partial<uPlot.Axis> = {}): uPlot.Axis {
  return {
    stroke: '#7a7a7a',
    font: AXIS_FONT,
    grid: { stroke: 'rgba(255,255,255,0.06)', width: 1 },
    ticks: { show: false },
    gap: 6,
    size: 34,
    ...overrides,
  };
}

/** Vertical gradient fill for a series, from `color` fading to transparent. */
export function fadeFill(color: string, alphaTop = 0.35) {
  return (u: uPlot) => {
    // uPlot also calls fills for legend swatches before the plot box is measured.
    if (!u.bbox || !Number.isFinite(u.bbox.top) || !u.bbox.height) return hexA(color, alphaTop);
    const g = u.ctx.createLinearGradient(0, u.bbox.top, 0, u.bbox.top + u.bbox.height);
    g.addColorStop(0, hexA(color, alphaTop));
    g.addColorStop(1, hexA(color, 0));
    return g;
  };
}

export function hexA(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

export const bars = (size = 0.7) => uPlot.paths.bars!({ size: [size, 24], radius: 0.25 });
export const smooth = () => uPlot.paths.spline!();
