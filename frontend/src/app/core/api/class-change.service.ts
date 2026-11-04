import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import * as z from 'zod/mini';

import { Cancellation, ScheduleEntry, ScheduleNotice } from '../models';
import { API_URL, ApiMessage } from './api-url';
import { zCancellationOut, zMessageOut, zNotificationOut, zScheduleEntryOut } from './generated/zod.gen';
import { parseResponse } from './parse';

/** What a teacher can change in their own classes, and the notices the students receive. */
@Injectable({ providedIn: 'root' })
export class ClassChangeService {
  private readonly http = inject(HttpClient);

  cancellations(): Observable<Cancellation[]> {
    return this.http.get(`${API_URL}/cancellations`).pipe(parseResponse(z.array(zCancellationOut), 'GET /cancellations'));
  }

  /** aviso: text for the students reviewed by the teacher (for example drafted by the AI); without it the server writes one. */
  cancel(entryId: number, fecha: string, motivo: string, aviso?: string): Observable<Cancellation> {
    return this.http.post(`${API_URL}/schedules/${entryId}/cancellations`, aviso ? { fecha, motivo, aviso } : { fecha, motivo }).pipe(parseResponse(zCancellationOut, 'POST /schedules/{id}/cancellations'));
  }

  restore(cancellationId: number): Observable<ApiMessage> {
    return this.http.delete(`${API_URL}/cancellations/${cancellationId}`).pipe(parseResponse(zMessageOut, 'DELETE /cancellations/{id}'));
  }

  changeClassroom(entryId: number, classroomId: number, aviso?: string): Observable<ScheduleEntry> {
    const body = aviso ? { aula_id: classroomId, aviso } : { aula_id: classroomId };
    return this.http.patch(`${API_URL}/schedules/${entryId}/classroom`, body).pipe(parseResponse(zScheduleEntryOut, 'PATCH /schedules/{id}/classroom'));
  }

  notifications(): Observable<ScheduleNotice[]> {
    return this.http.get(`${API_URL}/notifications`).pipe(parseResponse(z.array(zNotificationOut), 'GET /notifications'));
  }
}
