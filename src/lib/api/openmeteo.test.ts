import { describe, expect, it } from 'vitest';
import { aggregateSeasonal, quantile, summarizeNowcast } from './openmeteo';

describe('quantile', () => {
  it('interpolates between ranks', () => {
    expect(quantile([0, 10], 0.5)).toBe(5);
    expect(quantile([1, 2, 3, 4, 5], 0.1)).toBeCloseTo(1.4);
    expect(quantile([7], 0.9)).toBe(7);
  });
});

describe('aggregateSeasonal', () => {
  const days = Array.from({ length: 14 }, (_, i) => `2026-11-${String(i + 1).padStart(2, '0')}`);
  const col = (v: number) => days.map(() => v);

  it('builds weekly quantiles across control + members', () => {
    const s = aggregateSeasonal({
      time: days,
      temperature_2m_max: col(30),
      temperature_2m_max_member01: col(32),
      temperature_2m_max_member02: col(34),
      temperature_2m_min: col(20),
      temperature_2m_min_member01: col(22),
      temperature_2m_min_member02: col(24),
      precipitation_sum: col(1),
      precipitation_sum_member01: col(2),
      precipitation_sum_member02: col(3),
    });
    expect(s.members).toBe(3);
    expect(s.weeks).toHaveLength(2);
    expect(s.weeks[0].start).toBe('2026-11-01');
    expect(s.weeks[0].tMax.p50).toBe(32);
    expect(s.weeks[0].tMin.p50).toBe(22);
    expect(s.weeks[0].precip.p50).toBe(14); // 2 mm/day * 7
    expect(s.weeks[0].precip.p10).toBeLessThan(s.weeks[0].precip.p90);
  });

  it('drops weeks with too few valid days and scales partial weeks to 7 days', () => {
    const t = days.slice(0, 12); // week 2 has 5 days
    const nulls = t.map((_, i) => (i < 7 ? null : 1));
    const s = aggregateSeasonal({
      time: t,
      temperature_2m_max: nulls,
      temperature_2m_min: nulls,
      precipitation_sum: nulls,
    });
    expect(s.weeks).toHaveLength(1);
    expect(s.weeks[0].start).toBe('2026-11-08');
    expect(s.weeks[0].precip.p50).toBe(7);
  });
});

describe('summarizeNowcast', () => {
  const t0 = 1_800_000_000;
  const time = Array.from({ length: 24 }, (_, i) => t0 + i * 900);

  it('reports dry outlook', () => {
    const s = summarizeNowcast(time, time.map(() => 0), t0);
    expect(s.raining).toBe(false);
    expect(s.startsInMin).toBeNull();
    expect(s.headline).toBe('No rain expected in the next 6 h');
  });

  it('finds when rain starts', () => {
    const p = time.map((_, i) => (i >= 3 ? 0.6 : 0));
    const s = summarizeNowcast(time, p, t0);
    expect(s.startsInMin).toBe(45);
    expect(s.headline).toBe('Rain likely in ~45 min');
    expect(s.totalMm).toBeCloseTo(12.6);
  });

  it('reports ongoing rain easing', () => {
    const p = time.map((_, i) => (i < 4 ? 1 : 0));
    const s = summarizeNowcast(time, p, t0 + 60);
    expect(s.raining).toBe(true);
    expect(s.headline).toMatch(/^Rain easing in ~\d+ min$/);
  });

  it('skips slots already in the past', () => {
    const p = time.map((_, i) => (i === 0 ? 5 : 0));
    const s = summarizeNowcast(time, p, t0 + 1000);
    expect(s.raining).toBe(false);
    expect(s.totalMm).toBe(0);
  });
});
