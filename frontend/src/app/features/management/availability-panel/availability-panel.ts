import { Component, DestroyRef, ElementRef, computed, effect, inject, input, output, signal, untracked } from '@angular/core';
import { forkJoin, of } from 'rxjs';

import { AvailabilityService } from '../../../core/api/availability.service';
import { Availability, SHIFTS, START_HOURS, ShiftInfo, Teacher, WEEKDAYS, Weekday, formatHour, toApiTime } from '../../../core/models';
import { ConfirmService } from '../../../core/services/confirm.service';
import { NotificationService } from '../../../core/services/notification.service';
import { CatalogStore } from '../../../core/state/catalog.store';
import { HourPipe } from '../../../shared/pipes/hour.pipe';
import { cellKey, cellsToRanges, diffRanges, rangesToCells } from './availability-grid';

/**
 * Visual weekly editor: each cell is one hour. Click to mark it, drag to paint several,
 * or use the quick buttons. Nothing is sent until the user presses "Guardar".
 */
@Component({
  selector: 'app-availability-panel',
  imports: [HourPipe],
  templateUrl: './availability-panel.html',
  styleUrl: './availability-panel.css',
})
export class AvailabilityPanel {
  readonly teacher = input.required<Teacher>();
  readonly closed = output<void>();

  private readonly api = inject(AvailabilityService);
  private readonly store = inject(CatalogStore);
  private readonly notify = inject(NotificationService);
  private readonly confirm = inject(ConfirmService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly weekdays = WEEKDAYS;
  protected readonly hours = START_HOURS;
  protected readonly shifts = SHIFTS.filter((s) => s.value !== 'todo');
  protected readonly cellKey = cellKey;

  /** What the backend has now. */
  private readonly saved = signal<Availability[]>([]);
  /** What the user sees and edits. */
  protected readonly cells = signal<Set<string>>(new Set());
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);

  protected readonly weeklyHours = computed(() => this.cells().size);
  protected readonly dirty = computed(() => {
    const before = rangesToCells(this.saved());
    const now = this.cells();
    return before.size !== now.size || [...now].some((c) => !before.has(c));
  });

  /** Shifts of the groups this teacher teaches: their classes can only go inside them. */
  protected readonly teacherShifts = computed<ShiftInfo[]>(() => {
    const groups = this.store.groupsById();
    const values = new Set(
      this.store
        .subjects()
        .filter((s) => s.profesor_id === this.teacher().id)
        .map((s) => groups.get(s.grupo_id)?.jornada ?? 'todo'),
    );
    return this.shifts.filter((s) => values.has(s.value));
  });

  protected readonly subjectsCount = computed(() => this.store.subjects().filter((s) => s.profesor_id === this.teacher().id).length);
  protected readonly hoursNeeded = computed(() =>
    this.store
      .subjects()
      .filter((s) => s.profesor_id === this.teacher().id)
      .reduce((sum, s) => sum + s.intensidad_horaria, 0),
  );

  /** Drag painting: true marks cells, false clears them, null when the mouse is up. */
  private paintValue: boolean | null = null;

  constructor() {
    effect(() => {
      const teacher = this.teacher();
      untracked(() => this.load(teacher.id));
      // The panel opens below the teachers table: bring it into view so the user sees it
      setTimeout(() => this.host.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    });
    const stopPainting = () => (this.paintValue = null);
    window.addEventListener('pointerup', stopPainting);
    inject(DestroyRef).onDestroy(() => window.removeEventListener('pointerup', stopPainting));
  }

  protected isOn(day: Weekday, hour: number): boolean {
    return this.cells().has(cellKey(day, hour));
  }

  protected inTeacherShift(hour: number): boolean {
    return this.teacherShifts().some((s) => hour >= s.start && hour < s.end);
  }

  // ---------- Editing ----------

  protected startPaint(day: Weekday, hour: number, event: PointerEvent): void {
    event.preventDefault();
    this.paintValue = !this.isOn(day, hour);
    this.setCells([cellKey(day, hour)], this.paintValue);
  }

  protected continuePaint(day: Weekday, hour: number): void {
    if (this.paintValue !== null) this.setCells([cellKey(day, hour)], this.paintValue);
  }

  /** Keyboard users toggle one cell with Enter or Space. */
  protected toggle(day: Weekday, hour: number): void {
    this.setCells([cellKey(day, hour)], !this.isOn(day, hour));
  }

  protected toggleDay(day: Weekday): void {
    const keys = this.hours.map((h) => cellKey(day, h));
    this.setCells(keys, !keys.every((k) => this.cells().has(k)));
  }

  protected toggleHour(hour: number): void {
    const keys = this.weekdays.map((d) => cellKey(d, hour));
    this.setCells(keys, !keys.every((k) => this.cells().has(k)));
  }

  /** Marks a whole shift from Monday to Friday. */
  protected markShift(shift: ShiftInfo): void {
    this.setCells(this.keysFor(shift.start, shift.end), true);
  }

  protected markTeacherShifts(): void {
    this.setCells(this.teacherShifts().flatMap((s) => this.keysFor(s.start, s.end)), true);
  }

  protected markAllDay(): void {
    this.setCells(this.keysFor(this.hours[0], this.hours.at(-1)! + 1), true);
  }

  protected clearAll(): void {
    this.cells.set(new Set());
  }

  protected discard(): void {
    this.cells.set(rangesToCells(this.saved()));
  }

  // ---------- Saving ----------

  protected save(): void {
    const { toDelete, toCreate } = diffRanges(this.saved(), cellsToRanges(this.cells()));
    const teacherId = this.teacher().id;
    const requests = [
      ...toDelete.map((a) => this.api.delete(a.id)),
      ...toCreate.map((r) =>
        this.api.create({ profesor_id: teacherId, dia_semana: r.day, hora_inicio: toApiTime(r.start), hora_fin: toApiTime(r.end) }),
      ),
    ];
    this.saving.set(true);
    forkJoin(requests.length ? requests : [of(null)]).subscribe({
      next: () => {
        this.notify.success(
          `Disponibilidad de ${this.teacher().nombre} guardada: ${this.weeklyHours()} horas por semana. ` +
            'Si ya tenías un horario, genéralo de nuevo para aplicar el cambio.',
        );
        this.saving.set(false);
        this.load(teacherId);
      },
      error: (err) => {
        this.notify.apiError(err, 'No se pudo guardar toda la disponibilidad.');
        this.saving.set(false);
        this.load(teacherId); // show what was really saved
      },
    });
  }

  protected async close(): Promise<void> {
    if (this.dirty()) {
      const discard = await this.confirm.ask({
        title: '¿Salir sin guardar?',
        message: 'Marcaste horas que todavía no se han guardado. Si sales ahora se perderán.',
        confirmText: 'Salir sin guardar',
        cancelText: 'Seguir editando',
        danger: true,
      });
      if (!discard) return;
    }
    this.closed.emit();
  }

  protected rangeText(start: number, end: number): string {
    return `${formatHour(start)} – ${formatHour(end)}`;
  }

  private keysFor(start: number, end: number): string[] {
    return this.weekdays.flatMap((d) => this.hours.filter((h) => h >= start && h < end).map((h) => cellKey(d, h)));
  }

  private setCells(keys: string[], on: boolean): void {
    this.cells.update((current) => {
      const next = new Set(current);
      for (const k of keys) {
        if (on) next.add(k);
        else next.delete(k);
      }
      return next;
    });
  }

  private load(teacherId: number): void {
    this.loading.set(true);
    this.api.listByTeacher(teacherId).subscribe({
      next: (list) => {
        this.saved.set(list);
        this.cells.set(rangesToCells(list));
        this.loading.set(false);
      },
      error: (err) => {
        this.notify.apiError(err, 'No se pudo cargar la disponibilidad.');
        this.loading.set(false);
      },
    });
  }
}
