import type { EventDto, Recurrence } from './schemas.ts';

export interface Occurrence {
  /** Stable per occurrence: series id plus the occurrence's local start date. */
  key: string;
  event: EventDto;
  /** Local start; for all-day events, midnight of the first day. */
  start: Date;
  /** Exclusive local end; for all-day events, midnight after the last day. */
  end: Date;
}

const MAX_OCCURRENCES_PER_SERIES = 1000;
const DAY_MS = 86_400_000;
// Upper bounds per step, so the jump-ahead estimate never skips an occurrence.
const MAX_STEP_MS: Record<Exclude<Recurrence, 'none'>, number> = {
  daily: DAY_MS + 3_600_000,
  weekly: 7 * DAY_MS + 3_600_000,
  monthly: 31 * DAY_MS + 3_600_000,
  yearly: 366 * DAY_MS + 3_600_000,
};

export function parseLocalDate(value: string): Date {
  const [y, m, d] = value.split('-').map(Number);
  if (y === undefined || m === undefined || d === undefined) throw new Error(`Invalid date: ${value}`);
  return new Date(y, m - 1, d);
}

export function toLocalDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function baseBounds(event: EventDto): { start: Date; end: Date } {
  if (event.allDay) {
    const start = parseLocalDate(event.start);
    const end = parseLocalDate(event.end);
    end.setDate(end.getDate() + 1);
    return { start, end };
  }
  return { start: new Date(event.start), end: new Date(event.end) };
}

/**
 * Returns the i-th start of the series, or null when that step does not exist
 * (a monthly series on the 31st skips shorter months, a yearly one on 29/02 skips non-leap years).
 */
function nthStart(base: Date, recurrence: Exclude<Recurrence, 'none'>, i: number): Date | null {
  const next = new Date(base);
  switch (recurrence) {
    case 'daily':
      next.setDate(base.getDate() + i);
      return next;
    case 'weekly':
      next.setDate(base.getDate() + i * 7);
      return next;
    case 'monthly':
      next.setDate(1);
      next.setMonth(base.getMonth() + i);
      next.setDate(base.getDate());
      return next.getDate() === base.getDate() ? next : null;
    case 'yearly':
      next.setDate(1);
      next.setFullYear(base.getFullYear() + i);
      next.setDate(base.getDate());
      return next.getMonth() === base.getMonth() && next.getDate() === base.getDate() ? next : null;
    default: {
      const exhaustive: never = recurrence;
      throw new Error(`Unknown recurrence ${String(exhaustive)}`);
    }
  }
}

/** Shifts `start` by the event's duration, in calendar days for all-day events so DST can't skew it. */
function endFor(event: EventDto, base: { start: Date; end: Date }, start: Date): Date {
  if (event.allDay) {
    const days = Math.round((base.end.getTime() - base.start.getTime()) / DAY_MS);
    const end = new Date(start);
    end.setDate(end.getDate() + days);
    return end;
  }
  return new Date(start.getTime() + (base.end.getTime() - base.start.getTime()));
}

/** Expands events into the occurrences that overlap [from, to), in the runtime's local time zone. */
export function expandOccurrences(events: readonly EventDto[], from: Date, to: Date): Occurrence[] {
  const result: Occurrence[] = [];
  for (const event of events) {
    const base = baseBounds(event);
    if (event.recurrence === 'none') {
      if (base.start < to && base.end > from) {
        result.push({ key: `${event.id}:${toLocalDateString(base.start)}`, event, start: base.start, end: base.end });
      }
      continue;
    }
    const until = event.recurrenceUntil === null ? null : parseLocalDate(event.recurrenceUntil);
    if (until !== null) until.setDate(until.getDate() + 1);
    const duration = base.end.getTime() - base.start.getTime();
    const firstUseful = Math.max(
      0,
      Math.floor((from.getTime() - duration - base.start.getTime()) / MAX_STEP_MS[event.recurrence]) - 1,
    );
    for (let i = firstUseful, emitted = 0; emitted < MAX_OCCURRENCES_PER_SERIES; i++) {
      const start = nthStart(base.start, event.recurrence, i);
      if (start === null) continue;
      if (start >= to || (until !== null && start >= until)) break;
      const end = endFor(event, base, start);
      if (end > from) {
        result.push({ key: `${event.id}:${toLocalDateString(start)}`, event, start, end });
        emitted++;
      }
    }
  }
  return result.sort((a, b) => a.start.getTime() - b.start.getTime() || Number(b.event.allDay) - Number(a.event.allDay));
}
