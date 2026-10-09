import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { Subject, SubjectInput } from '../models';
import { API_URL, ApiMessage } from './api-url';

@Injectable({ providedIn: 'root' })
export class SubjectService {
  private readonly http = inject(HttpClient);
  private readonly url = `${API_URL}/subjects`;

  list(): Observable<Subject[]> {
    return this.http.get<Subject[]>(this.url);
  }

  create(data: SubjectInput): Observable<Subject> {
    return this.http.post<Subject>(this.url, data);
  }

  update(id: number, data: SubjectInput): Observable<Subject> {
    return this.http.put<Subject>(`${this.url}/${id}`, data);
  }

  delete(id: number): Observable<ApiMessage> {
    return this.http.delete<ApiMessage>(`${this.url}/${id}`);
  }
}
