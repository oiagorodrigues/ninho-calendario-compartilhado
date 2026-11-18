import { parseLocalDate, toLocalDateString } from '../../shared/recurrence.ts';

export { parseLocalDate, toLocalDateString };

const LOCALE = 'pt-BR';
export const WEEKDAYS_SHORT = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'] as const;

const monthYear = new Intl.DateTimeFormat(LOCALE, { month: 'long', year: 'numeric' });
const monthOnly = new Intl.DateTimeFormat(LOCALE, { month: 'long' });
const time = new Intl.DateTimeFormat(LOCALE, { hour: '2-digit', minute: '2-digit' });
const weekdayLong = new Intl.DateTimeFormat(LOCALE, { weekday: 'long' });
const dayMonth = new Intl.DateTimeFormat(LOCALE, { day: 'numeric', month: 'short' });
const fullDate = new Intl.DateTimeFormat(LOCALE, { weekday: 'long', day: 'numeric', month: 'long' });

const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

export const formatMonth = (date: Date) => capitalize(monthOnly.format(date));
export const formatMonthYear = (date: Date) => capitalize(monthYear.format(date));
export const formatTime = (date: Date) => time.format(date);
export const formatDayMonth = (date: Date) => dayMonth.format(date).replace('.', '');
export const formatFullDate = (date: Date) => capitalize(fullDate.format(date));

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function addMonths(date: Date, months: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function startOfWeek(date: Date): Date {
  const day = startOfDay(date);
  return addDays(day, -day.getDay());
}

/** The 5 or 6 weeks (Sunday-first) that cover the month of `date`. */
export function monthGridDays(date: Date): Date[] {
  const first = new Date(date.getFullYear(), date.getMonth(), 1);
  const start = startOfWeek(first);
  const last = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  const weeks = Math.ceil((first.getDay() + last.getDate()) / 7);
  return Array.from({ length: weeks * 7 }, (_, i) => addDays(start, i));
}

export function relativeDayLabel(day: Date, today: Date): string {
  if (isSameDay(day, today)) return 'Hoje';
  if (isSameDay(day, addDays(today, 1))) return 'Amanhã';
  if (isSameDay(day, addDays(today, -1))) return 'Ontem';
  return `${capitalize(weekdayLong.format(day))}, ${formatDayMonth(day)}`;
}

/** `HH:MM` in local time, as `<input type="time">` expects. */
export function toTimeInput(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

export function combineLocal(dateValue: string, timeValue: string): Date {
  const day = parseLocalDate(dateValue);
  const [h, m] = timeValue.split(':').map(Number);
  day.setHours(h ?? 0, m ?? 0, 0, 0);
  return day;
}
