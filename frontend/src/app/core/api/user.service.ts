import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import * as z from 'zod/mini';

import { User, UserInput } from '../models';
import { API_URL, ApiMessage } from './api-url';
import { zMessageOut, zUserOut } from './generated/zod.gen';
import { parseResponse } from './parse';

/** Accounts that can sign in (administrators only). */
@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly http = inject(HttpClient);
  private readonly url = `${API_URL}/users`;

  list(): Observable<User[]> {
    return this.http.get(this.url).pipe(parseResponse(z.array(zUserOut), 'GET /users'));
  }

  create(data: UserInput): Observable<User> {
    return this.http.post(this.url, data).pipe(parseResponse(zUserOut, 'POST /users'));
  }

  /** Moves a student to another group. */
  changeGroup(id: number, groupId: number): Observable<User> {
    return this.http.patch(`${this.url}/${id}/group`, { grupo_id: groupId }).pipe(parseResponse(zUserOut, 'PATCH /users/{id}/group'));
  }

  delete(id: number): Observable<ApiMessage> {
    return this.http.delete(`${this.url}/${id}`).pipe(parseResponse(zMessageOut, 'DELETE /users/{id}'));
  }
}
