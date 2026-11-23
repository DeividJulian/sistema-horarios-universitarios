import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import * as z from 'zod/mini';

import { SavedSchedule, SavedScheduleActivation, SavedScheduleCreation } from '../models';
import { API_URL, ApiMessage } from './api-url';
import { zMessageOut, zSavedScheduleActivated, zSavedScheduleCreated, zSavedScheduleOut } from './generated/zod.gen';
import { parseResponse } from './parse';

/** Several named schedules: every signed-in user can list them; only administrators create or change them. */
@Injectable({ providedIn: 'root' })
export class SavedScheduleService {
  private readonly http = inject(HttpClient);
  private readonly url = `${API_URL}/saved-schedules`;

  list(): Observable<SavedSchedule[]> {
    return this.http.get(this.url).pipe(parseResponse(z.array(zSavedScheduleOut), 'GET /saved-schedules'));
  }

  /** Keeps the current schedule and generates a new one, which becomes the active one. */
  create(nombre: string): Observable<SavedScheduleCreation> {
    return this.http.post(this.url, { nombre }).pipe(parseResponse(zSavedScheduleCreated, 'POST /saved-schedules'));
  }

  activate(id: number): Observable<SavedScheduleActivation> {
    return this.http
      .post(`${this.url}/${id}/activate`, {})
      .pipe(parseResponse(zSavedScheduleActivated, 'POST /saved-schedules/{id}/activate'));
  }

  rename(id: number, nombre: string): Observable<SavedSchedule> {
    return this.http.patch(`${this.url}/${id}`, { nombre }).pipe(parseResponse(zSavedScheduleOut, 'PATCH /saved-schedules/{id}'));
  }

  delete(id: number): Observable<ApiMessage> {
    return this.http.delete(`${this.url}/${id}`).pipe(parseResponse(zMessageOut, 'DELETE /saved-schedules/{id}'));
  }
}
