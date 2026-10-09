import { ScheduleEntry, Subject } from '../../core/models';

export interface ScheduleFilter {
  teacherId: number | null;
  groupId: number | null;
  classroomId: number | null;
}

export const EMPTY_FILTER: ScheduleFilter = { teacherId: null, groupId: null, classroomId: null };

export function matchesFilter(entry: ScheduleEntry, subject: Subject | undefined, filter: ScheduleFilter): boolean {
  if (!subject) return false;
  if (filter.teacherId !== null && subject.profesor_id !== filter.teacherId) return false;
  if (filter.groupId !== null && subject.grupo_id !== filter.groupId) return false;
  if (filter.classroomId !== null && entry.aula_id !== filter.classroomId) return false;
  return true;
}
