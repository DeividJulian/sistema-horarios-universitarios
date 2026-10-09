import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';

import { API_URL } from '../api/api-url';
import { DemoAccount, LoginResponse, Role, User } from '../models';

const SESSION_KEY = 'horarios.sesion';

interface StoredSession {
  token: string;
  user: User;
}

/** Seconds since epoch when the JWT expires, or 0 if it cannot be read. */
export function tokenExpiry(token: string): number {
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return Number(JSON.parse(atob(payload)).exp) || 0;
  } catch {
    return 0;
  }
}

function readSession(): StoredSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as StoredSession;
    // An expired token is useless: start signed out instead of failing on the first request
    return tokenExpiry(session.token) * 1000 > Date.now() ? session : null;
  } catch {
    return null;
  }
}

/** Who is signed in and with which role. The token is kept in localStorage so a reload keeps the session. */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  private readonly session = signal<StoredSession | null>(readSession());

  readonly user = computed(() => this.session()?.user ?? null);
  readonly token = computed(() => this.session()?.token ?? null);
  readonly isLoggedIn = computed(() => this.session() !== null);
  readonly role = computed<Role | null>(() => this.user()?.rol ?? null);
  readonly isAdmin = computed(() => this.role() === 'admin');
  readonly isTeacher = computed(() => this.role() === 'profesor');
  readonly isStudent = computed(() => this.role() === 'estudiante');

  hasRole(...roles: Role[]): boolean {
    const role = this.role();
    return role !== null && roles.includes(role);
  }

  login(email: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${API_URL}/auth/login`, { email, password }).pipe(
      tap((response) => this.store({ token: response.access_token, user: response.usuario })),
    );
  }

  /** Clears the session and goes back to the login screen (keeping where the user was, to return after signing in). */
  logout(returnUrl?: string): void {
    this.store(null);
    this.router.navigate(['/login'], returnUrl ? { queryParams: { volver: returnUrl } } : {});
  }

  /** Test accounts for every role, shown as buttons on the login page (public endpoint). */
  demoAccounts(): Observable<DemoAccount[]> {
    return this.http.get<DemoAccount[]>(`${API_URL}/auth/demo-accounts`);
  }

  changePassword(actual: string, nueva: string): Observable<unknown> {
    return this.http.post(`${API_URL}/auth/change-password`, { actual, nueva });
  }

  /** Wakes the backend up (Render's free tier sleeps) while the user types; /health is public. */
  ping(): Observable<unknown> {
    return this.http.get(`${API_URL}/health`);
  }

  private store(session: StoredSession | null): void {
    this.session.set(session);
    try {
      if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      else localStorage.removeItem(SESSION_KEY);
    } catch {
      // Storage blocked: the session still lives until the tab is closed
    }
  }
}
