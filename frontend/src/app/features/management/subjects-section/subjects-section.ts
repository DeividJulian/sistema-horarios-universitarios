import { Component, computed, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { REQUIRED_ROOM_TYPES, RequiredRoomType, Subject, requiredRoomLabel } from '../../../core/models';
import { ConfirmService } from '../../../core/services/confirm.service';
import { NotificationService } from '../../../core/services/notification.service';
import { CatalogStore } from '../../../core/state/catalog.store';
import { errorMessage } from '../../../shared/forms/error-message';
import { NAME_RULES, WEEKLY_HOURS_RULES } from '../../../shared/forms/validators';

@Component({
  selector: 'app-subjects-section',
  imports: [ReactiveFormsModule],
  templateUrl: './subjects-section.html',
})
export class SubjectsSection {
  protected readonly store = inject(CatalogStore);
  private readonly notify = inject(NotificationService);
  private readonly confirm = inject(ConfirmService);

  // A select starts empty (null) until the user picks a group and a teacher
  protected readonly form = inject(NonNullableFormBuilder).group({
    nombre: ['', NAME_RULES],
    intensidad_horaria: [2, WEEKLY_HOURS_RULES],
    grupo_id: [null as number | null, Validators.required],
    profesor_id: [null as number | null, Validators.required],
    tipo_aula: ['cualquiera' as RequiredRoomType],
  });

  protected readonly editing = signal<Subject | null>(null);
  protected readonly saving = signal(false);
  protected readonly errorMessage = errorMessage;
  protected readonly requiredRoomTypes = REQUIRED_ROOM_TYPES;
  protected readonly requiredRoomLabel = requiredRoomLabel;
  protected readonly canCreate = computed(() => this.store.groups().length > 0 && this.store.teachers().length > 0);

  /** Blocks currently in the schedule per subject, to compare with the required weekly hours. */
  protected readonly scheduledHours = computed(() => {
    const counts = new Map<number, number>();
    for (const e of this.store.entries()) counts.set(e.materia_id, (counts.get(e.materia_id) ?? 0) + 1);
    return counts;
  });

  protected groupName(id: number): string {
    return this.store.groupsById().get(id)?.nombre ?? '—';
  }

  protected teacherName(id: number): string {
    return this.store.teachersById().get(id)?.nombre ?? '—';
  }

  /** Classrooms with enough capacity and the required type. Zero means the generator can never place the subject. */
  protected fittingClassrooms(subject: Subject): number {
    const students = this.store.groupsById().get(subject.grupo_id)?.num_estudiantes ?? 0;
    const required = subject.tipo_aula ?? 'cualquiera';
    return this.store
      .classrooms()
      .filter((c) => c.aforo >= students && (required === 'cualquiera' || (c.tipo ?? 'general') === required)).length;
  }

  protected edit(subject: Subject): void {
    this.editing.set(subject);
    this.form.reset({
      nombre: subject.nombre,
      intensidad_horaria: subject.intensidad_horaria,
      grupo_id: subject.grupo_id,
      profesor_id: subject.profesor_id,
      tipo_aula: subject.tipo_aula ?? 'cualquiera',
    });
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
      .saveSubject(editing?.id ?? null, {
        nombre: data.nombre.trim(),
        intensidad_horaria: Number(data.intensidad_horaria),
        grupo_id: Number(data.grupo_id),
        profesor_id: Number(data.profesor_id),
        tipo_aula: data.tipo_aula,
      })
      .subscribe({
        next: (saved) => {
          this.notify.success(
            editing
              ? `Materia «${saved.nombre}» actualizada. Genera el horario de nuevo para aplicar los cambios.`
              : `Materia «${saved.nombre}» creada. Genera el horario para programarla.`,
          );
          this.cancel();
          this.saving.set(false);
        },
        error: (err) => {
          this.notify.apiError(err, 'No se pudo guardar la materia.');
          this.saving.set(false);
        },
      });
  }

  protected async remove(subject: Subject): Promise<void> {
    const blocks = this.scheduledHours().get(subject.id) ?? 0;
    const accepted = await this.confirm.ask({
      title: `¿Eliminar la materia ${subject.nombre}?`,
      message:
        blocks > 0
          ? `También se borrarán sus ${blocks} bloques del horario actual.`
          : 'La materia no tiene bloques en el horario actual.',
      confirmText: 'Eliminar',
      danger: true,
    });
    if (!accepted) return;
    this.store.deleteSubject(subject.id).subscribe({
      next: () => {
        this.notify.success(`Materia «${subject.nombre}» eliminada.`);
        if (this.editing()?.id === subject.id) this.cancel();
      },
      error: (err) => this.notify.apiError(err, 'No se pudo eliminar la materia.'),
    });
  }
}
