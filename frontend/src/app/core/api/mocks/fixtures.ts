// Sample data typed with the contract (core/api/generated): if the backend changes a field, these fixtures stop
// compiling, and mock-fixtures.spec.ts parses each one with the generated Zod schema. Used by the mock API
// (`npm run start:mock`) to work on the frontend without the backend.
import type {
  AiStatus,
  AvailabilityOut,
  CancellationOut,
  ClassroomOut,
  ConflictReport,
  GroupOut,
  NotificationOut,
  ReadinessOut,
  RegisterGroup,
  ScheduleEntryOut,
  StatisticsOut,
  SubjectOut,
  TeacherOut,
  TokenOut,
  UserOut,
} from '../generated';

export const MOCK_ADMIN = {
  id: 1,
  nombre: 'Administración (mock)',
  email: 'admin@mock.local',
  rol: 'admin',
  profesor_id: null,
  grupo_id: null,
  verificado: true,
} satisfies UserOut;

export const MOCK_TEACHERS = [
  { id: 1, nombre: 'Docente Uno', email: 'docente1@mock.local' },
  { id: 2, nombre: 'Docente Dos', email: 'docente2@mock.local' },
] satisfies TeacherOut[];

export const MOCK_CLASSROOMS = [
  { id: 1, nombre: 'Aula 101', aforo: 40, tipo: 'general' },
  { id: 2, nombre: 'Laboratorio de Sistemas', aforo: 30, tipo: 'informatica' },
] satisfies ClassroomOut[];

export const MOCK_GROUPS = [
  { id: 1, nombre: '7A', num_estudiantes: 30, jornada: 'manana' },
  { id: 2, nombre: '5A', num_estudiantes: 28, jornada: 'todo' },
] satisfies GroupOut[];

export const MOCK_SUBJECTS = [
  { id: 1, nombre: 'Bases de Datos', intensidad_horaria: 2, grupo_id: 1, profesor_id: 1, tipo_aula: 'informatica' },
  { id: 2, nombre: 'Cálculo Diferencial', intensidad_horaria: 2, grupo_id: 2, profesor_id: 2, tipo_aula: 'cualquiera' },
] satisfies SubjectOut[];

export const MOCK_SCHEDULE = [
  { id: 1, materia_id: 1, aula_id: 2, dia_semana: 'Lunes', hora_inicio: '08:00:00', hora_fin: '09:00:00' },
  { id: 2, materia_id: 1, aula_id: 2, dia_semana: 'Miércoles', hora_inicio: '08:00:00', hora_fin: '09:00:00' },
  { id: 3, materia_id: 2, aula_id: 1, dia_semana: 'Lunes', hora_inicio: '08:00:00', hora_fin: '09:00:00' },
  { id: 4, materia_id: 2, aula_id: 1, dia_semana: 'Jueves', hora_inicio: '10:00:00', hora_fin: '11:00:00' },
] satisfies ScheduleEntryOut[];

export const MOCK_AVAILABILITY = [
  { id: 1, profesor_id: 1, dia_semana: 'Lunes', hora_inicio: '07:00:00', hora_fin: '12:00:00' },
  { id: 2, profesor_id: 1, dia_semana: 'Miércoles', hora_inicio: '07:00:00', hora_fin: '12:00:00' },
  { id: 3, profesor_id: 2, dia_semana: 'Lunes', hora_inicio: '08:00:00', hora_fin: '12:00:00' },
  { id: 4, profesor_id: 2, dia_semana: 'Jueves', hora_inicio: '08:00:00', hora_fin: '12:00:00' },
] satisfies AvailabilityOut[];

export const MOCK_CANCELLATIONS = [] satisfies CancellationOut[];

export const MOCK_NOTIFICATIONS = [
  {
    id: 1,
    grupo_id: 1,
    materia_id: 1,
    horario_id: 1,
    tipo: 'cambio_aula',
    titulo: 'Cambio de aula: Bases de Datos',
    mensaje: 'Desde ahora la clase de Bases de Datos (lunes, 8:00 a. m.) es en Laboratorio de Sistemas (antes en Aula 101).',
    creada_en: '2026-11-02T14:00:00+00:00',
  },
] satisfies NotificationOut[];

export const MOCK_STATISTICS = {
  totales: { profesores: 2, aulas: 2, grupos: 2, materias: 2, bloques_programados: 4 },
  cumplimiento: { horas_requeridas: 4, horas_programadas: 4, porcentaje: 100 },
  ocupacion_aulas: [
    { aula_id: 1, aula: 'Aula 101', aforo: 40, horas_ocupadas: 2, ocupacion_pct: 2.5 },
    { aula_id: 2, aula: 'Laboratorio de Sistemas', aforo: 30, horas_ocupadas: 2, ocupacion_pct: 2.5 },
  ],
  carga_profesores: [
    { profesor_id: 1, profesor: 'Docente Uno', horas_semanales: 2, dias_con_clase: 2, franjas_muertas: 0 },
    { profesor_id: 2, profesor: 'Docente Dos', horas_semanales: 2, dias_con_clase: 2, franjas_muertas: 0 },
  ],
  distribucion_por_dia: [
    { dia: 'Lunes', bloques: 2 },
    { dia: 'Martes', bloques: 0 },
    { dia: 'Miércoles', bloques: 1 },
    { dia: 'Jueves', bloques: 1 },
    { dia: 'Viernes', bloques: 0 },
  ],
} satisfies StatisticsOut;

export const MOCK_CONFLICTS = { total: 0, hay_conflictos: false, conflictos: [] } satisfies ConflictReport;

export const MOCK_READINESS = { listo: true, problemas: [] } satisfies ReadinessOut;

export const MOCK_REGISTER_GROUPS = MOCK_GROUPS.map(({ id, nombre, jornada }) => ({ id, nombre, jornada })) satisfies RegisterGroup[];

export const MOCK_AI_STATUS = {
  configurada: false,
  proveedor: 'groq',
  nombre_proveedor: 'Groq',
  modelo: 'openai/gpt-oss-20b',
} satisfies AiStatus;

/** Unsigned token valid for 8 hours: the frontend only reads its expiry; the mock API does not check it. */
export function mockToken(): TokenOut {
  const payload = btoa(JSON.stringify({ sub: '1', rol: 'admin', exp: Math.floor(Date.now() / 1000) + 8 * 3600 })).replace(/=+$/, '');
  return { access_token: `mock.${payload}.firma`, token_type: 'bearer', usuario: MOCK_ADMIN };
}
