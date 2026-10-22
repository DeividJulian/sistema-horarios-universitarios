import { CdkDrag, CdkDragDrop, CdkDropList, CdkDropListGroup } from '@angular/cdk/drag-drop';
import { Component, computed, input, output, signal } from '@angular/core';

import {
  Classroom,
  ScheduleEntry,
  StudentGroup,
  SchoolDay,
  START_HOURS,
  Subject,
  WEEKDAYS,
  Weekday,
  formatHour,
  formatShortDate,
  hourOf,
  toIsoDate,
} from '../../../core/models';
import { HourPipe } from '../../../shared/pipes/hour.pipe';
import { ScheduleFilter, matchesFilter } from '../schedule-filter';
import { subjectColor } from '../subject-color';

export interface EntryMove {
  entry: ScheduleEntry;
  day: Weekday;
  hour: number;
  /** Optional new classroom (the AI suggestions can change it too). */
  classroomId?: number;
}

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
  /** To show the group of each class (several groups can share an hour). */
  readonly groupsById = input<Map<number, StudentGroup>>(new Map());
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
  /** Columns in order, with their date (the next school days). Without dates, Monday to Friday. */
  readonly days = input<(SchoolDay | { day: Weekday; date: null })[]>(WEEKDAYS.map((day) => ({ day, date: null })));
  /** Cancelled classes as "entryId|YYYY-MM-DD". */
  readonly cancelledKeys = input<Set<string>>(new Set());
  /** Reason of each cancellation (same keys), shown when hovering the card. */
  readonly cancelReasons = input<Map<string, string>>(new Map());
  /** Only the hours that have classes (for people who cannot drag blocks to empty hours). */
  readonly trimEmptyHours = input(false);
  /** The schedule is being generated: the cards shimmer instead of a spinner. */
  readonly busy = input(false);

  protected readonly todayIso = toIsoDate(new Date());
  protected readonly shortDate = formatShortDate;
  protected readonly allCellIds = WEEKDAYS.flatMap((d) => START_HOURS.map((h) => cellId(d, h)));
  protected readonly cellId = cellId;

  /** Index "day-hour" -> visible blocks (several groups can have class at the same hour), rebuilt only when the data or the filter change. */
  protected readonly cells = computed(() => {
    const index = new Map<string, ScheduleEntry[]>();
    const subjects = this.subjectsById();
    const filter = this.filter();
    for (const entry of this.entries()) {
      if (matchesFilter(entry, subjects.get(entry.materia_id), filter)) {
        const key = cellId(entry.dia_semana, hourOf(entry.hora_inicio));
        index.set(key, [...(index.get(key) ?? []), entry]);
      }
    }
    return index;
  });

  /** Visible classes per day, for the header ("6 clases"). */
  protected readonly dayCounts = computed(() => {
    const counts = new Map<Weekday, number>();
    for (const [key, list] of this.cells()) {
      const day = key.split('-')[0] as Weekday;
      counts.set(day, (counts.get(day) ?? 0) + list.length);
    }
    return counts;
  });

  /** Phones: the agenda shows one day at a time (null = today, or the first day). */
  protected readonly pickedDay = signal<Weekday | null>(null);
  protected readonly agendaDay = computed<Weekday>(() => {
    const columns = this.days();
    return this.pickedDay() ?? columns.find((c) => c.date === this.todayIso)?.day ?? columns[0]?.day ?? 'Lunes';
  });
  protected readonly agendaColumn = computed(() => this.days().find((c) => c.day === this.agendaDay()) ?? { day: this.agendaDay(), date: null });
  /** Classes of the agenda day, by hour. */
  protected readonly agenda = computed(() => {
    const day = this.agendaDay();
    return START_HOURS.map((hour) => ({ hour, entries: this.cells().get(cellId(day, hour)) ?? [] })).filter((slot) => slot.entries.length);
  });

  /** Current hour and minute, for the red "now" line in today's column. */
  protected readonly now = (() => {
    const date = new Date();
    return { hour: date.getHours(), minute: date.getMinutes(), label: `${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}` };
  })();

  /** All the hours, or from the first to the last hour with a visible class. */
  protected readonly visibleHours = computed(() => {
    if (!this.trimEmptyHours()) return START_HOURS;
    const used = [...this.cells().keys()].map((key) => Number(key.split('-')[1]));
    if (!used.length) return START_HOURS;
    const first = Math.min(...used);
    const last = Math.max(...used);
    return START_HOURS.filter((h) => h >= first && h <= last);
  });

  protected isCancelled(entry: ScheduleEntry, date: string | null): boolean {
    return !!date && this.cancelledKeys().has(`${entry.id}|${date}`);
  }

  protected entriesAt(day: Weekday, hour: number): ScheduleEntry[] {
    return this.cells().get(cellId(day, hour)) ?? [];
  }

  protected groupName(entry: ScheduleEntry): string | null {
    const subject = this.subjectsById().get(entry.materia_id);
    return subject ? (this.groupsById().get(subject.grupo_id)?.nombre ?? null) : null;
  }

  protected dayNumber(date: string): number {
    return Number(date.slice(8, 10));
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

  protected ariaLabel(entry: ScheduleEntry, cancelled = false): string {
    const hour = hourOf(entry.hora_inicio);
    const state = cancelled ? ', clase cancelada' : this.conflictsOf(entry).length ? ', con conflictos' : '';
    return `${this.subjectName(entry)}, ${entry.dia_semana} ${formatHour(hour)}, ${this.classroomName(entry)}${state}. Pulsa Enter para ver el detalle.`;
  }

  protected cancelTitle(entry: ScheduleEntry, date: string | null): string {
    const reason = date ? this.cancelReasons().get(`${entry.id}|${date}`) : undefined;
    return `Clase cancelada${reason ? `: ${reason}` : ''}`;
  }

  protected color(entry: ScheduleEntry): { fill: string; ink: string } {
    return subjectColor(entry.materia_id);
  }

  protected onDrop(event: CdkDragDrop<ScheduleEntry[]>, day: Weekday, hour: number): void {
    if (event.previousContainer === event.container) return;
    const entry: ScheduleEntry | undefined = event.item.data;
    if (!entry) return;

    // Another class of the same group, teacher or classroom is already there: the backend would refuse it
    const subjects = this.subjectsById();
    const moving = subjects.get(entry.materia_id);
    const clash = this.entriesAt(day, hour).some((other) => {
      if (other.id === entry.id) return false;
      const subject = subjects.get(other.materia_id);
      return other.aula_id === entry.aula_id || subject?.grupo_id === moving?.grupo_id || subject?.profesor_id === moving?.profesor_id;
    });
    if (clash) {
      this.occupiedDrop.emit();
      return;
    }
    this.moved.emit({ entry, day, hour });
  }
}
