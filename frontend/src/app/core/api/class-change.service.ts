import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { Cancellation, ScheduleEntry, ScheduleNotice } from '../models';
import { API_URL, ApiMessage } from './api-url';

/** What a teacher can change in their own classes, and the notices the students receive. */
@Injectable({ providedIn: 'root' })
export class ClassChangeService {
  private readonly http = inject(HttpClient);

  cancellations(): Observable<Cancellation[]> {
    return this.http.get<Cancellation[]>(`${API_URL}/cancellations`);
  }

  cancel(entryId: number, fecha: string, motivo: string): Observable<Cancellation> {
    return this.http.post<Cancellation>(`${API_URL}/schedules/${entryId}/cancellations`, { fecha, motivo });
  }

  restore(cancellationId: number): Observable<ApiMessage> {
    return this.http.delete<ApiMessage>(`${API_URL}/cancellations/${cancellationId}`);
  }

  changeClassroom(entryId: number, classroomId: number): Observable<ScheduleEntry> {
    return this.http.patch<ScheduleEntry>(`${API_URL}/schedules/${entryId}/classroom`, { aula_id: classroomId });
  }

  notifications(): Observable<ScheduleNotice[]> {
    return this.http.get<ScheduleNotice[]>(`${API_URL}/notifications`);
  }
}
