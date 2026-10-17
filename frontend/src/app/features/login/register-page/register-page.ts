import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { AbstractControl, NonNullableFormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { AuthService } from '../../../core/auth/auth.service';
import { apiErrorMessage } from '../../../core/http/api-error';
import { ROLE_LABELS, RegisterGroup, shiftText } from '../../../core/models';
import { NotificationService } from '../../../core/services/notification.service';
import { trimmedLength } from '../../../shared/forms/validators';

type AccountType = 'estudiante' | 'profesor';
type RegisterField = 'nombre' | 'email' | 'grupo_id' | 'password' | 'confirmacion';

/** After this long without an answer, explain that the free server is waking up. */
const SLOW_MS = 4000;

function samePassword(group: AbstractControl): ValidationErrors | null {
  const password = group.get('password')?.value;
  const confirmation = group.get('confirmacion')?.value;
  return confirmation && password !== confirmation ? { mismatch: true } : null;
}

/** Clear Spanish message for each way the sign-up can fail. */
export function registerErrorMessage(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0) return 'No hay conexión con el servidor. Revisa tu internet o intenta de nuevo en un minuto.';
    if (error.status === 502 || error.status === 503 || error.status === 504) {
      return 'El servidor está despertando. Espera unos segundos e intenta de nuevo.';
    }
  }
  return apiErrorMessage(error, 'No se pudo crear la cuenta. Intenta de nuevo.');
}

@Component({
  selector: 'app-register-page',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './register-page.html',
  styleUrls: ['../auth.css', './register-page.css'],
})
export class RegisterPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly notify = inject(NotificationService);

  protected readonly form = inject(NonNullableFormBuilder).group(
    {
      tipo: ['estudiante' as AccountType],
      nombre: ['', [Validators.required, trimmedLength(2, 100)]],
      email: ['', [Validators.required, Validators.email]],
      grupo_id: [null as number | null, Validators.required],
      password: ['', [Validators.required, trimmedLength(8, 128)]],
      confirmacion: ['', Validators.required],
    },
    { validators: samePassword },
  );

  protected readonly type = signal<AccountType>('estudiante');
  protected readonly groups = signal<RegisterGroup[]>([]);
  protected readonly groupsLoaded = signal(false);
  protected readonly submitting = signal(false);
  protected readonly slow = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly showPassword = signal(false);
  protected readonly shiftText = shiftText;

  constructor() {
    // Loading the groups also wakes the backend up (Render sleeps)
    const request = this.auth.registerOptions().subscribe({
      next: (groups) => {
        this.groups.set(groups);
        this.groupsLoaded.set(true);
      },
      error: (err) => {
        this.groupsLoaded.set(true);
        this.error.set(registerErrorMessage(err));
      },
    });
    inject(DestroyRef).onDestroy(() => request.unsubscribe());
  }

  /** Name and group are only asked to students; teachers keep the name the administrator registered. */
  protected chooseType(type: AccountType): void {
    this.type.set(type);
    this.form.controls.tipo.setValue(type);
    this.applyType();
    this.error.set(null); // a new choice starts without the previous error
  }

  /** Enables name and group for students and disables them for teachers (without touching the error message). */
  private applyType(): void {
    for (const field of ['nombre', 'grupo_id'] as const) {
      const control = this.form.controls[field];
      if (this.type() === 'estudiante') control.enable();
      else control.disable();
    }
  }

  /** Message under a field, only once the person has left it (or tried to submit). */
  protected fieldError(field: RegisterField): string | null {
    const control = this.form.controls[field];
    if (!control.touched) return null;
    if (field === 'confirmacion' && !control.hasError('required') && this.form.hasError('mismatch')) {
      return 'Las contraseñas no coinciden.';
    }
    if (control.valid) return null;
    if (control.hasError('required')) {
      return {
        nombre: 'Escribe tu nombre.',
        email: 'Escribe tu correo.',
        grupo_id: 'Elige tu grupo.',
        password: 'Escribe una contraseña.',
        confirmacion: 'Repite la contraseña.',
      }[field];
    }
    if (control.hasError('email')) return 'Escribe un correo válido, por ejemplo nombre@ucc.edu.co.';
    if (control.hasError('tooShort')) return field === 'password' ? 'La contraseña debe tener al menos 8 caracteres.' : 'El nombre debe tener al menos 2 letras.';
    if (control.hasError('tooLong')) return 'Es demasiado largo.';
    return null;
  }

  protected submit(): void {
    if (this.submitting()) return; // no double submission while waiting for the answer
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const data = this.form.getRawValue();
    const student = data.tipo === 'estudiante';
    this.submitting.set(true);
    this.error.set(null);
    this.form.disable({ emitEvent: false });
    const slowTimer = setTimeout(() => this.slow.set(true), SLOW_MS);

    this.auth
      .register({
        rol: data.tipo,
        email: data.email.trim(),
        password: data.password,
        ...(student ? { nombre: data.nombre.trim(), grupo_id: data.grupo_id ?? undefined } : {}),
      })
      .pipe(
        finalize(() => {
          clearTimeout(slowTimer);
          this.submitting.set(false);
          this.slow.set(false);
          this.form.enable({ emitEvent: false });
          this.applyType(); // keeps name and group disabled for teachers; the error stays visible
        }),
      )
      .subscribe({
        next: ({ usuario }) => {
          const what = usuario.rol === 'profesor' ? 'Cuenta de profesor activada' : 'Cuenta creada';
          this.notify.success(`${what}. Bienvenido, ${usuario.nombre}: entraste como ${ROLE_LABELS[usuario.rol]}.`);
          this.router.navigateByUrl('/horario');
        },
        error: (err: unknown) => this.error.set(registerErrorMessage(err)),
      });
  }
}
