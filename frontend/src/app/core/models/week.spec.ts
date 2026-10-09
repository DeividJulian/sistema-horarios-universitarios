import { formatLongDate, formatShortDate, upcomingDates, upcomingSchoolDays } from './week';

describe('week helpers', () => {
  it('shows the next five school days starting today', () => {
    const friday = new Date(2026, 9, 9); // Friday 9 October 2026
    expect(upcomingSchoolDays(5, friday)).toEqual([
      { day: 'Viernes', date: '2026-10-09' },
      { day: 'Lunes', date: '2026-10-12' },
      { day: 'Martes', date: '2026-10-13' },
      { day: 'Miércoles', date: '2026-10-14' },
      { day: 'Jueves', date: '2026-10-15' },
    ]);
  });

  it('starts on Monday during the weekend, and is a normal week on Monday', () => {
    expect(upcomingSchoolDays(5, new Date(2026, 9, 10))[0]).toEqual({ day: 'Lunes', date: '2026-10-12' }); // Saturday
    expect(upcomingSchoolDays(5, new Date(2026, 9, 11))[0]).toEqual({ day: 'Lunes', date: '2026-10-12' }); // Sunday
    expect(upcomingSchoolDays(5, new Date(2026, 9, 12)).map((d) => d.day)).toEqual(['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes']);
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
