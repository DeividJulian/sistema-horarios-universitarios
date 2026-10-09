import { Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { UserService } from '../../../core/api/user.service';
import { AuthService } from '../../../core/auth/auth.service';
import { ROLE_LABELS, Role, User } from '../../../core/models';
import { ConfirmService } from '../../../core/services/confirm.service';
import { NotificationService } from '../../../core/services/notification.service';
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

  protected readonly users = signal<User[]>([]);
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly errorMessage = errorMessage;
  protected readonly roleLabels = ROLE_LABELS;
  protected readonly roles: Role[] = ['usuario', 'admin'];

  protected readonly form = inject(NonNullableFormBuilder).group({
    nombre: ['', NAME_RULES],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, trimmedLength(8, 128)]],
    rol: ['usuario' as Role],
  });

  constructor() {
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

  protected save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const data = this.form.getRawValue();
    this.saving.set(true);
    this.api.create({ ...data, nombre: data.nombre.trim(), email: data.email.trim() }).subscribe({
      next: (user) => {
        this.users.update((list) => [...list, user]);
        this.notify.success(`Usuario «${user.nombre}» creado como ${ROLE_LABELS[user.rol].toLowerCase()}.`);
        this.form.reset();
        this.saving.set(false);
      },
      error: (err) => {
        this.notify.apiError(err, 'No se pudo crear el usuario.');
        this.saving.set(false);
      },
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
