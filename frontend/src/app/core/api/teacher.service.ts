import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import * as z from 'zod/mini';

import { Teacher, TeacherInput } from '../models';
import { API_URL, ApiMessage } from './api-url';
import { zMessageOut, zTeacherOut } from './generated/zod.gen';
import { parseResponse } from './parse';

@Injectable({ providedIn: 'root' })
export class TeacherService {
  private readonly http = inject(HttpClient);
  private readonly url = `${API_URL}/teachers`;

  list(): Observable<Teacher[]> {
    return this.http.get(this.url).pipe(parseResponse(z.array(zTeacherOut), 'GET /teachers'));
  }

  create(data: TeacherInput): Observable<Teacher> {
    return this.http.post(this.url, data).pipe(parseResponse(zTeacherOut, 'POST /teachers'));
  }

  update(id: number, data: TeacherInput): Observable<Teacher> {
    return this.http.put(`${this.url}/${id}`, data).pipe(parseResponse(zTeacherOut, 'PUT /teachers/{id}'));
  }

  delete(id: number): Observable<ApiMessage> {
    return this.http.delete(`${this.url}/${id}`).pipe(parseResponse(zMessageOut, 'DELETE /teachers/{id}'));
  }
}
