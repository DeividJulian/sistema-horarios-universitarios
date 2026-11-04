import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { BackupInfo, ConflictReport, Readiness, SeedResult, Statistics } from '../models';
import { API_URL } from './api-url';
import { zBackupInfo, zConflictReport, zMessageOut, zReadinessOut, zRestoreOut, zSeedOut, zStatisticsOut } from './generated/zod.gen';
import { parseResponse } from './parse';

/** demo: small example. faculty: 8 semesters of Software Engineering with their shifts. */
export type SeedDataset = 'demo' | 'faculty';

@Injectable({ providedIn: 'root' })
export class AnalysisService {
  private readonly http = inject(HttpClient);

  statistics(): Observable<Statistics> {
    return this.http.get(`${API_URL}/statistics`).pipe(parseResponse(zStatisticsOut, 'GET /statistics'));
  }

  conflicts(): Observable<ConflictReport> {
    return this.http.get(`${API_URL}/conflicts`).pipe(parseResponse(zConflictReport, 'GET /conflicts'));
  }

  /** Everything that would stop the generator, explained in plain language. */
  readiness(): Observable<Readiness> {
    return this.http.get(`${API_URL}/diagnostics`).pipe(parseResponse(zReadinessOut, 'GET /diagnostics'));
  }

  /** Copy of the data the demo replaced, if any. */
  backup(): Observable<BackupInfo> {
    return this.http.get(`${API_URL}/seed/backup`).pipe(parseResponse(zBackupInfo, 'GET /seed/backup'));
  }

  /** Goes back to the data that was there before loading the demo. */
  restoreBackup(): Observable<{ mensaje: string }> {
    return this.http.post(`${API_URL}/seed/restore`, {}).pipe(parseResponse(zRestoreOut, 'POST /seed/restore'));
  }

  /** Keeps the demo and forgets the copy. */
  discardBackup(): Observable<{ mensaje: string }> {
    return this.http.delete(`${API_URL}/seed/backup`).pipe(parseResponse(zMessageOut, 'DELETE /seed/backup'));
  }

  /** Loads demo data. With reset=true the backend first saves a copy of the current data and then replaces it. */
  seed(dataset: SeedDataset = 'demo', reset = false): Observable<SeedResult> {
    let params = new HttpParams().set('dataset', dataset);
    if (reset) params = params.set('reset', 'true');
    return this.http.post(`${API_URL}/seed`, {}, { params }).pipe(parseResponse(zSeedOut, 'POST /seed'));
  }
}
