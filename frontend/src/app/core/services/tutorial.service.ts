import { Injectable, signal } from '@angular/core';

const SEEN_KEY = 'horarios.tutorial-visto';

/** Opens and closes the "how to use the app" tutorial. It opens by itself on the user's first visit. */
@Injectable({ providedIn: 'root' })
export class TutorialService {
  readonly isOpen = signal(false);

  /** Shows the tutorial if this browser has never seen it (storage may be blocked: then it just stays closed). */
  openIfFirstVisit(): void {
    try {
      if (!localStorage.getItem(SEEN_KEY)) this.open();
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
      localStorage.setItem(SEEN_KEY, '1');
    } catch {
      // Nothing to remember without storage
    }
  }
}
