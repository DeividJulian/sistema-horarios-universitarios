import { ScheduleEntry, Subject, hourOf, toApiTime } from '../../core/models';
import { EMPTY_FILTER, matchesFilter } from './schedule-filter';

describe('matchesFilter', () => {
  const subject: Subject = { id: 5, nombre: 'Redes', intensidad_horaria: 2, grupo_id: 3, profesor_id: 7 };
  const entry: ScheduleEntry = { id: 1, materia_id: 5, aula_id: 2, dia_semana: 'Lunes', hora_inicio: '08:00:00', hora_fin: '09:00:00' };

  it('shows every block with the empty filter', () => {
    expect(matchesFilter(entry, subject, EMPTY_FILTER)).toBe(true);
  });

  it('filters by teacher, group and classroom', () => {
    expect(matchesFilter(entry, subject, { ...EMPTY_FILTER, teacherId: 7 })).toBe(true);
    expect(matchesFilter(entry, subject, { ...EMPTY_FILTER, teacherId: 8 })).toBe(false);
    expect(matchesFilter(entry, subject, { ...EMPTY_FILTER, groupId: 4 })).toBe(false);
    expect(matchesFilter(entry, subject, { ...EMPTY_FILTER, classroomId: 2 })).toBe(true);
    expect(matchesFilter(entry, subject, { teacherId: 7, groupId: 3, classroomId: 1 })).toBe(false);
  });

  it('hides blocks whose subject is unknown', () => {
    expect(matchesFilter(entry, undefined, EMPTY_FILTER)).toBe(false);
  });
});

describe('time helpers', () => {
  it('converts between API times and hours', () => {
    expect(hourOf('08:00:00')).toBe(8);
    expect(hourOf('20:00:00')).toBe(20);
    expect(toApiTime(7)).toBe('07:00:00');
    expect(toApiTime(21)).toBe('21:00:00');
  });
});
