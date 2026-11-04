import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import * as z from 'zod/mini';

import { Classroom, ClassroomInput } from '../models';
import { API_URL, ApiMessage } from './api-url';
import { zClassroomOut, zMessageOut } from './generated/zod.gen';
import { parseResponse } from './parse';

@Injectable({ providedIn: 'root' })
export class ClassroomService {
  private readonly http = inject(HttpClient);
  private readonly url = `${API_URL}/classrooms`;

  list(): Observable<Classroom[]> {
    return this.http.get(this.url).pipe(parseResponse(z.array(zClassroomOut), 'GET /classrooms'));
  }

  create(data: ClassroomInput): Observable<Classroom> {
    return this.http.post(this.url, data).pipe(parseResponse(zClassroomOut, 'POST /classrooms'));
  }

  update(id: number, data: ClassroomInput): Observable<Classroom> {
    return this.http.put(`${this.url}/${id}`, data).pipe(parseResponse(zClassroomOut, 'PUT /classrooms/{id}'));
  }

  delete(id: number): Observable<ApiMessage> {
    return this.http.delete(`${this.url}/${id}`).pipe(parseResponse(zMessageOut, 'DELETE /classrooms/{id}'));
  }
}
