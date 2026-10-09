// Pure helpers for the visual availability editor: the grid works with 1-hour cells,
// the backend stores ranges (day, start, end). These functions convert between both.
import { Availability, WEEKDAYS, Weekday, hourOf } from '../../../core/models';

export interface HourRange {
  day: Weekday;
  start: number;
  end: number;
}

/** A cell is one available hour, written "Lunes|8" (from 8:00 to 9:00). */
export const cellKey = (day: Weekday, hour: number) => `${day}|${hour}`;

export function rangesToCells(slots: Availability[]): Set<string> {
  const cells = new Set<string>();
  for (const s of slots) {
    for (let h = hourOf(s.hora_inicio); h < hourOf(s.hora_fin); h++) cells.add(cellKey(s.dia_semana, h));
  }
  return cells;
}

/** Joins consecutive hours of the same day into ranges, ordered by day and hour. */
export function cellsToRanges(cells: Set<string>): HourRange[] {
  const ranges: HourRange[] = [];
  for (const day of WEEKDAYS) {
    const hours = [...cells]
      .filter((c) => c.startsWith(day + '|'))
      .map((c) => Number(c.split('|')[1]))
      .sort((a, b) => a - b);
    for (const h of hours) {
      const last = ranges.at(-1);
      if (last && last.day === day && last.end === h) last.end = h + 1;
      else ranges.push({ day, start: h, end: h + 1 });
    }
  }
  return ranges;
}

/** What must be deleted and created so the backend ends up with exactly `wanted`. */
export function diffRanges(existing: Availability[], wanted: HourRange[]) {
  const same = (a: Availability, r: HourRange) =>
    a.dia_semana === r.day && hourOf(a.hora_inicio) === r.start && hourOf(a.hora_fin) === r.end;
  return {
    toDelete: existing.filter((a) => !wanted.some((r) => same(a, r))),
    toCreate: wanted.filter((r) => !existing.some((a) => same(a, r))),
  };
}
