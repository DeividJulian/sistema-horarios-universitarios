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

/**
 * Dates (ISO) of the week the calendar shows: this week from Monday to Friday,
 * or the next one on Saturday and Sunday, when this week's classes are over.
 */
export function displayedWeek(today = new Date()): Record<Weekday, string> {
  const monday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const day = monday.getDay(); // 0 Sunday ... 6 Saturday
  const offset = day === 0 ? 1 : day === 6 ? 2 : 1 - day;
  monday.setDate(monday.getDate() + offset);
  const week = {} as Record<Weekday, string>;
  WEEKDAYS.forEach((weekday, i) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    week[weekday] = toIsoDate(date);
  });
  return week;
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
