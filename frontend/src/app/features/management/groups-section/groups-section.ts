import { Component, computed, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';

import { SHIFTS, Shift, StudentGroup, shiftOptionText, shiftText } from '../../../core/models';
import { ConfirmService } from '../../../core/services/confirm.service';
import { NotificationService } from '../../../core/services/notification.service';
import { CatalogStore } from '../../../core/state/catalog.store';
import { errorMessage } from '../../../shared/forms/error-message';
import { CAPACITY_RULES, NAME_RULES } from '../../../shared/forms/validators';

@Component({
  selector: 'app-groups-section',
  imports: [ReactiveFormsModule],
  templateUrl: './groups-section.html',
})
export class GroupsSection {
  protected readonly store = inject(CatalogStore);
  private readonly notify = inject(NotificationService);
  private readonly confirm = inject(ConfirmService);

  protected readonly form = inject(NonNullableFormBuilder).group({
    nombre: ['', NAME_RULES],
    num_estudiantes: [30, CAPACITY_RULES],
    jornada: ['todo' as Shift],
  });

  protected readonly editing = signal<StudentGroup | null>(null);
  protected readonly saving = signal(false);
  protected readonly errorMessage = errorMessage;
  protected readonly shifts = SHIFTS;
  protected readonly shiftText = shiftText;
  protected readonly shiftOptionText = shiftOptionText;

  protected readonly subjectCount = computed(() => {
    const counts = new Map<number, number>();
    for (const s of this.store.subjects()) counts.set(s.grupo_id, (counts.get(s.grupo_id) ?? 0) + 1);
    return counts;
  });

  /** Classrooms big enough for each group. Zero means the generator can never place its subjects. */
  protected fittingClassrooms(group: StudentGroup): number {
    return this.store.classrooms().filter((c) => c.aforo >= group.num_estudiantes).length;
  }

  protected edit(group: StudentGroup): void {
    this.editing.set(group);
    this.form.reset({ nombre: group.nombre, num_estudiantes: group.num_estudiantes, jornada: group.jornada });
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
      .saveGroup(editing?.id ?? null, {
        nombre: data.nombre.trim(),
        num_estudiantes: Number(data.num_estudiantes),
        jornada: data.jornada,
      })
      .subscribe({
        next: (saved) => {
          this.notify.success(editing ? `Grupo «${saved.nombre}» actualizado.` : `Grupo «${saved.nombre}» creado.`);
          this.cancel();
          this.saving.set(false);
        },
        error: (err) => {
          this.notify.apiError(err, 'No se pudo guardar el grupo.');
          this.saving.set(false);
        },
      });
  }

  protected async remove(group: StudentGroup): Promise<void> {
    const accepted = await this.confirm.ask({
      title: `¿Eliminar el grupo ${group.nombre}?`,
      message: 'Si el grupo tiene materias asignadas, el sistema no lo permitirá.',
      confirmText: 'Eliminar',
      danger: true,
    });
    if (!accepted) return;
    this.store.deleteGroup(group.id).subscribe({
      next: () => {
        this.notify.success(`Grupo «${group.nombre}» eliminado.`);
        if (this.editing()?.id === group.id) this.cancel();
      },
      error: (err) => this.notify.apiError(err, 'No se pudo eliminar el grupo.'),
    });
  }
}
