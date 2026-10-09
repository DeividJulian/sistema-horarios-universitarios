import { Weekday } from './weekday';

export interface ScheduleEntry {
  id: number;
  materia_id: number;
  aula_id: number;
  dia_semana: Weekday;
  hora_inicio: string;
  hora_fin: string;
}

export interface ScheduleEntryMove {
  dia_semana: Weekday;
  hora_inicio: string;
}

export interface GenerationResult {
  mensaje: string;
  total_bloques: number;
}
