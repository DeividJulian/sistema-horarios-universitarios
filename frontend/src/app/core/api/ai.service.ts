import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { AiExplanation, AiStatus } from '../models';
import { API_URL } from './api-url';

/** Explanations of the schedule written by Claude (the backend holds the API key). */
@Injectable({ providedIn: 'root' })
export class AiService {
  private readonly http = inject(HttpClient);

  status(): Observable<AiStatus> {
    return this.http.get<AiStatus>(`${API_URL}/ai/status`);
  }

  explain(pregunta?: string): Observable<AiExplanation> {
    return this.http.post<AiExplanation>(`${API_URL}/ai/explain`, pregunta ? { pregunta } : {});
  }
}
