import { CdkDrag, CdkDragDrop, CdkDropList, CdkDropListGroup } from '@angular/cdk/drag-drop';
import { Component, computed, input, output } from '@angular/core';

import { Classroom, ScheduleEntry, START_HOURS, Subject, WEEKDAYS, Weekday, formatHour, hourOf } from '../../../core/models';
import { HourPipe } from '../../../shared/pipes/hour.pipe';
import { ScheduleFilter, matchesFilter } from '../schedule-filter';

export interface EntryMove {
  entry: ScheduleEntry;
  day: Weekday;
  hour: number;
}

const SUBJECT_COLORS = ['#f5a623', '#2dd4bf', '#fb7185', '#38bdf8', '#a78bfa', '#a3e635'];

export const cellId = (day: Weekday, hour: number) => `${day}-${hour}`;

@Component({
  selector: 'app-schedule-grid',
  imports: [CdkDropListGroup, CdkDropList, CdkDrag, HourPipe],
  templateUrl: './schedule-grid.html',
  styleUrl: './schedule-grid.css',
})
export class ScheduleGrid {
  readonly entries = input.required<ScheduleEntry[]>();
  readonly subjectsById = input.required<Map<number, Subject>>();
  readonly classroomsById = input.required<Map<number, Classroom>>();
  readonly filter = input.required<ScheduleFilter>();
  /** Conflict descriptions per block id (from GET /conflictos). */
  readonly conflicts = input<Map<number, string[]>>(new Map());

  readonly moved = output<EntryMove>();
  readonly occupiedDrop = output<void>();
  readonly selected = output<ScheduleEntry>();
  /** Block highlighted because its details are open. */
  readonly selectedId = input<number | null>(null);
  /** Read-only users can look at the blocks but not drag them. */
  readonly readonly = input(false);

  protected readonly weekdays = WEEKDAYS;
  protected readonly hours = START_HOURS;
  protected readonly allCellIds = WEEKDAYS.flatMap((d) => START_HOURS.map((h) => cellId(d, h)));
  protected readonly cellId = cellId;

  /** Index "day-hour" -> visible block, rebuilt only when the data or the filter change. */
  protected readonly cells = computed(() => {
    const index = new Map<string, ScheduleEntry>();
    const subjects = this.subjectsById();
    const filter = this.filter();
    for (const entry of this.entries()) {
      if (matchesFilter(entry, subjects.get(entry.materia_id), filter)) {
        index.set(cellId(entry.dia_semana, hourOf(entry.hora_inicio)), entry);
      }
    }
    return index;
  });

  protected entryAt(day: Weekday, hour: number): ScheduleEntry | null {
    return this.cells().get(cellId(day, hour)) ?? null;
  }

  protected subjectName(entry: ScheduleEntry): string {
    return this.subjectsById().get(entry.materia_id)?.nombre ?? '—';
  }

  protected classroomName(entry: ScheduleEntry): string {
    return this.classroomsById().get(entry.aula_id)?.nombre ?? '—';
  }

  protected conflictsOf(entry: ScheduleEntry): string[] {
    return this.conflicts().get(entry.id) ?? [];
  }

  protected ariaLabel(entry: ScheduleEntry): string {
    const hour = hourOf(entry.hora_inicio);
    const problems = this.conflictsOf(entry).length ? ', con conflictos' : '';
    return `${this.subjectName(entry)}, ${entry.dia_semana} ${formatHour(hour)}, ${this.classroomName(entry)}${problems}. Pulsa Enter para ver el detalle.`;
  }

  protected color(entry: ScheduleEntry): string {
    return SUBJECT_COLORS[entry.materia_id % SUBJECT_COLORS.length];
  }

  protected onDrop(event: CdkDragDrop<ScheduleEntry | null>, day: Weekday, hour: number): void {
    if (event.previousContainer === event.container) return;
    const entry: ScheduleEntry | undefined = event.item.data;
    if (!entry) return;

    if (this.entryAt(day, hour)) {
      this.occupiedDrop.emit();
      return;
    }
    this.moved.emit({ entry, day, hour });
  }
}
