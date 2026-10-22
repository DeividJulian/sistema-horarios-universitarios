import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, input, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { AuthService } from '../../../core/auth/auth.service';
import { apiErrorMessage } from '../../../core/http/api-error';
import { ROLE_LABELS, User } from '../../../core/models';
import { NotificationService } from '../../../core/services/notification.service';
import { AuthArt } from '../auth-art/auth-art';
import { CodeStep } from '../code-step/code-step';

type ServerState = 'waking' | 'ready' | 'down';

/** After this long without an answer, explain that the free server is waking up. */
const SLOW_MS = 4000;

export const LAST_EMAIL_KEY = 'horarios.ultimo-correo';

/** The email used last time on this browser, to save typing it again. */
export function rememberedEmail(): string {
  try {
    return localStorage.getItem(LAST_EMAIL_KEY) ?? '';
  } catch {
    return '';
  }
}

/** Clear Spanish message for each way asking for the code can fail. */
export function loginErrorMessage(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0) {
      return 'No hay conexión con el servidor. Revisa tu internet o intenta de nuevo en un minuto.';
    }
    // Our backend explains a 502 (the email did not go out); Render's own 502/503/504 means it is waking up
    if (error.status === 502 || error.status === 503 || error.status === 504) {
      const detail = error.error?.detail;
      return typeof detail === 'string' ? detail : 'El servidor está despertando. Espera unos segundos e intenta de nuevo.';
    }
  }
  return apiErrorMessage(error, 'No se pudo enviar el código. Intenta de nuevo.');
}

/** Where to go after signing in: the page the user wanted, or the schedule. */
export function afterLoginUrl(volver: string | undefined): string {
  return volver && volver.startsWith('/') && !volver.startsWith('//') && !volver.startsWith('/login') ? volver : '/horario';
}

/** Passwordless login: email first, then the six-digit code that arrives there. */
@Component({
  selector: 'app-login-page',
  imports: [ReactiveFormsModule, RouterLink, CodeStep, AuthArt],
  templateUrl: './login-page.html',
  // Shared with the sign-up page
  styleUrl: '../auth.css',
})
export class LoginPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly notify = inject(NotificationService);

  /** Page to return to after signing in (?volver=/analisis). */
  readonly volver = input<string>();

  protected readonly form = inject(NonNullableFormBuilder).group({
    email: [rememberedEmail(), [Validators.required, Validators.email]],
  });

  protected readonly step = signal<'email' | 'code'>('email');
  protected readonly email = signal('');
  protected readonly submitting = signal(false);
  protected readonly slow = signal(false);
  protected readonly error = signal<string | null>(null);
  /** The email had no account (404): offer to create one with it. */
  protected readonly noAccount = signal(false);
  protected readonly server = signal<ServerState>('waking');

  constructor() {
    // Start waking the backend up right away (Render sleeps), so it is ready by the time the user finishes typing
    const ping = this.auth.ping().subscribe({
      next: () => this.server.set('ready'),
      error: () => this.server.set('down'),
    });
    inject(DestroyRef).onDestroy(() => ping.unsubscribe());
  }

  /** Message under the field, only once the person has left it (or tried to submit). */
  protected emailError(): string | null {
    const control = this.form.controls.email;
    if (!control.touched || control.valid) return null;
    if (control.hasError('required')) return 'Escribe tu correo.';
    return 'Escribe un correo válido, por ejemplo nombre@ucc.edu.co.';
  }

  protected submit(): void {
    if (this.submitting()) return; // no double submission while waiting for the answer
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const email = this.form.controls.email.value.trim().toLowerCase();
    this.submitting.set(true);
    this.error.set(null);
    this.noAccount.set(false);
    this.form.disable({ emitEvent: false }); // nothing can be edited while the request is on its way
    const slowTimer = setTimeout(() => this.slow.set(true), SLOW_MS);

    this.auth
      .requestCode(email)
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
          this.email.set(email);
          try {
            localStorage.setItem(LAST_EMAIL_KEY, email);
          } catch {
            // Without storage it just isn't remembered
          }
          this.step.set('code');
        },
        error: (err: unknown) => {
          if (err instanceof HttpErrorResponse && err.status === 0) this.server.set('down');
          this.noAccount.set(err instanceof HttpErrorResponse && err.status === 404);
          this.error.set(loginErrorMessage(err));
        },
      });
  }

  protected typedEmail(): string {
    return this.form.controls.email.value.trim().toLowerCase();
  }

  protected enter(user: User): void {
    // Says who signed in and with which role
    this.notify.success(`Bienvenido, ${user.nombre}. Entraste como ${ROLE_LABELS[user.rol]}.`);
    this.router.navigateByUrl(afterLoginUrl(this.volver()));
  }
}
