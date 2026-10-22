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
  /** Optional: also moves the block to this classroom (for example an option suggested by the AI). */
  aula_id?: number;
}

/** Figures of the metaheuristic phase (simulated annealing) that improves the CSP schedule. */
export interface OptimizationReport {
  horas_muertas_antes: number;
  horas_muertas_despues: number;
  iteraciones: number;
  mejoras: number;
  segundos: number;
}

export interface GenerationResult {
  mensaje: string;
  total_bloques: number;
  optimizacion?: OptimizationReport;
}
