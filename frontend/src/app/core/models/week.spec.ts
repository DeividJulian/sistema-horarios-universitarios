import { displayedWeek, formatLongDate, formatShortDate, upcomingDates } from './week';

describe('week helpers', () => {
  it('shows the current week from Monday to Friday', () => {
    const week = displayedWeek(new Date(2026, 9, 14)); // Wednesday 14 October 2026
    expect(week).toEqual({
      Lunes: '2026-10-12',
      Martes: '2026-10-13',
      Miércoles: '2026-10-14',
      Jueves: '2026-10-15',
      Viernes: '2026-10-16',
    });
  });

  it('jumps to next week on Saturday and Sunday', () => {
    expect(displayedWeek(new Date(2026, 9, 17)).Lunes).toBe('2026-10-19'); // Saturday
    expect(displayedWeek(new Date(2026, 9, 18)).Lunes).toBe('2026-10-19'); // Sunday
  });

  it('lists the next dates of a weekday, today included', () => {
    const tuesday = new Date(2026, 9, 13);
    expect(upcomingDates('Martes', 3, tuesday)).toEqual(['2026-10-13', '2026-10-20', '2026-10-27']);
    expect(upcomingDates('Lunes', 2, tuesday)).toEqual(['2026-10-19', '2026-10-26']);
  });

  it('writes dates in Spanish', () => {
    expect(formatLongDate('2026-10-13')).toBe('martes 13 de octubre');
    expect(formatShortDate('2026-12-01')).toBe('1 dic');
  });
});
