import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree, provideRouter } from '@angular/router';

import { API_URL } from '../api/api-url';
import { LoginResponse } from '../models';
import { adminGuard, authGuard, guestGuard } from './auth.guards';
import { authInterceptor } from './auth.interceptor';
import { AuthService, tokenExpiry } from './auth.service';

/** Unsigned JWT with the given expiry (the frontend only reads the payload). */
function fakeToken(expSeconds: number): string {
  const payload = btoa(JSON.stringify({ sub: '1', exp: expSeconds })).replace(/=+$/, '');
  return `header.${payload}.signature`;
}

const inOneHour = () => Math.floor(Date.now() / 1000) + 3600;

function loginResponse(rol: 'admin' | 'usuario'): LoginResponse {
  return {
    access_token: fakeToken(inOneHour()),
    token_type: 'bearer',
    usuario: { id: 1, nombre: 'Ana Pérez', email: 'ana@ucc.edu.co', rol },
  };
}

describe('tokenExpiry', () => {
  it('reads exp from the JWT payload', () => {
    expect(tokenExpiry(fakeToken(1234))).toBe(1234);
  });

  it('returns 0 for anything that is not a JWT', () => {
    expect(tokenExpiry('basura')).toBe(0);
  });
});

describe('authentication', () => {
  let http: HttpClient;
  let backend: HttpTestingController;
  let auth: AuthService;

  const runGuard = (guard: typeof authGuard, url = '/horario') =>
    TestBed.runInInjectionContext(() => guard({} as ActivatedRouteSnapshot, { url } as RouterStateSnapshot));

  function signIn(rol: 'admin' | 'usuario'): void {
    auth.login('ana@ucc.edu.co', 'secreta').subscribe();
    backend.expectOne(`${API_URL}/auth/login`).flush(loginResponse(rol));
  }

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(AuthService);
  });

  afterEach(() => backend.verify());

  it('keeps the user and role after signing in, and remembers the session', () => {
    signIn('admin');
    expect(auth.isLoggedIn()).toBe(true);
    expect(auth.isAdmin()).toBe(true);
    expect(auth.user()?.nombre).toBe('Ana Pérez');
    expect(localStorage.getItem('horarios.sesion')).toContain('Ana Pérez');
  });

  it('sends the token to the API but not on the login request itself', () => {
    signIn('usuario');
    http.get(`${API_URL}/teachers`).subscribe();
    const request = backend.expectOne(`${API_URL}/teachers`);
    expect(request.request.headers.get('Authorization')).toBe(`Bearer ${auth.token()}`);
    request.flush([]);
  });

  it('signs out when the backend answers 401', () => {
    signIn('admin');
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    http.get(`${API_URL}/teachers`).subscribe({ error: () => undefined });
    backend.expectOne(`${API_URL}/teachers`).flush({ detail: 'expirada' }, { status: 401, statusText: 'Unauthorized' });
    expect(auth.isLoggedIn()).toBe(false);
    expect(localStorage.getItem('horarios.sesion')).toBeNull();
    expect(navigate).toHaveBeenCalledWith(['/login'], expect.anything());
  });

  it('guards: without a session every page sends to the login, remembering where the user was going', () => {
    const result = runGuard(authGuard, '/analisis') as UrlTree;
    expect(result.toString()).toBe('/login?volver=%2Fanalisis');
    expect(runGuard(guestGuard)).toBe(true);
  });

  it('guards: a read-only user cannot open Gestión', () => {
    signIn('usuario');
    expect(runGuard(authGuard)).toBe(true);
    expect((runGuard(adminGuard) as UrlTree).toString()).toBe('/horario');
    expect((runGuard(guestGuard) as UrlTree).toString()).toBe('/horario');
  });

  it('guards: an administrator can open Gestión', () => {
    signIn('admin');
    expect(runGuard(adminGuard)).toBe(true);
  });
});
