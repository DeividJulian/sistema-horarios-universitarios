import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, input, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';

import { AuthService } from '../../../core/auth/auth.service';
import { apiErrorMessage } from '../../../core/http/api-error';

type ServerState = 'waking' | 'ready' | 'down';
type LoginField = 'email' | 'password';

/** After this long without an answer, explain that the free server is waking up. */
const SLOW_MS = 4000;

/** Clear Spanish message for each way the login can fail. */
export function loginErrorMessage(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0) {
      return 'No hay conexión con el servidor. Revisa tu internet o intenta de nuevo en un minuto.';
    }
    if (error.status === 401) {
      return apiErrorMessage(error, 'Correo o contraseña incorrectos.');
    }
    if (error.status === 403) {
      return apiErrorMessage(error, 'Tu cuenta no tiene acceso. Habla con el administrador.');
    }
    if (error.status === 502 || error.status === 503 || error.status === 504) {
      return 'El servidor está despertando. Espera unos segundos e intenta de nuevo.';
    }
  }
  return apiErrorMessage(error, 'No se pudo iniciar sesión. Intenta de nuevo.');
}

@Component({
  selector: 'app-login-page',
  imports: [ReactiveFormsModule],
  templateUrl: './login-page.html',
  styleUrl: './login-page.css',
})
export class LoginPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  /** Page to return to after signing in (?volver=/analisis). */
  readonly volver = input<string>();

  protected readonly form = inject(NonNullableFormBuilder).group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  protected readonly submitting = signal(false);
  protected readonly slow = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly showPassword = signal(false);
  protected readonly server = signal<ServerState>('waking');

  constructor() {
    // Start waking the backend up right away (Render sleeps), so it is ready by the time the user finishes typing
    const ping = this.auth.ping().subscribe({
      next: () => this.server.set('ready'),
      error: () => this.server.set('down'),
    });
    inject(DestroyRef).onDestroy(() => ping.unsubscribe());
  }

  /** Message under a field, only once the person has left it (or tried to submit). */
  protected fieldError(field: LoginField): string | null {
    const control = this.form.controls[field];
    if (!control.touched || control.valid) return null;
    if (control.hasError('required')) return field === 'email' ? 'Escribe tu correo.' : 'Escribe tu contraseña.';
    if (control.hasError('email')) return 'Escribe un correo válido, por ejemplo nombre@ucc.edu.co.';
    return null;
  }

  protected submit(): void {
    if (this.submitting()) return; // no double submission while waiting for the answer
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { email, password } = this.form.getRawValue();
    this.submitting.set(true);
    this.error.set(null);
    this.form.disable({ emitEvent: false }); // nothing can be edited while the request is on its way
    const slowTimer = setTimeout(() => this.slow.set(true), SLOW_MS);

    this.auth
      .login(email.trim(), password)
      .pipe(
        finalize(() => {
          clearTimeout(slowTimer);
          this.submitting.set(false);
          this.slow.set(false);
          this.form.enable({ emitEvent: false });
        }),
      )
      .subscribe({
        next: () => {
          this.server.set('ready');
          const target = this.volver();
          this.router.navigateByUrl(target && target.startsWith('/') && !target.startsWith('/login') ? target : '/horario');
        },
        error: (err: unknown) => {
          if (err instanceof HttpErrorResponse && err.status === 0) this.server.set('down');
          this.error.set(loginErrorMessage(err));
        },
      });
  }
}
