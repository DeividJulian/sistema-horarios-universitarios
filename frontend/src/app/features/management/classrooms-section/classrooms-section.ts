import { Component, computed, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';

import { Classroom, ROOM_TYPES, RoomType, roomTypeLabel } from '../../../core/models';
import { ConfirmService } from '../../../core/services/confirm.service';
import { NotificationService } from '../../../core/services/notification.service';
import { CatalogStore } from '../../../core/state/catalog.store';
import { errorMessage } from '../../../shared/forms/error-message';
import { CAPACITY_RULES, NAME_RULES } from '../../../shared/forms/validators';

@Component({
  selector: 'app-classrooms-section',
  imports: [ReactiveFormsModule],
  templateUrl: './classrooms-section.html',
})
export class ClassroomsSection {
  protected readonly store = inject(CatalogStore);
  private readonly notify = inject(NotificationService);
  private readonly confirm = inject(ConfirmService);

  protected readonly form = inject(NonNullableFormBuilder).group({
    nombre: ['', NAME_RULES],
    aforo: [30, CAPACITY_RULES],
    tipo: ['general' as RoomType],
  });

  protected readonly editing = signal<Classroom | null>(null);
  protected readonly saving = signal(false);
  protected readonly errorMessage = errorMessage;
  protected readonly roomTypes = ROOM_TYPES;
  protected readonly roomTypeLabel = roomTypeLabel;

  /** Scheduled hours per classroom: a classroom in use cannot be deleted. */
  protected readonly hoursUsed = computed(() => {
    const counts = new Map<number, number>();
    for (const e of this.store.entries()) counts.set(e.aula_id, (counts.get(e.aula_id) ?? 0) + 1);
    return counts;
  });

  protected edit(classroom: Classroom): void {
    this.editing.set(classroom);
    this.form.reset({ nombre: classroom.nombre, aforo: classroom.aforo, tipo: classroom.tipo ?? 'general' });
  }

  protected cancel(): void {
    this.editing.set(null);
    this.form.reset();
  }

  protected save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const data = this.form.getRawValue();
    const editing = this.editing();
    this.saving.set(true);
    this.store
      .saveClassroom(editing?.id ?? null, { nombre: data.nombre.trim(), aforo: Number(data.aforo), tipo: data.tipo })
      .subscribe({
        next: (saved) => {
          this.notify.success(editing ? `Aula «${saved.nombre}» actualizada.` : `Aula «${saved.nombre}» creada.`);
          this.cancel();
          this.saving.set(false);
        },
        error: (err) => {
          this.notify.apiError(err, 'No se pudo guardar el aula.');
          this.saving.set(false);
        },
      });
  }

  protected async remove(classroom: Classroom): Promise<void> {
    const accepted = await this.confirm.ask({
      title: `¿Eliminar el aula ${classroom.nombre}?`,
      message: 'Si el aula tiene clases en el horario actual, el sistema no lo permitirá.',
      confirmText: 'Eliminar',
      danger: true,
    });
    if (!accepted) return;
    this.store.deleteClassroom(classroom.id).subscribe({
      next: () => {
        this.notify.success(`Aula «${classroom.nombre}» eliminada.`);
        if (this.editing()?.id === classroom.id) this.cancel();
      },
      error: (err) => this.notify.apiError(err, 'No se pudo eliminar el aula.'),
    });
  }
}
