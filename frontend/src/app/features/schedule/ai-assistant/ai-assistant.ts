import { Component, ElementRef, computed, inject, signal, viewChild } from '@angular/core';

import { AiService } from '../../../core/api/ai.service';
import { apiErrorMessage } from '../../../core/http/api-error';
import { AiStatus, parseAiText } from '../../../core/models';

/**
 * «Explicar con IA»: Claude reads the diagnostics, conflicts and statistics of the schedule (on the backend) and
 * explains in plain Spanish what is wrong and how to fix it. Without ANTHROPIC_API_KEY on the server the button
 * says the AI is not configured.
 */
@Component({
  selector: 'app-ai-assistant',
  templateUrl: './ai-assistant.html',
  styleUrl: './ai-assistant.css',
})
export class AiAssistant {
  private readonly api = inject(AiService);
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  protected readonly status = signal<AiStatus | null>(null);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly answer = signal<string | null>(null);
  protected readonly model = signal<string | null>(null);
  protected readonly question = signal('');

  protected readonly blocks = computed(() => parseAiText(this.answer() ?? ''));

  constructor() {
    this.api.status().subscribe({
      next: (status) => this.status.set(status),
      error: () => this.status.set({ disponible: false, modelo: null }),
    });
  }

  protected open(): void {
    this.dialog().nativeElement.showModal();
    if (!this.answer() && !this.loading()) this.ask();
  }

  protected close(): void {
    this.dialog().nativeElement.close();
  }

  /** Without a question Claude explains the whole schedule; with one, it answers it using the same data. */
  protected ask(question?: string): void {
    if (this.loading()) return;
    this.loading.set(true);
    this.error.set(null);
    this.api.explain(question?.trim() || undefined).subscribe({
      next: (result) => {
        this.answer.set(result.explicacion);
        this.model.set(result.modelo);
        this.loading.set(false);
        this.question.set('');
      },
      error: (err) => {
        this.error.set(apiErrorMessage(err, 'La IA no pudo responder. Intenta de nuevo.'));
        this.loading.set(false);
      },
    });
  }
}
