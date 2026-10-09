import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, input, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';

import { AuthService } from '../../../core/auth/auth.service';
import { apiErrorMessage } from '../../../core/http/api-error';
import { DemoAccount } from '../../../core/models';
import { errorMessage } from '../../../shared/forms/error-message';

type ServerState = 'waking' | 'ready' | 'down';

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

  /** Test accounts for every role, given by the backend (GET /auth/demo-accounts). */
  protected readonly demoAccounts = signal<DemoAccount[]>([]);
  protected readonly errorMessage = errorMessage;
  protected readonly submitting = signal(false);
  protected readonly slow = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly showPassword = signal(false);
  protected readonly server = signal<ServerState>('waking');

  constructor() {
    // Asking for the test accounts also wakes the backend up (Render sleeps), so it is ready by the time the
    // user finishes typing
    const ping = this.auth.demoAccounts().subscribe({
      next: (accounts) => {
        this.demoAccounts.set(accounts);
        this.server.set('ready');
      },
      error: () => this.server.set('down'),
    });
    inject(DestroyRef).onDestroy(() => ping.unsubscribe());
  }

  protected useAccount(account: DemoAccount): void {
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
