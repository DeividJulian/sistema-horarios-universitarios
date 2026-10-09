import { Component, computed, effect, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { UserService } from '../../../core/api/user.service';
import { AuthService } from '../../../core/auth/auth.service';
import { ROLE_LABELS, Role, User } from '../../../core/models';
import { ConfirmService } from '../../../core/services/confirm.service';
import { NotificationService } from '../../../core/services/notification.service';
import { CatalogStore } from '../../../core/state/catalog.store';
import { errorMessage } from '../../../shared/forms/error-message';
import { NAME_RULES, trimmedLength } from '../../../shared/forms/validators';

@Component({
  selector: 'app-users-section',
  imports: [ReactiveFormsModule],
  templateUrl: './users-section.html',
})
export class UsersSection {
  private readonly api = inject(UserService);
  private readonly notify = inject(NotificationService);
  private readonly confirm = inject(ConfirmService);
  protected readonly auth = inject(AuthService);
  protected readonly store = inject(CatalogStore);

  protected readonly users = signal<User[]>([]);
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly errorMessage = errorMessage;
  protected readonly roleLabels = ROLE_LABELS;
  /** Teacher accounts are created automatically from Gestión → Profesores, so they are not offered here. */
  protected readonly roles: Role[] = ['estudiante', 'usuario', 'admin'];

  protected readonly form = inject(NonNullableFormBuilder).group({
    nombre: ['', NAME_RULES],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, trimmedLength(8, 128)]],
    rol: ['estudiante' as Role],
    grupo_id: [null as number | null],
  });

  protected readonly selectedRole = signal<Role>('estudiante');

  /** Students first, then teachers, then the rest; each block sorted by name. */
  protected readonly sortedUsers = computed(() => {
    const order: Record<Role, number> = { admin: 0, usuario: 1, profesor: 2, estudiante: 3 };
    return [...this.users()].sort((a, b) => order[a.rol] - order[b.rol] || a.nombre.localeCompare(b.nombre));
  });

  constructor() {
    this.form.controls.rol.valueChanges.subscribe((rol) => this.selectedRole.set(rol));
    // A student needs a group: the field is required only for that role
    effect(() => {
      const control = this.form.controls.grupo_id;
      control.setValidators(this.selectedRole() === 'estudiante' ? Validators.required : null);
      control.updateValueAndValidity({ emitEvent: false });
    });

    this.api.list().subscribe({
      next: (users) => {
        this.users.set(users);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.notify.apiError(err, 'No se pudieron cargar los usuarios.');
      },
    });
  }

  protected teacherName(user: User): string {
    return (user.profesor_id != null && this.store.teachersById().get(user.profesor_id)?.nombre) || '—';
  }

  protected save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const data = this.form.getRawValue();
    this.saving.set(true);
    this.api
      .create({
        nombre: data.nombre.trim(),
        email: data.email.trim(),
        password: data.password,
        rol: data.rol,
        grupo_id: data.rol === 'estudiante' ? data.grupo_id : null,
      })
      .subscribe({
        next: (user) => {
          this.users.update((list) => [...list, user]);
          this.notify.success(`Usuario «${user.nombre}» creado como ${ROLE_LABELS[user.rol].toLowerCase()}.`);
          this.form.reset({ rol: data.rol, grupo_id: data.grupo_id });
          this.saving.set(false);
        },
        error: (err) => {
          this.notify.apiError(err, 'No se pudo crear el usuario.');
          this.saving.set(false);
        },
      });
  }

  protected changeGroup(user: User, groupId: number): void {
    this.api.changeGroup(user.id, groupId).subscribe({
      next: (saved) => {
        this.users.update((list) => list.map((u) => (u.id === saved.id ? saved : u)));
        this.notify.success(`${saved.nombre} ahora está en ${this.store.groupsById().get(groupId)?.nombre ?? 'el nuevo grupo'}.`);
      },
      error: (err) => this.notify.apiError(err, 'No se pudo cambiar el grupo.'),
    });
  }

  protected async remove(user: User): Promise<void> {
    const accepted = await this.confirm.ask({
      title: `¿Eliminar a ${user.nombre}?`,
      message: 'Esta persona ya no podrá iniciar sesión.',
      confirmText: 'Eliminar',
      danger: true,
    });
    if (!accepted) return;
    this.api.delete(user.id).subscribe({
      next: () => {
        this.users.update((list) => list.filter((u) => u.id !== user.id));
        this.notify.success(`Usuario «${user.nombre}» eliminado.`);
      },
      error: (err) => this.notify.apiError(err, 'No se pudo eliminar el usuario.'),
    });
  }
}
