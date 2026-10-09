import { WEEKDAYS, Weekday } from './weekday';

const WEEKDAY_NAMES = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

/** Local date as the API writes it: "2026-10-13". */
export function toIsoDate(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function fromIsoDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** A day with classes and its date ("Viernes", "2026-10-09"). */
export interface SchoolDay {
  day: Weekday;
  date: string;
}

/**
 * The next school days, starting today: on Friday 9 they are Friday 9, Monday 12, Tuesday 13,
 * Wednesday 14 and Thursday 15. Days already gone and weekends are not shown.
 */
export function upcomingSchoolDays(count = 5, today = new Date()): SchoolDay[] {
  const date = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const days: SchoolDay[] = [];
  while (days.length < count) {
    const weekday = date.getDay(); // 0 Sunday ... 6 Saturday
    if (weekday >= 1 && weekday <= 5) days.push({ day: WEEKDAYS[weekday - 1], date: toIsoDate(date) });
    date.setDate(date.getDate() + 1);
  }
  return days;
}

/** Next dates (today included) on which a class of that weekday takes place. */
export function upcomingDates(weekday: Weekday, count = 4, today = new Date()): string[] {
  const target = WEEKDAYS.indexOf(weekday) + 1; // getDay(): Monday = 1
  const date = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  while (date.getDay() !== target) date.setDate(date.getDate() + 1);
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(date);
    d.setDate(date.getDate() + i * 7);
    return toIsoDate(d);
  });
}

/** "2026-10-13" -> "13 oct" */
export function formatShortDate(iso: string): string {
  const date = fromIsoDate(iso);
  return `${date.getDate()} ${MONTHS[date.getMonth()].slice(0, 3)}`;
}

/** "2026-10-13" -> "martes 13 de octubre" */
export function formatLongDate(iso: string): string {
  const date = fromIsoDate(iso);
  return `${WEEKDAY_NAMES[date.getDay()]} ${date.getDate()} de ${MONTHS[date.getMonth()]}`;
}
