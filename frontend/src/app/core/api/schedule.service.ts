import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import * as z from 'zod/mini';

import { GenerationResult, ScheduleEntry, ScheduleEntryMove } from '../models';
import { API_URL, ApiMessage } from './api-url';
import { zGenerationOut, zMessageOut, zScheduleEntryOut } from './generated/zod.gen';
import { parseResponse } from './parse';

@Injectable({ providedIn: 'root' })
export class ScheduleService {
  private readonly http = inject(HttpClient);

  list(): Observable<ScheduleEntry[]> {
    return this.http.get(`${API_URL}/schedules`).pipe(parseResponse(z.array(zScheduleEntryOut), 'GET /schedules'));
  }

  generate(): Observable<GenerationResult> {
    return this.http.post(`${API_URL}/schedules/generate`, {}).pipe(parseResponse(zGenerationOut, 'POST /schedules/generate'));
  }

  move(id: number, change: ScheduleEntryMove): Observable<ScheduleEntry> {
    return this.http.put(`${API_URL}/schedules/${id}`, change).pipe(parseResponse(zScheduleEntryOut, 'PUT /schedules/{id}'));
  }

  delete(id: number): Observable<ApiMessage> {
    return this.http.delete(`${API_URL}/schedules/${id}`).pipe(parseResponse(zMessageOut, 'DELETE /schedules/{id}'));
  }
}
