import { Component, ElementRef, inject, signal, viewChild } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { AuthService } from '../../core/auth/auth.service';
import { apiErrorMessage } from '../../core/http/api-error';
import { NotificationService } from '../../core/services/notification.service';
import { errorMessage } from '../forms/error-message';
import { trimmedLength } from '../forms/validators';

/** Lets anyone change their password (teachers start with a shared initial one). */
@Component({
  selector: 'app-password-dialog',
  imports: [ReactiveFormsModule],
  templateUrl: './password-dialog.html',
  styleUrl: './password-dialog.css',
})
export class PasswordDialog {
  private readonly auth = inject(AuthService);
  private readonly notify = inject(NotificationService);
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  protected readonly errorMessage = errorMessage;
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly form = inject(NonNullableFormBuilder).group({
    actual: ['', Validators.required],
    nueva: ['', [Validators.required, trimmedLength(8, 128)]],
  });

  open(): void {
    this.form.reset();
    this.error.set(null);
    this.dialog().nativeElement.showModal();
  }

  protected close(): void {
    this.dialog().nativeElement.close();
  }

  protected save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { actual, nueva } = this.form.getRawValue();
    this.saving.set(true);
    this.auth.changePassword(actual, nueva).subscribe({
      next: () => {
        this.saving.set(false);
        this.notify.success('Contraseña actualizada.');
        this.close();
      },
      error: (err) => {
        this.saving.set(false);
        this.error.set(apiErrorMessage(err, 'No se pudo cambiar la contraseña.'));
      },
    });
  }
}
