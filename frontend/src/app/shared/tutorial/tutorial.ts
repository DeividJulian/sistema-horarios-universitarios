import { Component, ElementRef, computed, effect, inject, signal, viewChild } from '@angular/core';
import { Router } from '@angular/router';

import { AuthService } from '../../core/auth/auth.service';
import { TutorialService } from '../../core/services/tutorial.service';
import { stepsFor } from './tutorial-steps';

@Component({
  selector: 'app-tutorial',
  templateUrl: './tutorial.html',
  styleUrl: './tutorial.css',
})
export class Tutorial {
  protected readonly tutorial = inject(TutorialService);
  private readonly router = inject(Router);
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  private readonly auth = inject(AuthService);

  /** Administrators see how to set everything up; read-only users only how to consult. */
  protected readonly steps = computed(() => stepsFor(this.auth.isAdmin()));
  protected readonly index = signal(0);
  protected readonly step = computed(() => this.steps()[this.index()]);
  protected readonly isFirst = computed(() => this.index() === 0);
  protected readonly isLast = computed(() => this.index() === this.steps().length - 1);

  constructor() {
    // Same pattern as the confirm dialog: the native <dialog> traps focus and closes with Escape
    effect(() => {
      const element = this.dialog().nativeElement;
      if (this.tutorial.isOpen() && !element.open) {
        this.index.set(0);
        element.showModal();
      }
      if (!this.tutorial.isOpen() && element.open) element.close();
    });
  }

  protected goTo(index: number): void {
    this.index.set(Math.max(0, Math.min(index, this.steps().length - 1)));
  }

  /** Closes the tutorial and opens the section the current step talks about. */
  protected visit(path: string): void {
    this.tutorial.close();
    this.router.navigateByUrl(path);
  }

  /** Fired by Escape or by closing the dialog in any other way. */
  protected onClose(): void {
    this.tutorial.close();
  }
}
