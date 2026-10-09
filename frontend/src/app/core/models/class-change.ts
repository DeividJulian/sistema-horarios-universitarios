/** A class that will not take place on one date (the weekly block stays in the schedule). */
export interface Cancellation {
  id: number;
  horario_id: number;
  /** "YYYY-MM-DD" */
  fecha: string;
  motivo: string;
}

export type NotificationKind = 'cancelacion' | 'restablecida' | 'cambio_aula' | 'cambio_horario';

/** Notice for the students of a group. */
export interface ScheduleNotice {
  id: number;
  grupo_id: number;
  materia_id: number | null;
  horario_id: number | null;
  tipo: NotificationKind;
  titulo: string;
  mensaje: string;
  creada_en: string;
}
