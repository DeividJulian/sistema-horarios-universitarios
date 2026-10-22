import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, map, tap } from 'rxjs';

import { API_URL } from '../api/api-url';
import { CodeSent, LoginResponse, RegisterGroup, RegisterInput, Role, User } from '../models';

const SESSION_KEY = 'horarios.sesion';
/** Prefix of the Service Worker cache that keeps API answers for offline use (public/sw.js). */
const API_CACHE_PREFIX = 'schedule-api-';

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

/** Data the Service Worker saved for offline use belongs to the user who signed out: it must not survive. */
export async function clearApiCache(): Promise<void> {
  try {
    if (typeof caches === 'undefined') return;
    const names = await caches.keys();
    await Promise.all(names.filter((name) => name.startsWith(API_CACHE_PREFIX)).map((name) => caches.delete(name)));
  } catch {
    // No Cache Storage (private mode, old browser): nothing to clear
  }
}

/**
 * Passwordless session: the person asks for a six-digit code by email and trades it for a token.
 * The token is kept in localStorage so a reload keeps the session.
 */
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

  constructor() {
    // Signing out (or in) in one tab is reflected in the others
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (event) => {
        if (event.key === SESSION_KEY) this.session.set(readSession());
      });
    }
  }

  hasRole(...roles: Role[]): boolean {
    const role = this.role();
    return role !== null && roles.includes(role);
  }

  /** Student sign-up: creates the account and emails a code to activate it. */
  register(data: RegisterInput): Observable<CodeSent> {
    return this.http.post<CodeSent>(`${API_URL}/auth/register`, data);
  }

  /** Emails a code to enter (also used to resend the sign-up code). */
  requestCode(email: string): Observable<CodeSent> {
    return this.http.post<CodeSent>(`${API_URL}/auth/login`, { email });
  }

  /** Trades the emailed code for a session. */
  verify(email: string, codigo: string): Observable<User> {
    return this.http.post<LoginResponse>(`${API_URL}/auth/verify`, { email, codigo }).pipe(
      tap((response) => {
        void clearApiCache();
        this.store({ token: response.access_token, user: response.usuario });
      }),
      map((response) => response.usuario),
    );
  }

  /** On opening the app: confirms with the server that the saved session is still valid and refreshes the user. */
  refreshProfile(): void {
    const session = this.session();
    if (!session) return;
    // A 401 is handled by the interceptor, which closes the session
    this.http.get<User>(`${API_URL}/auth/me`).subscribe({
      next: (user) => {
        if (this.session()?.token === session.token) this.store({ token: session.token, user });
      },
      error: () => undefined,
    });
  }

  /** Groups a student can choose when signing up (public endpoint). */
  registerOptions(): Observable<RegisterGroup[]> {
    return this.http.get<RegisterGroup[]>(`${API_URL}/auth/register-options`);
  }

  /** Clears the session and goes back to the login screen (keeping where the user was, to return after signing in). */
  logout(returnUrl?: string): void {
    this.store(null);
    void clearApiCache();
    this.router.navigate(['/login'], returnUrl ? { queryParams: { volver: returnUrl } } : {});
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
