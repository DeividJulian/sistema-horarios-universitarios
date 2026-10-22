import { Component, DestroyRef, ElementRef, OnInit, afterNextRender, computed, inject, input, output, signal, viewChild } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';

import { AuthService } from '../../../core/auth/auth.service';
import { apiErrorMessage } from '../../../core/http/api-error';
import { User } from '../../../core/models';
import { NotificationService } from '../../../core/services/notification.service';

/** Same wait the backend asks between two codes. */
export const RESEND_SECONDS = 30;

/** Keeps only the digits of what was typed or pasted ("Tu código: 123 456" → "123456"). */
export function cleanCode(value: string): string {
  return value.replace(/\D/g, '').slice(0, 6);
}

/** Web inbox of the most common providers, opened on the code email when it can search. */
export function inboxFor(email: string): { label: string; url: string } | null {
  const domain = email.split('@')[1]?.toLowerCase() ?? '';
  if (domain === 'gmail.com' || domain === 'googlemail.com') {
    return { label: 'Abrir Gmail', url: 'https://mail.google.com/mail/u/0/#search/%22Horarios+y+Aulas%22+c%C3%B3digo' };
  }
  if (['outlook.com', 'hotmail.com', 'live.com', 'outlook.es', 'hotmail.es'].includes(domain)) {
    return { label: 'Abrir Outlook', url: 'https://outlook.live.com/mail/0/' };
  }
  if (domain.startsWith('yahoo.')) return { label: 'Abrir Yahoo Mail', url: 'https://mail.yahoo.com/' };
  return null;
}

/** Second step of the login and the sign-up: type the six-digit code that arrived by email. */
@Component({
  selector: 'app-code-step',
  imports: [ReactiveFormsModule],
  templateUrl: './code-step.html',
  styleUrls: ['../auth.css', './code-step.css'],
})
export class CodeStep implements OnInit {
  readonly email = input.required<string>();
  readonly submitLabel = input('Entrar');
  readonly verified = output<User>();
  readonly back = output<void>();

  private readonly auth = inject(AuthService);
  private readonly notify = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly code = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.pattern(/^\d{6}$/)],
  });
  protected readonly verifying = signal(false);
  protected readonly resending = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly cooldown = signal(RESEND_SECONDS);
  protected readonly inbox = computed(() => inboxFor(this.email()));

  private timer: ReturnType<typeof setInterval> | null = null;
  private readonly codeInput = viewChild<ElementRef<HTMLInputElement>>('codeInput');

  constructor() {
    // The code arrives by email: the cursor waits in the field so it can be pasted right away
    afterNextRender(() => this.codeInput()?.nativeElement.focus());
  }

  ngOnInit(): void {
    this.startCooldown();
    this.destroyRef.onDestroy(() => this.stopTimer());
  }

  protected onInput(): void {
    this.normalize();
    // With the six digits typed or pasted there is nothing else to wait for
    if (this.code.value.length === 6 && !this.verifying()) this.verify();
  }

  protected verify(event?: Event): void {
    event?.preventDefault();
    this.normalize();
    if (this.code.invalid) {
      this.code.markAsTouched();
      return;
    }
    this.verifying.set(true);
    this.error.set(null);
    this.auth.verify(this.email(), this.code.value).subscribe({
      next: (user) => {
        this.verifying.set(false);
        this.verified.emit(user);
      },
      error: (err: unknown) => {
        this.verifying.set(false);
        this.code.reset();
        this.error.set(apiErrorMessage(err, 'No se pudo verificar el código. Intenta de nuevo.'));
        this.codeInput()?.nativeElement.focus();
      },
    });
  }

  protected resend(): void {
    this.resending.set(true);
    this.error.set(null);
    this.auth.requestCode(this.email()).subscribe({
      next: () => {
        this.resending.set(false);
        this.code.reset();
        this.notify.info('Te enviamos un código nuevo.');
        this.startCooldown();
        // The old code no longer works: the cursor waits for the new one
        this.codeInput()?.nativeElement.focus();
      },
      error: (err: unknown) => {
        this.resending.set(false);
        this.error.set(apiErrorMessage(err, 'No se pudo reenviar el código. Intenta de nuevo.'));
      },
    });
  }

  private normalize(): void {
    const clean = cleanCode(this.code.value);
    if (clean !== this.code.value) this.code.setValue(clean);
  }

  private startCooldown(): void {
    this.stopTimer();
    this.cooldown.set(RESEND_SECONDS);
    this.timer = setInterval(() => {
      this.cooldown.update((s) => Math.max(0, s - 1));
      if (this.cooldown() === 0) this.stopTimer();
    }, 1000);
  }

  private stopTimer(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }
}
