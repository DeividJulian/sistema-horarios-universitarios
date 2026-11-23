import { Component, computed, inject, output, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';

import { SavedScheduleService } from '../../../core/api/saved-schedule.service';
import { AuthService } from '../../../core/auth/auth.service';
import { SavedSchedule } from '../../../core/models';
import { ConfirmService } from '../../../core/services/confirm.service';
import { NotificationService } from '../../../core/services/notification.service';

/**
 * The named schedules. Everybody sees which one is active; only an administrator creates a new one
 * (the current one is kept), activates another one, renames or deletes them.
 */
@Component({
  selector: 'app-saved-schedules',
  imports: [ReactiveFormsModule],
  templateUrl: './saved-schedules.html',
  styleUrl: './saved-schedules.css',
})
export class SavedSchedules {
  private readonly api = inject(SavedScheduleService);
  private readonly confirm = inject(ConfirmService);
  private readonly notify = inject(NotificationService);
  protected readonly auth = inject(AuthService);

  /** The active schedule changed: the page reloads the calendar. */
  readonly changed = output<void>();

  protected readonly schedules = signal<SavedSchedule[]>([]);
  protected readonly busy = signal(false);
  protected readonly creating = signal(false);
  protected readonly renamingId = signal<number | null>(null);

  protected readonly active = computed(() => this.schedules().find((s) => s.activo) ?? null);
  protected readonly others = computed(() => this.schedules().filter((s) => !s.activo));

  protected readonly name = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.minLength(2), Validators.maxLength(100)],
  });
  protected readonly newName = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.minLength(2), Validators.maxLength(100)],
  });

  constructor() {
    this.load();
  }

  load(): void {
    this.api.list().subscribe({
      next: (list) => this.schedules.set(list),
      error: () => this.schedules.set([]), // not critical: the calendar still works
    });
  }

  protected blocks(s: SavedSchedule): string {
    return s.total_bloques === 1 ? '1 bloque' : `${s.total_bloques} bloques`;
  }

  protected async create(): Promise<void> {
    if (this.name.invalid) {
      this.name.markAsTouched();
      return;
    }
    const nombre = this.name.value.trim();
    const accepted = await this.confirm.ask({
      title: `¿Crear el horario «${nombre}»?`,
      message: `Se genera un horario nuevo con los datos actuales y queda activo. «${this.active()?.nombre ?? 'El horario actual'}» se guarda tal como está y puedes volver a él cuando quieras.`,
      confirmText: 'Crear y generar',
    });
    if (!accepted) return;
    this.creating.set(true);
    this.api.create(nombre).subscribe({
      next: (result) => {
        this.creating.set(false);
        this.name.reset();
        this.notify.success(`${result.mensaje}: ${this.blocks(result.horario)}.`);
        this.load();
        this.changed.emit();
      },
      error: (err) => {
        this.creating.set(false);
        this.notify.apiError(err, 'No se pudo crear el horario.');
      },
    });
  }

  protected async activate(s: SavedSchedule): Promise<void> {
    const accepted = await this.confirm.ask({
      title: `¿Activar «${s.nombre}»?`,
      message: `Todos verán este horario. «${this.active()?.nombre ?? 'El horario actual'}» queda guardado. Las cancelaciones de clases del horario actual se pierden.`,
      confirmText: 'Activar',
    });
    if (!accepted) return;
    this.busy.set(true);
    this.api.activate(s.id).subscribe({
      next: (result) => {
        this.busy.set(false);
        this.notify.success(`${result.mensaje}.`);
        this.load();
        this.changed.emit();
      },
      error: (err) => {
        this.busy.set(false);
        this.notify.apiError(err, 'No se pudo activar el horario.');
      },
    });
  }

  protected startRename(s: SavedSchedule): void {
    this.newName.setValue(s.nombre);
    this.renamingId.set(s.id);
  }

  protected saveRename(s: SavedSchedule): void {
    if (this.newName.invalid) {
      this.newName.markAsTouched();
      return;
    }
    this.api.rename(s.id, this.newName.value.trim()).subscribe({
      next: () => {
        this.renamingId.set(null);
        this.notify.success('Nombre guardado.');
        this.load();
      },
      error: (err) => this.notify.apiError(err, 'No se pudo cambiar el nombre.'),
    });
  }

  protected async remove(s: SavedSchedule): Promise<void> {
    const accepted = await this.confirm.ask({
      title: `¿Eliminar «${s.nombre}»?`,
      message: 'Se borra este horario guardado. El horario activo no cambia.',
      confirmText: 'Eliminar',
      danger: true,
    });
    if (!accepted) return;
    this.api.delete(s.id).subscribe({
      next: (result) => {
        this.notify.success(`${result.mensaje}.`);
        this.load();
      },
      error: (err) => this.notify.apiError(err, 'No se pudo eliminar el horario.'),
    });
  }
}
