// The values are what the API expects and also what the user sees.
export const WEEKDAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'] as const;
export type Weekday = (typeof WEEKDAYS)[number];

// Possible start hours in the calendar (6:00 to 21:00, the last class ends at 22:00), same range as the backend validation
export const START_HOURS = Array.from({ length: 16 }, (_, i) => i + 6);

export function hourOf(time: string): number {
  return parseInt(time.split(':')[0], 10);
}

export function toApiTime(hour: number): string {
  return `${hour.toString().padStart(2, '0')}:00:00`;
}
