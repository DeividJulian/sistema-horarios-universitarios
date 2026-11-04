// Compile-time checks: the literal lists the app keeps by hand (with their labels and order) must be exactly
// the values of the backend contract. If the API adds or renames a value, this file stops compiling.
import type { ClassroomOut, GroupOut, ScheduleEntryOut, SubjectOut } from '../api/generated';
import type { RequiredRoomType, RoomType } from './room-type';
import type { Shift } from './shift';
import type { Weekday } from './weekday';

type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
const same = <A, B>(check: Same<A, B>) => check;

export const CONTRACT_CHECKS = [
  same<Weekday, ScheduleEntryOut['dia_semana']>(true),
  same<Shift, GroupOut['jornada']>(true),
  same<RoomType, ClassroomOut['tipo']>(true),
  same<RequiredRoomType, SubjectOut['tipo_aula']>(true),
] as const;
