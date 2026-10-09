import { Classroom, ScheduleEntry, Subject, Teacher } from '../core/models';
import { BLOCKS_PER_WEEK, analyzeSchedule } from './schedule-analysis';

const teacher = (id: number, nombre: string): Teacher => ({ id, nombre, email: `${id}@x.co` });
const subject = (id: number, profesor_id: number): Subject => ({ id, nombre: `M${id}`, intensidad_horaria: 2, grupo_id: 1, profesor_id });
const entry = (id: number, materia_id: number, dia_semana: ScheduleEntry['dia_semana'], hour: number, aula_id = 1): ScheduleEntry => ({
  id,
  materia_id,
  aula_id,
  dia_semana,
  hora_inicio: `${String(hour).padStart(2, '0')}:00:00`,
  hora_fin: `${String(hour + 1).padStart(2, '0')}:00:00`,
});

describe('analyzeSchedule (Web Worker logic)', () => {
  const teachers = [teacher(1, 'Ana'), teacher(2, 'Luis')];
  const subjects = [subject(10, 1), subject(20, 2)];
  const classrooms: Classroom[] = [
    { id: 1, nombre: 'Aula 101', aforo: 40 },
    { id: 2, nombre: 'Aula 102', aforo: 30 },
  ];

  it('counts idle hours between two classes on the same day', () => {
    // Ana: Monday 8:00 and 11:00 -> 9:00 and 10:00 are idle (2 h). Tuesday has a single class (0 h).
    const entries = [entry(1, 10, 'Lunes', 8), entry(2, 10, 'Lunes', 11), entry(3, 10, 'Martes', 9)];
    const result = analyzeSchedule({ entries, subjects, teachers, classrooms });
    expect(result.idleHoursByTeacher).toEqual([
      { teacherName: 'Ana', idleHours: 2 },
      { teacherName: 'Luis', idleHours: 0 },
    ]);
  });

  it('computes classroom usage over 80 weekly blocks, like the backend', () => {
    expect(BLOCKS_PER_WEEK).toBe(80);
    const entries = Array.from({ length: 16 }, (_, i) => entry(i + 1, 20, 'Miércoles', 6 + i, 2));
    const usage = analyzeSchedule({ entries, subjects, teachers, classrooms }).classroomUsage;
    expect(usage).toEqual([
      { classroomName: 'Aula 101', hoursUsed: 0, usagePercent: 0 },
      { classroomName: 'Aula 102', hoursUsed: 16, usagePercent: 20 },
    ]);
  });
});
