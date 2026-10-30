import { describe, expect, it } from 'vitest';
import { parseRain, parseWaterLevel, rainColor, situationFor } from './thaiwater';

describe('situationFor', () => {
  it('follows the ThaiWater bank-full scale', () => {
    expect(situationFor(124.6).level).toBe(5);
    expect(situationFor(100).level).toBe(4);
    expect(situationFor(70.1).level).toBe(4);
    expect(situationFor(50).level).toBe(3);
    expect(situationFor(30).level).toBe(2);
    expect(situationFor(10).level).toBe(1);
    expect(situationFor(null).level).toBe(0);
    expect(situationFor(NaN).level).toBe(0);
  });
});

describe('rainColor', () => {
  it('returns null for dry stations', () => {
    expect(rainColor(0)).toBeNull();
    expect(rainColor(0.1)).not.toBeNull();
    expect(rainColor(136.5)).toBe('#d44df0');
  });
});

describe('parseRain', () => {
  it('maps station rows and drops ones without coordinates', () => {
    const rows = parseRain({
      result: 'OK',
      data: [
        {
          id: 1,
          rain_24h: 136.5,
          rain_1h: 0,
          rainfall_datetime: '2026-10-30 14:00',
          agency: { agency_shortname: { th: 'ทน.', en: 'DWR' } },
          geocode: { province_name: { th: 'ประจวบคีรีขันธ์', en: 'Prachuap Khiri Khan' }, amphoe_name: { en: 'Bang Saphan District' } },
          station: { id: 6855974, tele_station_name: { th: 'สะพานบ้านทุ่งมะพร้าว' }, tele_station_lat: 11.235511, tele_station_long: 99.471052 },
        },
        { id: 2, rain_24h: 1, station: { id: 9, tele_station_lat: null, tele_station_long: null } },
      ],
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      id: 6855974,
      name: 'สะพานบ้านทุ่งมะพร้าว',
      province: 'Prachuap Khiri Khan',
      agency: 'DWR',
      rain24h: 136.5,
      lat: 11.235511,
    });
  });
});

describe('parseWaterLevel', () => {
  it('reads nested waterlevel_data and derives situation', () => {
    const rows = parseWaterLevel({
      waterlevel_data: {
        data: [
          {
            id: 1,
            waterlevel_datetime: '2026-10-30 15:00',
            waterlevel_msl: '3.17',
            storage_percent: '124.64',
            station: { id: 737, tele_station_name: { en: 'Tha Chedi Temple (TTC06)' }, tele_station_lat: 14.15657, tele_station_long: 100.12744 },
            basin: { basin_name: { en: 'Tha Chin Basin' } },
          },
        ],
      },
    });
    expect(rows[0]).toMatchObject({ id: 737, levelMsl: 3.17, storagePercent: 124.64, basin: 'Tha Chin Basin' });
    expect(rows[0].situation.level).toBe(5);
  });
});
