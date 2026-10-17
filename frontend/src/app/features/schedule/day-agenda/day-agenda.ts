import { Component, computed, input, output } from '@angular/core';

import { Classroom, ScheduleEntry, StudentGroup, Subject, Teacher, formatLongDate, hourOf } from '../../../core/models';
import { HourPipe } from '../../../shared/pipes/hour.pipe';
import { subjectColor } from '../subject-color';

/** «Día» view: the classes of one day in time order, with every detail visible. */
@Component({
  selector: 'app-day-agenda',
  imports: [HourPipe],
  templateUrl: './day-agenda.html',
  styleUrl: './day-agenda.css',
})
export class DayAgenda {
  /** Classes of the chosen day (already filtered). */
  readonly entries = input.required<ScheduleEntry[]>();
  readonly date = input.required<string>();
  readonly subjectsById = input.required<Map<number, Subject>>();
  readonly classroomsById = input.required<Map<number, Classroom>>();
  readonly groupsById = input.required<Map<number, StudentGroup>>();
  readonly teachersById = input.required<Map<number, Teacher>>();
  readonly conflicts = input<Map<number, string[]>>(new Map());
  readonly cancelledKeys = input<Set<string>>(new Set());
  readonly selectedId = input<number | null>(null);
  readonly selected = output<ScheduleEntry>();

  protected readonly longDate = computed(() => formatLongDate(this.date()));

  protected readonly rows = computed(() =>
    [...this.entries()]
      .sort((a, b) => hourOf(a.hora_inicio) - hourOf(b.hora_inicio))
      .map((entry) => {
        const subject = this.subjectsById().get(entry.materia_id);
        return {
          entry,
          hour: hourOf(entry.hora_inicio),
          subject: subject?.nombre ?? '—',
          group: subject ? this.groupsById().get(subject.grupo_id)?.nombre : undefined,
          teacher: subject ? this.teachersById().get(subject.profesor_id)?.nombre : undefined,
          classroom: this.classroomsById().get(entry.aula_id)?.nombre ?? '—',
          color: subjectColor(entry.materia_id),
          conflicts: this.conflicts().get(entry.id) ?? [],
          cancelled: this.cancelledKeys().has(`${entry.id}|${this.date()}`),
        };
      }),
  );
}
