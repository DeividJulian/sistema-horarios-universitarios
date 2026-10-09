import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { ConflictReport, Readiness, SeedResult, Statistics } from '../models';
import { API_URL } from './api-url';

/** demo: small example. faculty: 8 semesters of Software Engineering with their shifts. */
export type SeedDataset = 'demo' | 'faculty';

@Injectable({ providedIn: 'root' })
export class AnalysisService {
  private readonly http = inject(HttpClient);

  statistics(): Observable<Statistics> {
    return this.http.get<Statistics>(`${API_URL}/statistics`);
  }

  conflicts(): Observable<ConflictReport> {
    return this.http.get<ConflictReport>(`${API_URL}/conflicts`);
  }

  /** Everything that would stop the generator, explained in plain language. */
  readiness(): Observable<Readiness> {
    return this.http.get<Readiness>(`${API_URL}/diagnostics`);
  }

  /** Loads demo data. With reset=true the backend first DELETES every record. */
  seed(dataset: SeedDataset = 'demo', reset = false): Observable<SeedResult> {
    let params = new HttpParams().set('dataset', dataset);
    if (reset) params = params.set('reset', 'true');
    return this.http.post<SeedResult>(`${API_URL}/seed`, {}, { params });
  }
}
