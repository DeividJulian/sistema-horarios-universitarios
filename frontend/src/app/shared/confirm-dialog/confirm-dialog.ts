import { Component, ElementRef, effect, inject, viewChild } from '@angular/core';

import { ConfirmService } from '../../core/services/confirm.service';

@Component({
  selector: 'app-confirm-dialog',
  templateUrl: './confirm-dialog.html',
  styleUrl: './confirm-dialog.css',
})
export class ConfirmDialog {
  protected readonly confirm = inject(ConfirmService);
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  constructor() {
    // The native <dialog> gives us focus trapping, Escape to close and an inert background for free
    effect(() => {
      const element = this.dialog().nativeElement;
      if (this.confirm.pending() && !element.open) element.showModal();
      if (!this.confirm.pending() && element.open) element.close();
    });
  }

  /** Fired by Escape or by closing the dialog in any other way. */
  protected onClose(): void {
    this.confirm.answer(false);
  }
}
