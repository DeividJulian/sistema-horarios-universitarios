import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, OnInit, inject, input, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { AuthService } from '../../../core/auth/auth.service';
import { apiErrorMessage } from '../../../core/http/api-error';
import { RegisterGroup, User, shiftText } from '../../../core/models';
import { NotificationService } from '../../../core/services/notification.service';
import { trimmedLength } from '../../../shared/forms/validators';
import { AuthArt } from '../auth-art/auth-art';
import { CodeStep } from '../code-step/code-step';

type RegisterField = 'nombre' | 'email' | 'grupo_id';

/** After this long without an answer, explain that the free server is waking up. */
const SLOW_MS = 4000;

/** Clear Spanish message for each way the sign-up can fail. */
export function registerErrorMessage(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0) return 'No hay conexión con el servidor. Revisa tu internet o intenta de nuevo en un minuto.';
    // Our backend explains a 502 (the email did not go out); Render's own 502/503/504 means it is waking up
    if (error.status === 502 || error.status === 503 || error.status === 504) {
      const detail = error.error?.detail;
      return typeof detail === 'string' ? detail : 'El servidor está despertando. Espera unos segundos e intenta de nuevo.';
    }
  }
  return apiErrorMessage(error, 'No se pudo crear la cuenta. Intenta de nuevo.');
}

/** Student sign-up: name, email and group, then the six-digit code that activates the account. */
@Component({
  selector: 'app-register-page',
  imports: [ReactiveFormsModule, RouterLink, CodeStep, AuthArt],
  templateUrl: './register-page.html',
  styleUrls: ['../auth.css', './register-page.css'],
})
export class RegisterPage implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly notify = inject(NotificationService);

  /** Email typed on the login page when it had no account (?email=...). */
  readonly email = input<string>();

  protected readonly form = inject(NonNullableFormBuilder).group({
    nombre: ['', [Validators.required, trimmedLength(2, 100)]],
    email: ['', [Validators.required, Validators.email]],
    grupo_id: [null as number | null, Validators.required],
  });

  protected readonly step = signal<'form' | 'code'>('form');
  protected readonly sentTo = signal('');
  protected readonly groups = signal<RegisterGroup[]>([]);
  protected readonly groupsLoaded = signal(false);
  protected readonly submitting = signal(false);
  protected readonly slow = signal(false);
  protected readonly error = signal<string | null>(null);
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

  ngOnInit(): void {
    const email = this.email();
    if (email) this.form.controls.email.setValue(email);
  }

  /** Message under a field, only once the person has left it (or tried to submit). */
  protected fieldError(field: RegisterField): string | null {
    const control = this.form.controls[field];
    if (!control.touched || control.valid) return null;
    if (control.hasError('required')) {
      return { nombre: 'Escribe tu nombre.', email: 'Escribe tu correo.', grupo_id: 'Elige tu grupo.' }[field];
    }
    if (control.hasError('email')) return 'Escribe un correo válido, por ejemplo nombre@ucc.edu.co.';
    if (control.hasError('tooShort')) return 'El nombre debe tener al menos 2 letras.';
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
    const email = data.email.trim().toLowerCase();
    this.submitting.set(true);
    this.error.set(null);
    this.form.disable({ emitEvent: false });
    const slowTimer = setTimeout(() => this.slow.set(true), SLOW_MS);

    this.auth
      .register({ nombre: data.nombre.trim(), email, grupo_id: data.grupo_id! })
      .pipe(
        finalize(() => {
          clearTimeout(slowTimer);
          this.submitting.set(false);
          this.slow.set(false);
          this.form.enable({ emitEvent: false });
        }),
      )
      .subscribe({
        next: (sent) => {
          this.sentTo.set(sent.email);
          this.step.set('code');
        },
        error: (err: unknown) => this.error.set(registerErrorMessage(err)),
      });
  }

  protected enter(user: User): void {
    this.notify.success(`Cuenta activada. Bienvenido, ${user.nombre}: ya puedes ver el horario de tu grupo.`);
    this.router.navigateByUrl('/horario');
  }
}
