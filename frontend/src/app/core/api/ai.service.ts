import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable } from 'rxjs';

import { AiStatus, ConflictSuggestion, NoticeDraft, NoticeDraftRequest } from '../models';
import { API_URL } from './api-url';
import { zAiStatus, zConflictSuggestion, zNoticeDraftOut } from './generated/zod.gen';
import { parseResponse } from './parse';

/** The AI layer of the backend (Groq by default). The provider's key lives only in the server. */
@Injectable({ providedIn: 'root' })
export class AiService {
  private readonly http = inject(HttpClient);

  /** null until asked; asked once per session by whoever needs it. */
  readonly status = signal<AiStatus | null>(null);
  readonly ready = computed(() => this.status()?.configurada === true);
  /** "Groq", as the server names it. */
  readonly providerName = computed(() => this.status()?.nombre_proveedor ?? '');

  private asked = false;

  loadStatus(): void {
    if (this.asked) return;
    this.asked = true;
    this.http.get(`${API_URL}/ai/status`).pipe(parseResponse(zAiStatus, 'GET /ai/status')).subscribe({
      next: (status) => this.status.set(status),
      error: () => {
        this.asked = false; // it may work after signing in again
        this.status.set(null);
      },
    });
  }

  /** Forgets the status (for example when signing out). */
  reset(): void {
    this.asked = false;
    this.status.set(null);
  }

  conflictSuggestion(entryId: number): Observable<ConflictSuggestion> {
    return this.http.post(`${API_URL}/ai/conflicts/${entryId}/suggestion`, {}).pipe(parseResponse(zConflictSuggestion, 'POST /ai/conflicts/{id}/suggestion'));
  }

  draftNotice(request: NoticeDraftRequest): Observable<NoticeDraft> {
    return this.http.post(`${API_URL}/ai/notices/draft`, request).pipe(parseResponse(zNoticeDraftOut, 'POST /ai/notices/draft'));
  }
}
