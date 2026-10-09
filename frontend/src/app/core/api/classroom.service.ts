import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { Classroom, ClassroomInput } from '../models';
import { API_URL, ApiMessage } from './api-url';

@Injectable({ providedIn: 'root' })
export class ClassroomService {
  private readonly http = inject(HttpClient);
  private readonly url = `${API_URL}/classrooms`;

  list(): Observable<Classroom[]> {
    return this.http.get<Classroom[]>(this.url);
  }

  create(data: ClassroomInput): Observable<Classroom> {
    return this.http.post<Classroom>(this.url, data);
  }

  update(id: number, data: ClassroomInput): Observable<Classroom> {
    return this.http.put<Classroom>(`${this.url}/${id}`, data);
  }

  delete(id: number): Observable<ApiMessage> {
    return this.http.delete<ApiMessage>(`${this.url}/${id}`);
  }
}
