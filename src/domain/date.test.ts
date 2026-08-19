import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { isSameLocalDate, toLocalDateKey } from './date';

describe('toLocalDateKey', () => {
  it('converts an ordinary date to a local date key', () => {
    expect(toLocalDateKey(new Date(2026, 6, 29, 15, 0))).toBe('2026-07-29');
  });

  describe('around the KST local midnight boundary', () => {
    const originalTz = process.env.TZ;

    beforeEach(() => {
      process.env.TZ = 'Asia/Seoul';
    });

    afterEach(() => {
      process.env.TZ = originalTz;
    });

    it('rolls over to the next local date right after KST midnight, while UTC is still the previous day', () => {
      // 2026-08-19T00:30:00+09:00 == 2026-08-18T15:30:00Z
      const utcTimestamp = new Date('2026-08-18T15:30:00.000Z');
      expect(utcTimestamp.toISOString().slice(0, 10)).toBe('2026-08-18');
      expect(toLocalDateKey(utcTimestamp)).toBe('2026-08-19');
    });

    it('stays on the previous local date just before KST midnight', () => {
      // 2026-08-18T23:59:00+09:00 == 2026-08-18T14:59:00Z
      const utcTimestamp = new Date('2026-08-18T14:59:00.000Z');
      expect(toLocalDateKey(utcTimestamp)).toBe('2026-08-18');
    });
  });
});

describe('isSameLocalDate', () => {
  it('returns true when checkedAt falls on today (local date)', () => {
    const now = new Date(2026, 6, 29, 8, 0);
    const checkedAt = new Date(2026, 6, 29, 1, 0).toISOString();
    expect(isSameLocalDate(checkedAt, now)).toBe(true);
  });

  it('returns false for a check-in from a different local day', () => {
    const now = new Date(2026, 6, 29, 8, 0);
    const checkedAt = new Date(2026, 6, 28, 23, 59).toISOString();
    expect(isSameLocalDate(checkedAt, now)).toBe(false);
  });

  describe('when the UTC date and the local (KST) date differ', () => {
    const originalTz = process.env.TZ;

    beforeEach(() => {
      process.env.TZ = 'Asia/Seoul';
    });

    afterEach(() => {
      process.env.TZ = originalTz;
    });

    it('still counts a check-in made right after local midnight as today', () => {
      // Both timestamps land on 2026-08-19 in KST, but their UTC dates differ
      // (08-19 vs 08-18), so naively comparing toISOString().slice(0, 10)
      // would wrongly say the check-in was not made today.
      const now = new Date('2026-08-19T00:30:00.000Z'); // 2026-08-19T09:30+09:00
      const checkedAt = '2026-08-18T20:00:00.000Z'; // 2026-08-19T05:00+09:00
      expect(now.toISOString().slice(0, 10)).not.toBe(checkedAt.slice(0, 10));
      expect(isSameLocalDate(checkedAt, now)).toBe(true);
    });
  });
});
