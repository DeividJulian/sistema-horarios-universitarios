import { formatRange } from './time-format';

// Shift (jornada) of a group. The values are the API contract; the labels are what the user sees.
export type Shift = 'todo' | 'manana' | 'tarde' | 'noche';

export interface ShiftInfo {
  value: Shift;
  label: string;
  /** Hour the first class may start and hour the last class must end (same as SHIFTS in backend/services/csp.py). */
  start: number;
  end: number;
}

export const SHIFTS: ShiftInfo[] = [
  { value: 'todo', label: 'Sin jornada fija', start: 6, end: 22 },
  { value: 'manana', label: 'Mañana', start: 7, end: 13 },
  { value: 'tarde', label: 'Tarde', start: 13, end: 18 },
  { value: 'noche', label: 'Noche', start: 18, end: 22 },
];

export function shiftInfo(shift: string | undefined): ShiftInfo {
  return SHIFTS.find((s) => s.value === shift) ?? SHIFTS[0];
}

/** "Noche (6:00 p. m. – 10:00 p. m.)", or just the label for groups without a fixed shift. */
export function shiftText(shift: string | undefined): string {
  const info = shiftInfo(shift);
  return info.value === 'todo' ? info.label : `${info.label} (${formatRange(info.start, info.end)})`;
}

/** Label for the shift selector, always with its hours. */
export function shiftOptionText(info: ShiftInfo): string {
  return `${info.label} (${formatRange(info.start, info.end)})`;
}
