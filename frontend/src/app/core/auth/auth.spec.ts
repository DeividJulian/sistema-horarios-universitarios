import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree, provideRouter } from '@angular/router';

import { API_URL } from '../api/api-url';
import { LoginResponse, Role } from '../models';
import { adminGuard, authGuard, guestGuard } from './auth.guards';
import { authInterceptor } from './auth.interceptor';
import { AuthService, tokenExpiry } from './auth.service';

/** Unsigned JWT with the given expiry (the frontend only reads the payload). */
function fakeToken(expSeconds: number): string {
  const payload = btoa(JSON.stringify({ sub: '1', exp: expSeconds })).replace(/=+$/, '');
  return `header.${payload}.signature`;
}

const inOneHour = () => Math.floor(Date.now() / 1000) + 3600;

function loginResponse(rol: Role, exp = inOneHour()): LoginResponse {
  return {
    access_token: fakeToken(exp),
    token_type: 'bearer',
    usuario: { id: 1, nombre: 'Ana Pérez', email: 'ana@ucc.edu.co', rol, verificado: true },
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

  function signIn(rol: Role): void {
    auth.verify('ana@ucc.edu.co', '123456').subscribe();
    backend.expectOne(`${API_URL}/auth/verify`).flush(loginResponse(rol));
  }

  function setup(): void {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(withInterceptors([authInterceptor])), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(AuthService);
  }

  beforeEach(() => {
    localStorage.clear();
    setup();
  });

  afterEach(() => backend.verify());

  it('asks for a code by email and trades it for a session', () => {
    auth.requestCode('ana@ucc.edu.co').subscribe();
    const request = backend.expectOne(`${API_URL}/auth/login`);
    expect(request.request.body).toEqual({ email: 'ana@ucc.edu.co' });
    request.flush({ mensaje: 'Te enviamos un código para entrar.', email: 'ana@ucc.edu.co' });
    expect(auth.isLoggedIn()).toBe(false);

    auth.verify('ana@ucc.edu.co', '123456').subscribe();
    const verify = backend.expectOne(`${API_URL}/auth/verify`);
    expect(verify.request.body).toEqual({ email: 'ana@ucc.edu.co', codigo: '123456' });
    verify.flush(loginResponse('admin'));
    expect(auth.isLoggedIn()).toBe(true);
    expect(auth.isAdmin()).toBe(true);
    expect(auth.user()?.nombre).toBe('Ana Pérez');
    expect(localStorage.getItem('horarios.sesion')).toContain('Ana Pérez');
  });

  it('signing up only sends the code: the session starts after verifying it', () => {
    auth.register({ nombre: 'Ana Pérez', email: 'ana@ucc.edu.co', grupo_id: 3 }).subscribe();
    const request = backend.expectOne(`${API_URL}/auth/register`);
    expect(request.request.body).toEqual({ nombre: 'Ana Pérez', email: 'ana@ucc.edu.co', grupo_id: 3 });
    request.flush({ mensaje: 'Te enviamos un código para activar tu cuenta.', email: 'ana@ucc.edu.co' });
    expect(auth.isLoggedIn()).toBe(false);
  });

  it('restores a saved session after a reload, but not an expired one', () => {
    signIn('usuario');
    TestBed.resetTestingModule();
    setup();
    expect(auth.isLoggedIn()).toBe(true);

    localStorage.setItem('horarios.sesion', JSON.stringify({ token: fakeToken(1), user: loginResponse('admin').usuario }));
    TestBed.resetTestingModule();
    setup();
    expect(auth.isLoggedIn()).toBe(false);
  });

  it('survives a blocked localStorage (the session lives in memory)', () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    signIn('admin');
    expect(auth.isLoggedIn()).toBe(true);
    setItem.mockRestore();
  });

  it('refreshProfile updates the user from /auth/me', () => {
    signIn('usuario');
    auth.refreshProfile();
    backend.expectOne(`${API_URL}/auth/me`).flush({ ...loginResponse('usuario').usuario, nombre: 'Ana María Pérez' });
    expect(auth.user()?.nombre).toBe('Ana María Pérez');
  });

  it('sends the token only to our API', () => {
    signIn('usuario');
    http.get(`${API_URL}/teachers`).subscribe();
    const request = backend.expectOne(`${API_URL}/teachers`);
    expect(request.request.headers.get('Authorization')).toBe(`Bearer ${auth.token()}`);
    request.flush([]);

    http.get('https://otro-sitio.com/datos').subscribe();
    const other = backend.expectOne('https://otro-sitio.com/datos');
    expect(other.request.headers.has('Authorization')).toBe(false);
    other.flush({});
  });

  it('signs out when the backend answers 401, also on /auth/me', () => {
    signIn('admin');
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    http.get(`${API_URL}/auth/me`).subscribe({ error: () => undefined });
    backend.expectOne(`${API_URL}/auth/me`).flush({ detail: 'expirada' }, { status: 401, statusText: 'Unauthorized' });
    expect(auth.isLoggedIn()).toBe(false);
    expect(localStorage.getItem('horarios.sesion')).toBeNull();
    expect(navigate).toHaveBeenCalledWith(['/login'], expect.anything());
  });

  it('a wrong code on the login screens does not close the session', () => {
    signIn('admin');
    auth.verify('ana@ucc.edu.co', '000000').subscribe({ error: () => undefined });
    backend.expectOne(`${API_URL}/auth/verify`).flush({ detail: 'Código incorrecto' }, { status: 401, statusText: 'Unauthorized' });
    expect(auth.isLoggedIn()).toBe(true);
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
