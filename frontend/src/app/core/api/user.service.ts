import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { User, UserInput } from '../models';
import { API_URL, ApiMessage } from './api-url';

/** Accounts that can sign in (administrators only). */
@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly http = inject(HttpClient);
  private readonly url = `${API_URL}/users`;

  list(): Observable<User[]> {
    return this.http.get<User[]>(this.url);
  }

  create(data: UserInput): Observable<User> {
    return this.http.post<User>(this.url, data);
  }

  delete(id: number): Observable<ApiMessage> {
    return this.http.delete<ApiMessage>(`${this.url}/${id}`);
  }
}
