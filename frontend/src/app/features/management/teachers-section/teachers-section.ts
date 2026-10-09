import { Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { Teacher } from '../../../core/models';
import { ConfirmService } from '../../../core/services/confirm.service';
import { NotificationService } from '../../../core/services/notification.service';
import { CatalogStore } from '../../../core/state/catalog.store';
import { errorMessage } from '../../../shared/forms/error-message';
import { NAME_RULES } from '../../../shared/forms/validators';
import { AvailabilityPanel } from '../availability-panel/availability-panel';

@Component({
  selector: 'app-teachers-section',
  imports: [ReactiveFormsModule, AvailabilityPanel],
  templateUrl: './teachers-section.html',
})
export class TeachersSection {
  protected readonly store = inject(CatalogStore);
  private readonly notify = inject(NotificationService);
  private readonly confirm = inject(ConfirmService);

  protected readonly form = inject(NonNullableFormBuilder).group({
    nombre: ['', NAME_RULES],
    email: ['', [Validators.required, Validators.email]],
  });

  protected readonly editing = signal<Teacher | null>(null);
  /** Teacher whose availability panel is open. */
  protected readonly availabilityOf = signal<Teacher | null>(null);
  /** ?disponibilidad=<teacher id> opens that teacher's availability editor (used by the "Arreglar" buttons). */
  readonly disponibilidad = input<string | undefined>();
  protected readonly saving = signal(false);
  protected readonly errorMessage = errorMessage;

  constructor() {
    effect(() => {
      const id = Number(this.disponibilidad());
      const teacher = id ? this.store.teachersById().get(id) : undefined;
      if (teacher) untracked(() => this.availabilityOf.set(teacher));
    });
  }

  protected readonly subjectCount = computed(() => {
    const counts = new Map<number, number>();
    for (const s of this.store.subjects()) counts.set(s.profesor_id, (counts.get(s.profesor_id) ?? 0) + 1);
    return counts;
  });

  protected edit(teacher: Teacher): void {
    this.editing.set(teacher);
    this.form.reset({ nombre: teacher.nombre, email: teacher.email });
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
    this.store.saveTeacher(editing?.id ?? null, { nombre: data.nombre.trim(), email: data.email.trim() }).subscribe({
      next: (saved) => {
        this.notify.success(editing ? `Profesor «${saved.nombre}» actualizado.` : `Profesor «${saved.nombre}» creado.`);
        this.cancel();
        this.saving.set(false);
      },
      error: (err) => {
        this.notify.apiError(err, 'No se pudo guardar el profesor.');
        this.saving.set(false);
      },
    });
  }

  protected async remove(teacher: Teacher): Promise<void> {
    const accepted = await this.confirm.ask({
      title: `¿Eliminar a ${teacher.nombre}?`,
      message: 'También se borrará su disponibilidad. Si tiene materias asignadas, el sistema no lo permitirá.',
      confirmText: 'Eliminar',
      danger: true,
    });
    if (!accepted) return;
    this.store.deleteTeacher(teacher.id).subscribe({
      next: () => {
        this.notify.success(`Profesor «${teacher.nombre}» eliminado.`);
        if (this.editing()?.id === teacher.id) this.cancel();
        if (this.availabilityOf()?.id === teacher.id) this.availabilityOf.set(null);
      },
      error: (err) => this.notify.apiError(err, 'No se pudo eliminar el profesor.'),
    });
  }
}
