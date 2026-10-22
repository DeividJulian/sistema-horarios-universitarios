// The AI only advises: these answers never change data by themselves.

/** GET /ai/status. The frontend shows the provider named here, never a hard-coded one. */
export interface AiStatus {
  configurada: boolean;
  proveedor: string;
  nombre_proveedor: string;
  modelo: string;
}

/** One slot and classroom where a conflicting class fits without breaking any rule. */
export interface ConflictOption {
  indice: number;
  dia_semana: string;
  hora_inicio: string;
  aula_id: number;
  aula: string;
  aforo: number;
  horas_muertas_grupo: number;
  horas_muertas_profesor: number;
  mismo_dia: boolean;
  misma_aula: boolean;
}

/** POST /ai/conflicts/{id}/suggestion */
export interface ConflictSuggestion {
  horario_id: number;
  conflictos: string[];
  opciones: ConflictOption[];
  recomendada: number | null;
  explicacion: string;
  motivos: string[];
  proveedor: string;
  modelo: string;
}

export type NoticeKind = 'cancelacion' | 'cambio_aula';

/** POST /ai/notices/draft */
export interface NoticeDraftRequest {
  horario_id: number;
  tipo: NoticeKind;
  fecha?: string;
  aula_id?: number;
  motivo?: string;
}

export interface NoticeDraft {
  titulo: string;
  mensaje: string;
  proveedor: string;
  modelo: string;
}
