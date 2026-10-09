import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { GenerationResult, ScheduleEntry, ScheduleEntryMove } from '../models';
import { API_URL, ApiMessage } from './api-url';

@Injectable({ providedIn: 'root' })
export class ScheduleService {
  private readonly http = inject(HttpClient);

  list(): Observable<ScheduleEntry[]> {
    return this.http.get<ScheduleEntry[]>(`${API_URL}/schedules`);
  }

  generate(): Observable<GenerationResult> {
    return this.http.post<GenerationResult>(`${API_URL}/schedules/generate`, {});
  }

  move(id: number, change: ScheduleEntryMove): Observable<ScheduleEntry> {
    return this.http.put<ScheduleEntry>(`${API_URL}/schedules/${id}`, change);
  }

  delete(id: number): Observable<ApiMessage> {
    return this.http.delete<ApiMessage>(`${API_URL}/schedules/${id}`);
  }
}
