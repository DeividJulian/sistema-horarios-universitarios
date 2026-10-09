import { Component, computed, effect, input, output, signal } from '@angular/core';

import {
  Cancellation,
  Classroom,
  ScheduleEntry,
  START_HOURS,
  StudentGroup,
  Subject,
  Teacher,
  WEEKDAYS,
  Weekday,
  formatLongDate,
  hourOf,
  shiftText,
  upcomingDates,
} from '../../../core/models';
import { HourPipe } from '../../../shared/pipes/hour.pipe';
import { EntryMove } from '../schedule-grid/schedule-grid';

export interface CancelRequest {
  entry: ScheduleEntry;
  fecha: string;
  motivo: string;
}

export interface ClassroomChangeRequest {
  entry: ScheduleEntry;
  classroomId: number;
}

/**
 * Details of one schedule block. Also the keyboard-accessible way to move a block
 * (drag and drop needs a mouse or touch) and the place to delete it.
 */
@Component({
  selector: 'app-entry-details',
  imports: [HourPipe],
  templateUrl: './entry-details.html',
  styleUrl: './entry-details.css',
})
export class EntryDetails {
  readonly entry = input.required<ScheduleEntry>();
  readonly subject = input<Subject | undefined>();
  readonly group = input<StudentGroup | undefined>();
  readonly teacher = input<Teacher | undefined>();
  readonly classroom = input<Classroom | undefined>();
  readonly conflicts = input<string[]>([]);
  /** Read-only users only see the details, without moving or deleting. */
  readonly readonly = input(false);
  /** Upcoming cancellations of this block. */
  readonly cancellations = input<Cancellation[]>([]);
  /** The block's teacher (or an administrator) can cancel a date or change the classroom. */
  readonly canAdjust = input(false);
  /** Classrooms free at that hour that fit the group and the subject. */
  readonly classroomOptions = input<Classroom[]>([]);

  readonly closed = output<void>();
  readonly moveRequested = output<EntryMove>();
  readonly deleteRequested = output<ScheduleEntry>();
  readonly cancelRequested = output<CancelRequest>();
  readonly restoreRequested = output<Cancellation>();
  readonly classroomChangeRequested = output<ClassroomChangeRequest>();

  protected readonly weekdays = WEEKDAYS;
  protected readonly hours = START_HOURS;
  protected readonly startHour = computed(() => hourOf(this.entry().hora_inicio));
  protected readonly shiftText = shiftText;

  protected readonly longDate = formatLongDate;

  protected readonly targetDay = signal<Weekday>('Lunes');
  protected readonly targetHour = signal(8);

  /** Next 4 dates of the class that are not cancelled yet. */
  protected readonly cancellableDates = computed(() => {
    const cancelled = new Set(this.cancellations().map((c) => c.fecha));
    return upcomingDates(this.entry().dia_semana, 4).filter((d) => !cancelled.has(d));
  });
  protected readonly cancelDate = signal('');
  protected readonly reason = signal('');
  protected readonly targetClassroom = signal<number | null>(null);

  constructor() {
    // The "move to" selectors start at the block's current slot
    effect(() => {
      this.targetDay.set(this.entry().dia_semana);
      this.targetHour.set(this.startHour());
    });
    // The other forms start at the first option every time the block or its options change
    effect(() => this.cancelDate.set(this.cancellableDates()[0] ?? ''));
    effect(() => this.targetClassroom.set(this.classroomOptions()[0]?.id ?? null));
    effect(() => {
      this.entry();
      this.reason.set('');
    });
  }

  protected requestCancel(): void {
    this.cancelRequested.emit({ entry: this.entry(), fecha: this.cancelDate(), motivo: this.reason().trim() });
  }

  protected requestClassroomChange(): void {
    const classroomId = this.targetClassroom();
    if (classroomId !== null) this.classroomChangeRequested.emit({ entry: this.entry(), classroomId });
  }

  protected isSameSlot(): boolean {
    return this.targetDay() === this.entry().dia_semana && this.targetHour() === this.startHour();
  }

  protected move(): void {
    this.moveRequested.emit({ entry: this.entry(), day: this.targetDay(), hour: this.targetHour() });
  }
}
