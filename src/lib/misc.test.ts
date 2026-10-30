import { describe, expect, it } from 'vitest';
import { parseFrames } from './api/rainviewer';
import { compass, localTime } from './format';
import { distanceKm, nearest } from './geo';
import { describeCode } from './weatherCodes';

describe('geo', () => {
  it('computes great-circle distance', () => {
    // Bangkok -> Chiang Mai ≈ 580 km
    expect(distanceKm(13.7563, 100.5018, 18.7883, 98.9853)).toBeGreaterThan(570);
    expect(distanceKm(13.7563, 100.5018, 18.7883, 98.9853)).toBeLessThan(600);
  });

  it('finds the nearest item within a radius', () => {
    const items = [
      { id: 'a', lat: 13.7, lon: 100.5 },
      { id: 'b', lat: 18.8, lon: 99 },
    ];
    expect(nearest(items, 18, 99)?.item.id).toBe('b');
    expect(nearest(items, 0, 0, 50)).toBeNull();
  });
});

describe('format', () => {
  it('maps degrees to compass points', () => {
    expect(compass(0)).toBe('N');
    expect(compass(359)).toBe('N');
    expect(compass(225)).toBe('SW');
    expect(compass(-90)).toBe('W');
  });

  it('renders time in the forecast UTC offset', () => {
    // 2026-10-30T08:00Z in Bangkok (+7) is 15:00
    expect(localTime(1793347200, 25200, { hour: '2-digit', minute: '2-digit' })).toBe('15:00');
  });
});

describe('describeCode', () => {
  it('labels WMO codes and swaps night icons', () => {
    expect(describeCode(95).mood).toBe('storm');
    expect(describeCode(0, false).icon).toBe('☾');
    expect(describeCode(1234).label).toBe('Unknown');
  });
});

describe('parseFrames', () => {
  it('orders past and nowcast frames and builds tile URLs', () => {
    const f = parseFrames({
      host: 'https://tilecache.rainviewer.com',
      radar: { past: [{ time: 2, path: '/v2/radar/b' }, { time: 1, path: '/v2/radar/a' }], nowcast: [{ time: 3, path: '/v2/radar/c' }] },
    });
    expect(f.map((x) => x.time)).toEqual([1, 2, 3]);
    expect(f[2].nowcast).toBe(true);
    expect(f[0].url).toBe('https://tilecache.rainviewer.com/v2/radar/a/256/{z}/{x}/{y}/2/1_1.png');
  });
});
