import { Component, effect, inject, input, output, signal } from '@angular/core';

import { AiService } from '../../../core/api/ai.service';
import { apiErrorMessage } from '../../../core/http/api-error';
import { ConflictOption, ConflictSuggestion, hourOf } from '../../../core/models';
import { HourPipe } from '../../../shared/pipes/hour.pipe';

/**
 * «Resolver con IA» for a block with conflicts: the backend lists the slots and classrooms where it fits without
 * breaking any rule, and the AI recommends one and explains why. Nothing moves until the administrator chooses.
 */
@Component({
  selector: 'app-conflict-advisor',
  imports: [HourPipe],
  templateUrl: './conflict-advisor.html',
  styleUrl: './conflict-advisor.css',
})
export class ConflictAdvisor {
  readonly entryId = input.required<number>();
  readonly apply = output<ConflictOption>();

  protected readonly ai = inject(AiService);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly suggestion = signal<ConflictSuggestion | null>(null);
  protected readonly hourOf = hourOf;

  constructor() {
    this.ai.loadStatus();
    // Another block: the previous advice no longer applies
    effect(() => {
      this.entryId();
      this.suggestion.set(null);
      this.error.set(null);
    });
  }

  protected ask(): void {
    if (this.loading()) return;
    this.loading.set(true);
    this.error.set(null);
    const entryId = this.entryId();
    this.ai.conflictSuggestion(entryId).subscribe({
      next: (suggestion) => {
        if (suggestion.horario_id === this.entryId()) this.suggestion.set(suggestion);
        this.loading.set(false);
      },
      error: (err: unknown) => {
        this.error.set(apiErrorMessage(err, 'La IA no pudo responder. Intenta de nuevo.'));
        this.loading.set(false);
      },
    });
  }
}
