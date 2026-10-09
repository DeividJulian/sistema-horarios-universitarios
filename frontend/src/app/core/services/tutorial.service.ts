import { Injectable, inject, signal } from '@angular/core';

import { AuthService } from '../auth/auth.service';

const SEEN_KEY = 'horarios.tutorial-visto';

/**
 * Opens and closes the "how to use the app" tutorial. It opens by itself the first time each role
 * signs in on this browser (an administrator and a student see different tutorials).
 */
@Injectable({ providedIn: 'root' })
export class TutorialService {
  private readonly auth = inject(AuthService);
  readonly isOpen = signal(false);

  /** Shows the tutorial if this role has never seen it here (storage may be blocked: then it just stays closed). */
  openIfFirstVisit(): void {
    try {
      if (!localStorage.getItem(this.key())) this.open();
    } catch {
      // Private mode or blocked storage: the Tutorial button is still there
    }
  }

  open(): void {
    this.isOpen.set(true);
  }

  /** remember=false closes it without marking it as seen (for example when the session ends). */
  close(remember = true): void {
    this.isOpen.set(false);
    if (!remember) return;
    try {
      localStorage.setItem(this.key(), '1');
    } catch {
      // Nothing to remember without storage
    }
  }

  private key(): string {
    return `${SEEN_KEY}.${this.auth.role() ?? 'anonimo'}`;
  }
}
