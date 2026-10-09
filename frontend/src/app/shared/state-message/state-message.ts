import { Component, input, output } from '@angular/core';

export type StateKind = 'loading' | 'empty' | 'error';

/** Consistent placeholder for loading, empty and error states. */
@Component({
  selector: 'app-state-message',
  templateUrl: './state-message.html',
  styleUrl: './state-message.css',
})
export class StateMessage {
  readonly kind = input.required<StateKind>();
  readonly title = input.required<string>();
  readonly message = input<string>('');
  readonly actionText = input<string>('');

  readonly action = output<void>();
}
