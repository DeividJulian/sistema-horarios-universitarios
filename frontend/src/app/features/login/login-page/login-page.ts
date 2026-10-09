import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, input, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';

import { AuthService } from '../../../core/auth/auth.service';
import { apiErrorMessage } from '../../../core/http/api-error';
import { errorMessage } from '../../../shared/forms/error-message';

type ServerState = 'waking' | 'ready' | 'down';

/** Demo accounts created by the backend (backend/services/users.py), so the app can be tried with both roles. */
const DEMO_ACCOUNTS = [
  { label: 'Administrador', hint: 'Puede modificar todo', email: 'admin@horarios.edu.co', password: 'Admin2026*' },
  { label: 'Usuario', hint: 'Solo consulta', email: 'usuario@horarios.edu.co', password: 'Usuario2026*' },
];

/** After this long without an answer, explain that the free server is waking up. */
const SLOW_MS = 4000;

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

  protected readonly demoAccounts = DEMO_ACCOUNTS;
  protected readonly errorMessage = errorMessage;
  protected readonly submitting = signal(false);
  protected readonly slow = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly showPassword = signal(false);
  protected readonly server = signal<ServerState>('waking');

  constructor() {
    // Start waking the backend up right away, so it is ready by the time the user finishes typing
    const ping = this.auth.ping().subscribe({
      next: () => this.server.set('ready'),
      error: () => this.server.set('down'),
    });
    inject(DestroyRef).onDestroy(() => ping.unsubscribe());
  }

  protected useAccount(account: (typeof DEMO_ACCOUNTS)[number]): void {
    this.form.setValue({ email: account.email, password: account.password });
    this.error.set(null);
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { email, password } = this.form.getRawValue();
    this.submitting.set(true);
    this.error.set(null);
    const slowTimer = setTimeout(() => this.slow.set(true), SLOW_MS);

    this.auth
      .login(email.trim(), password)
      .pipe(
        finalize(() => {
          clearTimeout(slowTimer);
          this.submitting.set(false);
          this.slow.set(false);
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
          this.error.set(apiErrorMessage(err, 'No se pudo iniciar sesión.'));
        },
      });
  }
}
