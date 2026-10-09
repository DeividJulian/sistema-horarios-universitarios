import { ConflictKind } from '../../core/models';

/** Text the user sees for each conflict type returned by GET /conflictos. */
export const CONFLICT_LABELS: Record<ConflictKind, string> = {
  cruce_profesor: 'Cruce de profesor',
  cruce_aula: 'Cruce de aula',
  cruce_grupo: 'Cruce de grupo',
  sobrecupo: 'Sobrecupo',
  fuera_de_disponibilidad: 'Fuera de disponibilidad',
  fuera_de_jornada: 'Fuera de la jornada',
  tipo_de_aula: 'Tipo de aula incorrecto',
  intensidad_incorrecta: 'Horas incompletas',
};
