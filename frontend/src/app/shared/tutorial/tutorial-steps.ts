// Content of the tutorial. Everything here is shown to the user, so it is written in Spanish.
import { Role } from '../../core/models';

export interface TutorialStep {
  title: string;
  paragraphs: string[];
  tips?: string[];
  /** Section the step talks about, with the text of the button that takes the user there. */
  link?: { path: string; text: string };
  /** Roles that see the step. */
  roles: Role[];
}

const REOPEN_TIP = 'Puedes volver a abrir este tutorial cuando quieras con el botón «Tutorial» de la barra de arriba.';

export const TUTORIAL_STEPS: TutorialStep[] = [
  // ---------- Administrator ----------
  {
    title: 'Bienvenido al Sistema de Horarios y Aulas',
    roles: ['admin'],
    paragraphs: [
      'Esta aplicación arma el horario de clases por ti: tú registras las aulas, los profesores, los grupos y las materias, y el sistema reparte todas las clases sin cruces de profesor, grupo ni aula.',
      'El orden recomendado es: Aulas → Profesores → Grupos → Materias → Generar horario. Este tutorial te lleva por cada paso.',
    ],
    tips: ['¿Solo quieres probar? En la pestaña Análisis puedes cargar datos de demostración con un clic.'],
  },
  {
    title: '1. Registra las aulas',
    roles: ['admin'],
    paragraphs: [
      'En Gestión → Aulas crea cada salón con su nombre, su aforo (cuántos estudiantes caben) y su tipo.',
      'El tipo sirve para que las materias que lo necesitan queden en el lugar correcto: por ejemplo, Programación en una sala de informática y Física en un laboratorio.',
    ],
    link: { path: '/gestion/aulas', text: 'Ir a Aulas' },
  },
  {
    title: '2. Registra los profesores y su disponibilidad',
    roles: ['admin'],
    paragraphs: [
      'En Gestión → Profesores crea a cada profesor con su nombre y correo. Con ese correo el profesor entra a la aplicación (contraseña inicial Profesor2026*).',
      'Luego pulsa «Disponibilidad» y marca en la cuadrícula las horas en que puede dar clase. Puedes hacer clic en una casilla o arrastrar para marcar varias a la vez.',
    ],
    tips: ['El generador solo pone clases en las horas marcadas. Si un profesor tiene pocas horas libres, algunas materias no se podrán programar.'],
    link: { path: '/gestion/profesores', text: 'Ir a Profesores' },
  },
  {
    title: '3. Crea los grupos',
    roles: ['admin'],
    paragraphs: [
      'En Gestión → Grupos crea cada curso o semestre, por ejemplo «Ingeniería de Software 7».',
      'Indica cuántos estudiantes tiene (para buscar aulas donde quepan) y su jornada: mañana, tarde, noche o todo el día. Sus clases solo se programarán dentro de esa jornada.',
    ],
    link: { path: '/gestion/grupos', text: 'Ir a Grupos' },
  },
  {
    title: '4. Agrega las materias',
    roles: ['admin'],
    paragraphs: [
      'En Gestión → Materias crea lo que se dicta a cada grupo: elige el grupo, el profesor, cuántas horas por semana tiene (de 1 a 5) y qué tipo de aula necesita.',
      'Si una materia muestra «ninguna aula sirve» en rojo, falta un aula con el tipo o el aforo necesarios.',
    ],
    link: { path: '/gestion/materias', text: 'Ir a Materias' },
  },
  {
    title: '5. Genera el horario',
    roles: ['admin'],
    paragraphs: [
      'En la pestaña Horario pulsa «Generar horario automáticamente». En pocos segundos aparecerán todas las clases en el calendario.',
      'Si falta algo para poder generarlo, la guía de pasos que está arriba del calendario te dice qué es y te da un botón «Arreglar» que te lleva directo al problema.',
    ],
    link: { path: '/horario', text: 'Ir al Horario' },
  },
  {
    title: '6. Revisa y ajusta el calendario',
    roles: ['admin'],
    paragraphs: [
      'Usa los filtros de profesor, grupo o aula para ver solo lo que te interesa.',
      'Haz clic en un bloque para ver su detalle, moverlo, cancelarlo en una fecha, cambiarlo de aula o eliminarlo. También puedes arrastrarlo a una casilla vacía. Los estudiantes del grupo reciben un aviso de cada cambio.',
    ],
    tips: ['Un bloque en rojo tiene un conflicto (por ejemplo, el profesor ya no está disponible a esa hora). Si cambiaste datos después de generar, vuelve a generar el horario.'],
  },
  {
    title: '7. Administra los usuarios',
    roles: ['admin'],
    paragraphs: [
      'En Gestión → Usuarios creas las cuentas de los estudiantes y eliges su grupo: cada estudiante solo verá el horario de su semestre.',
      'Las cuentas de los profesores se crean solas con su correo. También puedes crear cuentas de consulta (ven todo sin modificar) o más administradores.',
    ],
    tips: [REOPEN_TIP],
    link: { path: '/gestion/usuarios', text: 'Ir a Usuarios' },
  },

  // ---------- Teacher ----------
  {
    title: 'Bienvenido, profesor',
    roles: ['profesor'],
    paragraphs: [
      'En «Mis clases» ves tu horario de la semana: solo las clases que dictas, con la fecha de cada día.',
      'El horario lo genera el administrador; tú puedes ajustar tus clases cuando tengas un inconveniente.',
    ],
    link: { path: '/horario', text: 'Ver mis clases' },
  },
  {
    title: '1. Cancela una clase',
    roles: ['profesor'],
    paragraphs: [
      'Haz clic en la clase, elige la fecha (por ejemplo, el próximo lunes) y escribe el motivo. Pulsa «Cancelar clase y avisar».',
      'Solo se cancela esa fecha: las demás semanas la clase sigue igual. Los estudiantes del grupo reciben un aviso con el motivo, y en el calendario la clase aparece tachada.',
    ],
    tips: ['Si al final sí puedes dictarla, abre la clase y pulsa «Restablecer»: los estudiantes también reciben ese aviso.'],
  },
  {
    title: '2. Cambia de aula',
    roles: ['profesor'],
    paragraphs: [
      'En el detalle de la clase, en «Cambiar de aula», aparecen solo las aulas libres a esa hora que tienen espacio para tu grupo y el tipo que pide la materia.',
      'Elige una y pulsa «Cambiar aula y avisar»: el cambio queda para las siguientes semanas y los estudiantes reciben el aviso.',
    ],
  },
  {
    title: '3. Revisa los avisos',
    roles: ['profesor'],
    paragraphs: ['En «Avisos» ves todo lo que tus estudiantes recibieron sobre tus clases.'],
    tips: ['Tu contraseña inicial es la misma para todos los profesores: cámbiala con el botón de la llave, junto a «Salir».', REOPEN_TIP],
    link: { path: '/avisos', text: 'Ir a Avisos' },
  },

  // ---------- Student ----------
  {
    title: 'Bienvenido',
    roles: ['estudiante'],
    paragraphs: [
      'En «Mi horario» ves solo las clases de tu grupo (tu semestre), con la fecha de cada día de esta semana.',
      'Haz clic en una clase para ver el aula, el profesor y si tiene alguna cancelación.',
    ],
    link: { path: '/horario', text: 'Ver mi horario' },
  },
  {
    title: 'Cancelaciones y cambios',
    roles: ['estudiante'],
    paragraphs: [
      'Si un profesor cancela una clase, en el calendario aparece tachada con la palabra «Cancelada». Si cambia de aula, el calendario ya muestra la nueva.',
      'Cada cambio llega como aviso: el número en rojo junto a «Avisos» te dice cuántos tienes sin leer.',
    ],
    tips: [REOPEN_TIP],
    link: { path: '/avisos', text: 'Ir a Avisos' },
  },

  // ---------- Read-only ----------
  {
    title: 'Bienvenido al Sistema de Horarios y Aulas',
    roles: ['usuario'],
    paragraphs: [
      'Esta aplicación muestra el horario de clases de la universidad, armado automáticamente sin cruces de profesor, grupo ni aula.',
      'Tu cuenta es de consulta: puedes ver el horario y el análisis, pero solo un administrador puede cambiar los datos o generar un horario nuevo.',
    ],
  },
  {
    title: '1. Explora el calendario',
    roles: ['usuario'],
    paragraphs: [
      'En la pestaña Horario verás todas las clases de la semana. Usa los filtros de profesor, grupo o aula para ver solo lo que te interesa.',
      'Haz clic en un bloque para ver su detalle: materia, aula, grupo, jornada y profesor.',
    ],
    link: { path: '/horario', text: 'Ir al Horario' },
  },
  {
    title: '2. Consulta el análisis',
    roles: ['usuario'],
    paragraphs: ['La pestaña Análisis resume el horario: ocupación de cada aula, carga de cada profesor y la lista de conflictos que haya.'],
    tips: [REOPEN_TIP],
    link: { path: '/analisis', text: 'Ir a Análisis' },
  },
];

/** The steps for the signed-in role. */
export function stepsFor(role: Role | null): TutorialStep[] {
  return TUTORIAL_STEPS.filter((step) => role !== null && step.roles.includes(role));
}
