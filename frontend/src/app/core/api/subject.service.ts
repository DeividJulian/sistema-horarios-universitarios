import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import * as z from 'zod/mini';

import { Subject, SubjectInput } from '../models';
import { API_URL, ApiMessage } from './api-url';
import { zMessageOut, zSubjectOut } from './generated/zod.gen';
import { parseResponse } from './parse';

@Injectable({ providedIn: 'root' })
export class SubjectService {
  private readonly http = inject(HttpClient);
  private readonly url = `${API_URL}/subjects`;

  list(): Observable<Subject[]> {
    return this.http.get(this.url).pipe(parseResponse(z.array(zSubjectOut), 'GET /subjects'));
  }

  create(data: SubjectInput): Observable<Subject> {
    return this.http.post(this.url, data).pipe(parseResponse(zSubjectOut, 'POST /subjects'));
  }

  update(id: number, data: SubjectInput): Observable<Subject> {
    return this.http.put(`${this.url}/${id}`, data).pipe(parseResponse(zSubjectOut, 'PUT /subjects/{id}'));
  }

  delete(id: number): Observable<ApiMessage> {
    return this.http.delete(`${this.url}/${id}`).pipe(parseResponse(zMessageOut, 'DELETE /subjects/{id}'));
  }
}
