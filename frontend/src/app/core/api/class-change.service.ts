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

  /** aviso: text for the students reviewed by the teacher (for example drafted by the AI); without it the server writes one. */
  cancel(entryId: number, fecha: string, motivo: string, aviso?: string): Observable<Cancellation> {
    return this.http.post<Cancellation>(`${API_URL}/schedules/${entryId}/cancellations`, aviso ? { fecha, motivo, aviso } : { fecha, motivo });
  }

  restore(cancellationId: number): Observable<ApiMessage> {
    return this.http.delete<ApiMessage>(`${API_URL}/cancellations/${cancellationId}`);
  }

  changeClassroom(entryId: number, classroomId: number, aviso?: string): Observable<ScheduleEntry> {
    const body = aviso ? { aula_id: classroomId, aviso } : { aula_id: classroomId };
    return this.http.patch<ScheduleEntry>(`${API_URL}/schedules/${entryId}/classroom`, body);
  }

  notifications(): Observable<ScheduleNotice[]> {
    return this.http.get<ScheduleNotice[]>(`${API_URL}/notifications`);
  }
}
