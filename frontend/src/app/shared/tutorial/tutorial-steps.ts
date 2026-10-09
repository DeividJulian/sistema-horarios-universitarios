// Content of the tutorial. Everything here is shown to the user, so it is written in Spanish.
export interface TutorialStep {
  title: string;
  paragraphs: string[];
  tips?: string[];
  /** Section the step talks about, with the text of the button that takes the user there. */
  link?: { path: string; text: string };
  /** Shown only to administrators (read-only users cannot change data). */
  adminOnly?: boolean;
  /** Shown only to read-only users. */
  readerOnly?: boolean;
}

export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    title: 'Bienvenido al Sistema de Horarios y Aulas',
    readerOnly: true,
    paragraphs: [
      'Esta aplicación muestra el horario de clases de la universidad, armado automáticamente sin cruces de profesor, grupo ni aula.',
      'Tu cuenta es de consulta: puedes ver el horario y el análisis, pero solo un administrador puede cambiar los datos o generar un horario nuevo.',
    ],
  },
  {
    title: 'Bienvenido al Sistema de Horarios y Aulas',
    adminOnly: true,
    paragraphs: [
      'Esta aplicación arma el horario de clases por ti: tú registras las aulas, los profesores, los grupos y las materias, y el sistema reparte todas las clases sin cruces de profesor, grupo ni aula.',
      'El orden recomendado es: Aulas → Profesores → Grupos → Materias → Generar horario. Este tutorial te lleva por cada paso.',
    ],
    tips: ['¿Solo quieres probar? En la pestaña Análisis puedes cargar datos de demostración con un clic.'],
  },
  {
    title: '1. Registra las aulas',
    adminOnly: true,
    paragraphs: [
      'En Gestión → Aulas crea cada salón con su nombre, su aforo (cuántos estudiantes caben) y su tipo.',
      'El tipo sirve para que las materias que lo necesitan queden en el lugar correcto: por ejemplo, Programación en una sala de informática y Física en un laboratorio.',
    ],
    link: { path: '/gestion/aulas', text: 'Ir a Aulas' },
  },
  {
    title: '2. Registra los profesores y su disponibilidad',
    adminOnly: true,
    paragraphs: [
      'En Gestión → Profesores crea a cada profesor con su nombre y correo.',
      'Luego pulsa el botón «Disponibilidad» de ese profesor y marca en la cuadrícula las horas en que puede dar clase. Puedes hacer clic en una casilla o arrastrar para marcar varias a la vez.',
    ],
    tips: ['El generador solo pone clases en las horas marcadas. Si un profesor tiene pocas horas libres, algunas materias no se podrán programar.'],
    link: { path: '/gestion/profesores', text: 'Ir a Profesores' },
  },
  {
    title: '3. Crea los grupos',
    adminOnly: true,
    paragraphs: [
      'En Gestión → Grupos crea cada curso o semestre, por ejemplo «Ingeniería de Software 7A».',
      'Indica cuántos estudiantes tiene (para buscar aulas donde quepan) y su jornada: mañana, tarde, noche o todo el día. Sus clases solo se programarán dentro de esa jornada.',
    ],
    link: { path: '/gestion/grupos', text: 'Ir a Grupos' },
  },
  {
    title: '4. Agrega las materias',
    adminOnly: true,
    paragraphs: [
      'En Gestión → Materias crea lo que se dicta a cada grupo: elige el grupo, el profesor que la dicta, cuántas horas por semana tiene (de 1 a 5) y qué tipo de aula necesita.',
      'Si una materia muestra «ninguna aula sirve» en rojo, falta un aula con el tipo o el aforo necesarios.',
    ],
    link: { path: '/gestion/materias', text: 'Ir a Materias' },
  },
  {
    title: '5. Genera el horario',
    adminOnly: true,
    paragraphs: [
      'En la pestaña Horario pulsa «Generar horario automáticamente». En pocos segundos aparecerán todas las clases en el calendario.',
      'Si falta algo para poder generarlo, la guía de pasos que está arriba del calendario te dice qué es y te da un botón «Arreglar» que te lleva directo al problema.',
    ],
    link: { path: '/horario', text: 'Ir al Horario' },
  },
  {
    title: '6. Revisa y ajusta el calendario',
    adminOnly: true,
    paragraphs: [
      'Usa los filtros de profesor, grupo o aula para ver solo lo que te interesa.',
      'Haz clic en un bloque para ver su detalle, moverlo a otro día u hora, o eliminarlo. También puedes arrastrarlo directamente a una casilla vacía.',
    ],
    tips: [
      'Un bloque en rojo tiene un conflicto (por ejemplo, el profesor ya no está disponible a esa hora). Si cambiaste datos después de generar, vuelve a generar el horario.',
      '«Analizar horario» muestra las horas muertas de cada grupo y qué tan ocupadas están las aulas.',
    ],
  },
  {
    title: '7. Consulta el análisis',
    adminOnly: true,
    paragraphs: [
      'La pestaña Análisis resume el horario: ocupación de cada aula, carga de cada profesor y la lista de conflictos que haya.',
      'Desde ahí también puedes cargar datos de demostración para practicar. Ojo: si ya tienes datos, cargarlos borra todo lo actual (el sistema te pide confirmación antes).',
    ],
    link: { path: '/analisis', text: 'Ir a Análisis' },
  },
  {
    title: '8. Administra los usuarios',
    adminOnly: true,
    paragraphs: [
      'En Gestión → Usuarios puedes crear cuentas para otras personas y elegir su rol.',
      'Un administrador puede cambiar todo; un usuario solo puede consultar el horario y el análisis.',
    ],
    tips: ['Puedes volver a abrir este tutorial cuando quieras con el botón «Tutorial» de la barra de arriba.'],
    link: { path: '/gestion/usuarios', text: 'Ir a Usuarios' },
  },
  {
    title: '1. Explora el calendario',
    readerOnly: true,
    paragraphs: [
      'En la pestaña Horario verás todas las clases de la semana. Usa los filtros de profesor, grupo o aula para ver solo lo que te interesa.',
      'Haz clic en un bloque para ver su detalle: materia, aula, grupo, jornada y profesor.',
    ],
    tips: ['Un bloque en rojo tiene un conflicto pendiente que un administrador debe resolver.'],
    link: { path: '/horario', text: 'Ir al Horario' },
  },
  {
    title: '2. Consulta el análisis',
    readerOnly: true,
    paragraphs: [
      'La pestaña Análisis resume el horario: ocupación de cada aula, carga de cada profesor y la lista de conflictos que haya.',
    ],
    tips: ['Puedes volver a abrir este tutorial cuando quieras con el botón «Tutorial» de la barra de arriba.'],
    link: { path: '/analisis', text: 'Ir a Análisis' },
  },
];

/** The steps that apply to the signed-in role. */
export function stepsFor(isAdmin: boolean): TutorialStep[] {
  return TUTORIAL_STEPS.filter((step) => (isAdmin ? !step.readerOnly : !step.adminOnly));
}
