import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import * as z from 'zod/mini';

import { Availability, AvailabilityInput } from '../models';
import { API_URL, ApiMessage } from './api-url';
import { zAvailabilityOut, zMessageOut } from './generated/zod.gen';
import { parseResponse } from './parse';

@Injectable({ providedIn: 'root' })
export class AvailabilityService {
  private readonly http = inject(HttpClient);
  private readonly url = `${API_URL}/availability`;

  listByTeacher(teacherId: number): Observable<Availability[]> {
    return this.http.get(`${this.url}/${teacherId}`).pipe(parseResponse(z.array(zAvailabilityOut), 'GET /availability/{id}'));
  }

  create(data: AvailabilityInput): Observable<Availability> {
    return this.http.post(this.url, data).pipe(parseResponse(zAvailabilityOut, 'POST /availability'));
  }

  delete(id: number): Observable<ApiMessage> {
    return this.http.delete(`${this.url}/${id}`).pipe(parseResponse(zMessageOut, 'DELETE /availability/{id}'));
  }
}
