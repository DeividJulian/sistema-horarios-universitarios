import { Injectable, signal } from '@angular/core';

import { apiErrorMessage } from '../http/api-error';

export type NotificationKind = 'success' | 'error' | 'info';

export interface Notification {
  id: number;
  kind: NotificationKind;
  message: string;
}

const AUTO_DISMISS_MS = { success: 4000, info: 5000, error: 7000 } as const;

/** Small, non-blocking messages (toasts) that replace window.alert(). */
@Injectable({ providedIn: 'root' })
export class NotificationService {
  readonly items = signal<Notification[]>([]);
  private nextId = 1;

  success(message: string): void {
    this.push('success', message);
  }

  info(message: string): void {
    this.push('info', message);
  }

  error(message: string): void {
    this.push('error', message);
  }

  /** Shows the backend's message for an HTTP error, or the fallback text. */
  apiError(error: unknown, fallback: string): void {
    this.error(apiErrorMessage(error, fallback));
  }

  dismiss(id: number): void {
    this.items.update((list) => list.filter((n) => n.id !== id));
  }

  private push(kind: NotificationKind, message: string): void {
    const id = this.nextId++;
    // Keep at most 4 on screen
    this.items.update((list) => [...list.slice(-3), { id, kind, message }]);
    setTimeout(() => this.dismiss(id), AUTO_DISMISS_MS[kind]);
  }
}
