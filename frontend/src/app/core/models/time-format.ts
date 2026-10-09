// How hours are shown to the user: 12-hour clock with a. m. / p. m. (Colombian style), same as backend/time_format.py.

/** 18 -> "6:00 p. m.", 8 -> "8:00 a. m.", 12 -> "12:00 p. m.". */
export function formatHour(hour: number): string {
  const suffix = hour < 12 ? 'a. m.' : 'p. m.';
  return `${hour % 12 || 12}:00 ${suffix}`;
}

/** (18, 22) -> "6:00 p. m. – 10:00 p. m.". */
export function formatRange(start: number, end: number): string {
  return `${formatHour(start)} – ${formatHour(end)}`;
}
