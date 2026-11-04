import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import * as z from 'zod/mini';

import { StudentGroup, StudentGroupInput } from '../models';
import { API_URL, ApiMessage } from './api-url';
import { zGroupOut, zMessageOut } from './generated/zod.gen';
import { parseResponse } from './parse';

@Injectable({ providedIn: 'root' })
export class StudentGroupService {
  private readonly http = inject(HttpClient);
  private readonly url = `${API_URL}/groups`;

  list(): Observable<StudentGroup[]> {
    return this.http.get(this.url).pipe(parseResponse(z.array(zGroupOut), 'GET /groups'));
  }

  create(data: StudentGroupInput): Observable<StudentGroup> {
    return this.http.post(this.url, data).pipe(parseResponse(zGroupOut, 'POST /groups'));
  }

  update(id: number, data: StudentGroupInput): Observable<StudentGroup> {
    return this.http.put(`${this.url}/${id}`, data).pipe(parseResponse(zGroupOut, 'PUT /groups/{id}'));
  }

  delete(id: number): Observable<ApiMessage> {
    return this.http.delete(`${this.url}/${id}`).pipe(parseResponse(zMessageOut, 'DELETE /groups/{id}'));
  }
}
