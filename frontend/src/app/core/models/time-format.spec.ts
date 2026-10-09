import { formatHour, formatRange } from './time-format';
import { shiftText } from './shift';

describe('time format (12-hour clock, like backend/time_format.py)', () => {
  it('writes hours with a. m. / p. m.', () => {
    expect(formatHour(6)).toBe('6:00 a. m.');
    expect(formatHour(12)).toBe('12:00 p. m.');
    expect(formatHour(13)).toBe('1:00 p. m.');
    expect(formatHour(22)).toBe('10:00 p. m.');
    expect(formatHour(0)).toBe('12:00 a. m.');
  });

  it('writes ranges and shifts', () => {
    expect(formatRange(18, 22)).toBe('6:00 p. m. – 10:00 p. m.');
    expect(shiftText('manana')).toBe('Mañana (7:00 a. m. – 1:00 p. m.)');
    expect(shiftText('todo')).toBe('Sin jornada fija');
  });
});
