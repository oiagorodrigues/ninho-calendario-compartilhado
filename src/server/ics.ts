import type { EventDto, FamilyDto } from '../shared/schemas.ts';

const RRULE_FREQ = { daily: 'DAILY', weekly: 'WEEKLY', monthly: 'MONTHLY', yearly: 'YEARLY' } as const;

function escapeText(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}

function compactDate(date: string): string {
  return date.replaceAll('-', '');
}

function compactInstant(iso: string): string {
  return new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

function nextDay(date: string): string {
  const next = new Date(`${date}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  return next.toISOString().slice(0, 10);
}

/** RFC 5545 §3.1: lines longer than 75 octets continue on the next line after a space. */
function fold(line: string): string {
  const bytes = Buffer.from(line, 'utf8');
  if (bytes.length <= 75) return line;
  const parts: string[] = [];
  let current = '';
  for (const char of line) {
    const limit = parts.length === 0 ? 75 : 74;
    if (Buffer.byteLength(current + char, 'utf8') > limit) {
      parts.push(current);
      current = char;
    } else {
      current += char;
    }
  }
  parts.push(current);
  return parts.join('\r\n ');
}

/** Builds a subscribable calendar feed with every event of the family. */
export function buildFamilyFeed(family: FamilyDto, events: readonly EventDto[], memberNames: ReadonlyMap<string, string>): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Ninho//Agenda da familia//PT-BR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeText(family.name)}`,
  ];
  for (const event of events) {
    const who = event.memberIds.map((id) => memberNames.get(id)).filter((name) => name !== undefined);
    const description = [who.length > 0 ? `Quem: ${who.join(', ')}` : '', event.notes].filter(Boolean).join('\n');
    lines.push('BEGIN:VEVENT', `UID:${event.id}@ninho`, `DTSTAMP:${compactInstant(event.updatedAt)}`);
    if (event.allDay) {
      lines.push(`DTSTART;VALUE=DATE:${compactDate(event.start)}`, `DTEND;VALUE=DATE:${compactDate(nextDay(event.end))}`);
    } else {
      lines.push(`DTSTART:${compactInstant(event.start)}`, `DTEND:${compactInstant(event.end)}`);
    }
    if (event.recurrence !== 'none') {
      const until = event.recurrenceUntil === null ? '' : `;UNTIL=${compactDate(event.recurrenceUntil)}${event.allDay ? '' : 'T235959Z'}`;
      lines.push(`RRULE:FREQ=${RRULE_FREQ[event.recurrence]}${until}`);
    }
    lines.push(`SUMMARY:${escapeText(event.title)}`);
    if (event.location !== '') lines.push(`LOCATION:${escapeText(event.location)}`);
    if (description !== '') lines.push(`DESCRIPTION:${escapeText(description)}`);
    lines.push('END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return `${lines.map(fold).join('\r\n')}\r\n`;
}
