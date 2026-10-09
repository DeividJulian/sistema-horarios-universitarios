// Response shapes of GET /estadisticas, GET /conflictos and POST /seed (backend JSON contract, in Spanish).

export interface Statistics {
  totales: {
    profesores: number;
    aulas: number;
    grupos: number;
    materias: number;
    bloques_programados: number;
  };
  cumplimiento: {
    horas_requeridas: number;
    horas_programadas: number;
    porcentaje: number;
  };
  ocupacion_aulas: {
    aula_id: number;
    aula: string;
    aforo: number;
    horas_ocupadas: number;
    ocupacion_pct: number;
  }[];
  carga_profesores: {
    profesor_id: number;
    profesor: string;
    horas_semanales: number;
    dias_con_clase: number;
    franjas_muertas: number;
  }[];
  distribucion_por_dia: { dia: string; bloques: number }[];
}

export type ConflictKind =
  | 'cruce_profesor'
  | 'cruce_aula'
  | 'cruce_grupo'
  | 'sobrecupo'
  | 'fuera_de_disponibilidad'
  | 'fuera_de_jornada'
  | 'tipo_de_aula'
  | 'intensidad_incorrecta';

export interface Conflict {
  tipo: ConflictKind;
  descripcion: string;
  horario_ids: number[];
}

export interface ConflictReport {
  total: number;
  hay_conflictos: boolean;
  conflictos: Conflict[];
}

export interface SeedResult {
  mensaje: string;
  resumen: { profesores: number; aulas: number; grupos: number; materias: number; horas_semanales: number };
  respaldo?: BackupInfo;
}

/** Copy of the data that the demo replaced (GET /seed/backup). */
export interface BackupInfo {
  existe: boolean;
  creado_en?: string;
  resumen?: { profesores: number; aulas: number; grupos: number; materias: number; bloques: number };
}

export type ReadinessSection = 'aulas' | 'grupos' | 'profesores' | 'materias';

/** One thing that stops the generator (GET /diagnostico). */
export interface ReadinessProblem {
  tipo: string;
  mensaje: string;
  seccion: ReadinessSection;
  profesor_id: number | null;
}

export interface Readiness {
  listo: boolean;
  problemas: ReadinessProblem[];
}
