import { HttpErrorResponse } from '@angular/common/http';

import { afterLoginUrl, loginErrorMessage } from './login-page';

describe('loginErrorMessage', () => {
  it('explains that there is no connection', () => {
    expect(loginErrorMessage(new HttpErrorResponse({ status: 0 }))).toContain('No hay conexión con el servidor');
  });

  it('uses the backend message (no account, wait between codes)', () => {
    const missing = new HttpErrorResponse({ status: 404, error: { detail: 'No hay una cuenta con ese correo.' } });
    expect(loginErrorMessage(missing)).toBe('No hay una cuenta con ese correo.');
    const wait = new HttpErrorResponse({ status: 429, error: { detail: 'Espera 20 segundos antes de pedir otro código.' } });
    expect(loginErrorMessage(wait)).toContain('20 segundos');
  });

  it('a 502 from our backend says the email did not go out; without a reason, the server is waking up', () => {
    const mail = new HttpErrorResponse({ status: 502, error: { detail: 'No pudimos enviar el correo.' } });
    expect(loginErrorMessage(mail)).toBe('No pudimos enviar el correo.');
    for (const status of [502, 503, 504]) {
      expect(loginErrorMessage(new HttpErrorResponse({ status }))).toContain('despertando');
    }
  });

  it('falls back to a generic message', () => {
    expect(loginErrorMessage(new Error('boom'))).toBe('No se pudo enviar el código. Intenta de nuevo.');
  });
});

describe('afterLoginUrl', () => {
  it('returns to the page the user wanted, never to another site or the login', () => {
    expect(afterLoginUrl('/analisis')).toBe('/analisis');
    expect(afterLoginUrl(undefined)).toBe('/horario');
    expect(afterLoginUrl('//malo.com')).toBe('/horario');
    expect(afterLoginUrl('https://malo.com')).toBe('/horario');
    expect(afterLoginUrl('/login')).toBe('/horario');
  });
});
