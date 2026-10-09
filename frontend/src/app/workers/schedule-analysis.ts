// Pure analysis logic, kept apart from the worker entry point so it can be unit tested.
import { Classroom, ScheduleEntry, Subject, Teacher, WEEKDAYS, hourOf } from '../core/models';

export interface AnalysisResult {
  idleHoursByTeacher: { teacherName: string; idleHours: number }[];
  classroomUsage: { classroomName: string; hoursUsed: number; usagePercent: number }[];
}

export interface AnalysisInput {
  entries: ScheduleEntry[];
  subjects: Subject[];
  teachers: Teacher[];
  classrooms: Classroom[];
}

// 5 days x 16 start hours (6:00 to 21:00) = 80 possible blocks, same as the backend
export const BLOCKS_PER_WEEK = 5 * 16;

export function analyzeSchedule({ entries, subjects, teachers, classrooms }: AnalysisInput): AnalysisResult {
  // Idle gaps (free hours between two classes on the same day) per teacher
  const idleHoursByTeacher = teachers.map((teacher) => {
    const subjectIds = new Set(subjects.filter((s) => s.profesor_id === teacher.id).map((s) => s.id));
    const teacherEntries = entries.filter((e) => subjectIds.has(e.materia_id));

    let idleHours = 0;
    for (const day of WEEKDAYS) {
      const hours = teacherEntries
        .filter((e) => e.dia_semana === day)
        .map((e) => hourOf(e.hora_inicio))
        .sort((a, b) => a - b);
      for (let i = 1; i < hours.length; i++) {
        idleHours += Math.max(0, hours[i] - hours[i - 1] - 1);
      }
    }
    return { teacherName: teacher.nombre, idleHours };
  });

  const classroomUsage = classrooms.map((classroom) => {
    const hoursUsed = entries.filter((e) => e.aula_id === classroom.id).length;
    return {
      classroomName: classroom.nombre,
      hoursUsed,
      usagePercent: Math.round((hoursUsed / BLOCKS_PER_WEEK) * 100),
    };
  });

  return { idleHoursByTeacher, classroomUsage };
}
