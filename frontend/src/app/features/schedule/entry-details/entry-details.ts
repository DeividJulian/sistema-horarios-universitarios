import { Component, computed, effect, input, output, signal } from '@angular/core';

import { Classroom, ScheduleEntry, START_HOURS, StudentGroup, Subject, Teacher, WEEKDAYS, Weekday, hourOf, shiftText } from '../../../core/models';
import { HourPipe } from '../../../shared/pipes/hour.pipe';
import { EntryMove } from '../schedule-grid/schedule-grid';

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

  readonly closed = output<void>();
  readonly moveRequested = output<EntryMove>();
  readonly deleteRequested = output<ScheduleEntry>();

  protected readonly weekdays = WEEKDAYS;
  protected readonly hours = START_HOURS;
  protected readonly startHour = computed(() => hourOf(this.entry().hora_inicio));
  protected readonly shiftText = shiftText;

  protected readonly targetDay = signal<Weekday>('Lunes');
  protected readonly targetHour = signal(8);

  constructor() {
    // The "move to" selectors start at the block's current slot
    effect(() => {
      this.targetDay.set(this.entry().dia_semana);
      this.targetHour.set(this.startHour());
    });
  }

  protected isSameSlot(): boolean {
    return this.targetDay() === this.entry().dia_semana && this.targetHour() === this.startHour();
  }

  protected move(): void {
    this.moveRequested.emit({ entry: this.entry(), day: this.targetDay(), hour: this.targetHour() });
  }
}
