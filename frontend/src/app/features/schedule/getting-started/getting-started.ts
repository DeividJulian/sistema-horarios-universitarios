import { Component, computed, input, output, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { Conflict, Readiness, ReadinessProblem, ReadinessSection } from '../../../core/models';

interface Step {
  title: string;
  hint: string;
  link: string;
  done: boolean;
}

/** Conflicts that mean the data changed after the schedule was generated. */
const STALE_KINDS = new Set(['fuera_de_disponibilidad', 'fuera_de_jornada', 'tipo_de_aula', 'intensidad_incorrecta', 'sobrecupo']);

/**
 * Guide on the schedule page: what is missing, in order, and what to fix before generating.
 * It hides itself once everything is ready and the schedule matches the data.
 */
@Component({
  selector: 'app-getting-started',
  imports: [RouterLink],
  templateUrl: './getting-started.html',
  styleUrl: './getting-started.css',
})
export class GettingStarted {
  readonly counts = input.required<{ classrooms: number; groups: number; teachers: number; subjects: number; entries: number }>();
  readonly readiness = input<Readiness | null>(null);
  readonly conflicts = input<Conflict[]>([]);
  readonly generating = input(false);

  readonly generate = output<void>();

  protected readonly expanded = signal(true);

  private readonly problems = computed(() => this.readiness()?.problemas ?? []);
  private hasProblem = (section: ReadinessSection) => this.problems().some((p) => p.seccion === section);

  protected readonly stale = computed(
    () => this.counts().entries > 0 && this.conflicts().some((c) => STALE_KINDS.has(c.tipo)),
  );

  protected readonly steps = computed<Step[]>(() => {
    const c = this.counts();
    // Without a readiness report (old backend or network error) the last step is not blocked
    const ready = this.readiness()?.listo ?? true;
    return [
      {
        title: 'Aulas',
        hint: 'Registra los salones con su capacidad y tipo (sala de informática, laboratorio…).',
        link: '/gestion/aulas',
        done: c.classrooms > 0 && !this.hasProblem('aulas'),
      },
      {
        title: 'Grupos',
        hint: 'Cada semestre o curso, con su número de estudiantes y su jornada (mañana, tarde o noche).',
        link: '/gestion/grupos',
        done: c.groups > 0 && !this.hasProblem('grupos'),
      },
      {
        title: 'Profesores y su disponibilidad',
        hint: 'Para cada profesor, marca en la cuadrícula las horas en que puede dar clase.',
        link: '/gestion/profesores',
        done: c.teachers > 0 && !this.hasProblem('profesores'),
      },
      {
        title: 'Materias',
        hint: 'Qué se dicta a cada grupo, quién la dicta y cuántas horas por semana.',
        link: '/gestion/materias',
        done: c.subjects > 0 && !this.hasProblem('materias'),
      },
      {
        title: 'Generar el horario',
        hint: 'El sistema reparte todas las clases sin cruces. Después puedes mover bloques a mano.',
        link: '/horario',
        done: ready && c.entries > 0 && !this.stale(),
      },
    ];
  });

  protected readonly doneCount = computed(() => this.steps().filter((s) => s.done).length);
  protected readonly allDone = computed(() => this.doneCount() === this.steps().length);

  /** Where the "Arreglar" button of a problem takes the user. */
  protected fixLink(problem: ReadinessProblem): { path: string; query: Record<string, number> | null } {
    if (problem.seccion === 'profesores' && problem.profesor_id !== null) {
      return { path: '/gestion/profesores', query: { disponibilidad: problem.profesor_id } };
    }
    return { path: '/gestion/' + problem.seccion, query: null };
  }
}
