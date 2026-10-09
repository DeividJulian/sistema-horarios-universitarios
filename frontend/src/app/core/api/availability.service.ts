import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { Availability, AvailabilityInput } from '../models';
import { API_URL, ApiMessage } from './api-url';

@Injectable({ providedIn: 'root' })
export class AvailabilityService {
  private readonly http = inject(HttpClient);
  private readonly url = `${API_URL}/availability`;

  listByTeacher(teacherId: number): Observable<Availability[]> {
    return this.http.get<Availability[]>(`${this.url}/${teacherId}`);
  }

  create(data: AvailabilityInput): Observable<Availability> {
    return this.http.post<Availability>(this.url, data);
  }

  delete(id: number): Observable<ApiMessage> {
    return this.http.delete<ApiMessage>(`${this.url}/${id}`);
  }
}
