import { Component, computed, effect, inject, input, output, signal } from '@angular/core';

import { AiService } from '../../../core/api/ai.service';
import { apiErrorMessage } from '../../../core/http/api-error';

import {
  Cancellation,
  Classroom,
  ConflictOption,
  NoticeKind,
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
import { ConflictAdvisor } from '../conflict-advisor/conflict-advisor';
import { EntryMove } from '../schedule-grid/schedule-grid';

export interface CancelRequest {
  entry: ScheduleEntry;
  fecha: string;
  motivo: string;
  /** Text the students receive, reviewed by the teacher (for example drafted by the AI). */
  aviso?: string;
}

export interface ClassroomChangeRequest {
  entry: ScheduleEntry;
  classroomId: number;
  aviso?: string;
}

/**
 * Details of one schedule block. Also the keyboard-accessible way to move a block
 * (drag and drop needs a mouse or touch) and the place to delete it.
 */
@Component({
  selector: 'app-entry-details',
  imports: [HourPipe, ConflictAdvisor],
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

  protected readonly ai = inject(AiService);
  /** Notice for the students of each form; empty = the server writes it. */
  protected readonly cancelNotice = signal('');
  protected readonly roomNotice = signal('');
  protected readonly drafting = signal<NoticeKind | null>(null);
  protected readonly draftError = signal<{ kind: NoticeKind; message: string } | null>(null);

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
      this.cancelNotice.set('');
      this.roomNotice.set('');
      this.draftError.set(null);
    });
    effect(() => {
      if (this.canAdjust() || !this.readonly()) this.ai.loadStatus();
    });
  }

  /** Asks the AI for the notice; the teacher can edit it before sending. */
  protected draftNotice(kind: NoticeKind): void {
    if (this.drafting()) return;
    this.drafting.set(kind);
    this.draftError.set(null);
    const reason = this.reason().trim();
    const request =
      kind === 'cancelacion'
        ? { horario_id: this.entry().id, tipo: kind, fecha: this.cancelDate() || undefined, motivo: reason || undefined }
        : { horario_id: this.entry().id, tipo: kind, aula_id: this.targetClassroom() ?? undefined };
    const entryId = this.entry().id;
    this.ai.draftNotice(request).subscribe({
      next: (draft) => {
        this.drafting.set(null);
        if (entryId !== this.entry().id) return;
        (kind === 'cancelacion' ? this.cancelNotice : this.roomNotice).set(draft.mensaje);
      },
      error: (err: unknown) => {
        this.drafting.set(null);
        this.draftError.set({ kind, message: apiErrorMessage(err, 'La IA no pudo redactar el aviso. Intenta de nuevo.') });
      },
    });
  }

  protected applyOption(option: ConflictOption): void {
    this.moveRequested.emit({ entry: this.entry(), day: option.dia_semana as Weekday, hour: hourOf(option.hora_inicio), classroomId: option.aula_id });
  }

  protected requestCancel(): void {
    const aviso = this.cancelNotice().trim();
    this.cancelRequested.emit({ entry: this.entry(), fecha: this.cancelDate(), motivo: this.reason().trim(), ...(aviso ? { aviso } : {}) });
  }

  protected requestClassroomChange(): void {
    const classroomId = this.targetClassroom();
    const aviso = this.roomNotice().trim();
    if (classroomId !== null) this.classroomChangeRequested.emit({ entry: this.entry(), classroomId, ...(aviso ? { aviso } : {}) });
  }

  protected isSameSlot(): boolean {
    return this.targetDay() === this.entry().dia_semana && this.targetHour() === this.startHour();
  }

  protected move(): void {
    this.moveRequested.emit({ entry: this.entry(), day: this.targetDay(), hour: this.targetHour() });
  }
}
