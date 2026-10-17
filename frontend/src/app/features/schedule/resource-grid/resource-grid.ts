import { Component, computed, input, output } from '@angular/core';

import {
  Classroom,
  ScheduleEntry,
  START_HOURS,
  StudentGroup,
  Subject,
  Teacher,
  formatLongDate,
  hourOf,
  roomTypeLabel,
} from '../../../core/models';
import { HourPipe } from '../../../shared/pipes/hour.pipe';
import { subjectColor } from '../subject-color';

export type ResourceMode = 'aulas' | 'docentes';

interface Column {
  id: number;
  label: string;
  sub: string;
  hours: number;
}

/**
 * «Aulas» and «Docentes» views: one day, hours in rows and one column per classroom or teacher,
 * so it is easy to see who or what is busy and what is free.
 */
@Component({
  selector: 'app-resource-grid',
  imports: [HourPipe],
  templateUrl: './resource-grid.html',
  styleUrl: './resource-grid.css',
})
export class ResourceGrid {
  readonly mode = input.required<ResourceMode>();
  /** Classes of the chosen day (already filtered). */
  readonly entries = input.required<ScheduleEntry[]>();
  readonly date = input.required<string>();
  readonly classrooms = input.required<Classroom[]>();
  readonly teachers = input.required<Teacher[]>();
  readonly subjectsById = input.required<Map<number, Subject>>();
  readonly classroomsById = input.required<Map<number, Classroom>>();
  readonly groupsById = input.required<Map<number, StudentGroup>>();
  readonly teachersById = input.required<Map<number, Teacher>>();
  readonly conflicts = input<Map<number, string[]>>(new Map());
  readonly cancelledKeys = input<Set<string>>(new Set());
  readonly selectedId = input<number | null>(null);
  readonly selected = output<ScheduleEntry>();

  protected readonly longDate = computed(() => formatLongDate(this.date()));

  /** Column of each class: its classroom, or its teacher. */
  private columnOf(entry: ScheduleEntry): number | undefined {
    return this.mode() === 'aulas' ? entry.aula_id : this.subjectsById().get(entry.materia_id)?.profesor_id;
  }

  protected readonly cells = computed(() => {
    const index = new Map<string, ScheduleEntry>();
    for (const entry of this.entries()) {
      const column = this.columnOf(entry);
      if (column !== undefined) index.set(`${column}-${hourOf(entry.hora_inicio)}`, entry);
    }
    return index;
  });

  /** Every classroom (free ones too, to see the occupancy); only the teachers with classes that day. */
  protected readonly columns = computed<Column[]>(() => {
    const busy = new Map<number, number>();
    for (const entry of this.entries()) {
      const column = this.columnOf(entry);
      if (column !== undefined) busy.set(column, (busy.get(column) ?? 0) + 1);
    }
    if (this.mode() === 'aulas') {
      return [...this.classrooms()]
        .sort((a, b) => a.nombre.localeCompare(b.nombre))
        .map((c) => ({ id: c.id, label: c.nombre, sub: `${roomTypeLabel(c.tipo)} · aforo ${c.aforo}`, hours: busy.get(c.id) ?? 0 }));
    }
    return this.teachers()
      .filter((t) => busy.has(t.id))
      .sort((a, b) => a.nombre.localeCompare(b.nombre))
      .map((t) => ({ id: t.id, label: t.nombre, sub: t.email, hours: busy.get(t.id) ?? 0 }));
  });

  /** From the first to the last hour with a class. */
  protected readonly hours = computed(() => {
    const used = this.entries().map((e) => hourOf(e.hora_inicio));
    if (!used.length) return [];
    const first = Math.min(...used);
    const last = Math.max(...used);
    return START_HOURS.filter((h) => h >= first && h <= last);
  });

  protected readonly template = computed(() => `84px repeat(${this.columns().length}, minmax(150px, 1fr))`);

  protected entryAt(column: number, hour: number): ScheduleEntry | undefined {
    return this.cells().get(`${column}-${hour}`);
  }

  protected info(entry: ScheduleEntry) {
    const subject = this.subjectsById().get(entry.materia_id);
    const group = subject ? this.groupsById().get(subject.grupo_id)?.nombre : undefined;
    const second =
      this.mode() === 'aulas'
        ? [group, subject ? this.teachersById().get(subject.profesor_id)?.nombre : undefined]
        : [group, this.classroomsById().get(entry.aula_id)?.nombre];
    const conflicts = this.conflicts().get(entry.id) ?? [];
    const cancelled = this.cancelledKeys().has(`${entry.id}|${this.date()}`);
    return {
      title: subject?.nombre ?? '—',
      meta: second.filter(Boolean).join(' · '),
      conflicts,
      cancelled,
      color: cancelled ? '#71717a' : conflicts.length ? '#fbbf24' : subjectColor(entry.materia_id),
    };
  }
}
