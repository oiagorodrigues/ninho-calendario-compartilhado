import { describe, expect, it } from 'vitest';
import { expandOccurrences } from '../../src/shared/recurrence.ts';
import type { EventDto } from '../../src/shared/schemas.ts';

function event(overrides: Partial<EventDto>): EventDto {
  return {
    id: 'e1',
    title: 'Natação',
    notes: '',
    location: '',
    allDay: false,
    start: '2026-11-03T22:00:00.000Z',
    end: '2026-11-03T23:00:00.000Z',
    recurrence: 'none',
    recurrenceUntil: null,
    memberIds: ['m'],
    createdBy: null,
    updatedAt: '2026-11-01T00:00:00.000Z',
    ...overrides,
  };
}

const localDates = (occurrences: { start: Date }[]) =>
  occurrences.map((o) => `${o.start.getFullYear()}-${o.start.getMonth() + 1}-${o.start.getDate()} ${o.start.getHours()}:${String(o.start.getMinutes()).padStart(2, '0')}`);

describe('expandOccurrences', () => {
  it('returns a one-off event only when it overlaps the range', () => {
    const one = event({});
    expect(expandOccurrences([one], new Date(2026, 10, 1), new Date(2026, 10, 30))).toHaveLength(1);
    expect(expandOccurrences([one], new Date(2026, 10, 4), new Date(2026, 10, 30))).toHaveLength(0);
  });

  it('keeps a weekly event at the same local hour across a DST change', () => {
    // 2026-10-27 17:00 in New York is EDT (UTC-4); DST ends on 2026-11-01.
    const weekly = event({ start: '2026-10-27T21:00:00.000Z', end: '2026-10-27T22:00:00.000Z', recurrence: 'weekly' });
    const result = expandOccurrences([weekly], new Date(2026, 9, 25), new Date(2026, 10, 12));
    expect(localDates(result)).toEqual(['2026-10-27 17:00', '2026-11-3 17:00', '2026-11-10 17:00']);
  });

  it('stops at recurrenceUntil, inclusive', () => {
    const weekly = event({ start: '2026-11-03T22:00:00.000Z', end: '2026-11-03T23:00:00.000Z', recurrence: 'weekly', recurrenceUntil: '2026-11-17' });
    const result = expandOccurrences([weekly], new Date(2026, 10, 1), new Date(2027, 0, 1));
    expect(result.map((o) => o.start.getDate())).toEqual([3, 10, 17]);
  });

  it('skips months without the day for a monthly series on the 31st', () => {
    const monthly = event({ allDay: true, start: '2026-01-31', end: '2026-01-31', recurrence: 'monthly' });
    const result = expandOccurrences([monthly], new Date(2026, 0, 1), new Date(2026, 5, 1));
    expect(result.map((o) => o.start.getMonth() + 1)).toEqual([1, 3, 5]);
  });

  it('keeps yearly 29 Feb only in leap years', () => {
    const yearly = event({ allDay: true, start: '2028-02-29', end: '2028-02-29', recurrence: 'yearly' });
    const result = expandOccurrences([yearly], new Date(2028, 0, 1), new Date(2037, 0, 1));
    expect(result.map((o) => o.start.getFullYear())).toEqual([2028, 2032, 2036]);
  });

  it('gives all-day events an exclusive end at midnight after the last day', () => {
    const trip = event({ allDay: true, start: '2026-11-24', end: '2026-11-26' });
    const [occurrence] = expandOccurrences([trip], new Date(2026, 10, 1), new Date(2026, 11, 1));
    expect(occurrence?.end).toEqual(new Date(2026, 10, 27));
  });

  it('includes a multi-day occurrence that started before the range', () => {
    const trip = event({ allDay: true, start: '2026-11-24', end: '2026-11-26' });
    expect(expandOccurrences([trip], new Date(2026, 10, 26), new Date(2026, 10, 27))).toHaveLength(1);
  });

  it('jumps ahead for old daily series without losing the first visible day', () => {
    const daily = event({ allDay: true, start: '2010-01-01', end: '2010-01-01', recurrence: 'daily' });
    const result = expandOccurrences([daily], new Date(2026, 10, 15), new Date(2026, 10, 18));
    expect(result.map((o) => o.start.getDate())).toEqual([15, 16, 17]);
  });

  it('sorts all-day events before timed ones on the same start', () => {
    const timed = event({ id: 'timed', start: '2026-11-20T05:00:00.000Z', end: '2026-11-20T06:00:00.000Z' });
    const allDay = event({ id: 'all', allDay: true, start: '2026-11-20', end: '2026-11-20' });
    const result = expandOccurrences([timed, allDay], new Date(2026, 10, 20), new Date(2026, 10, 21));
    expect(result.map((o) => o.event.id)).toEqual(['all', 'timed']);
  });
});
