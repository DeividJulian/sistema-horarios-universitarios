import { HttpErrorResponse } from '@angular/common/http';

import { registerErrorMessage } from './register-page';

describe('registerErrorMessage', () => {
  it('shows the backend reason (email taken, teacher email, missing group)', () => {
    const taken = new HttpErrorResponse({ status: 409, error: { detail: 'Ya existe una cuenta con ese correo. Inicia sesión.' } });
    expect(registerErrorMessage(taken)).toBe('Ya existe una cuenta con ese correo. Inicia sesión.');
  });

  it('explains connection problems and a sleeping server', () => {
    expect(registerErrorMessage(new HttpErrorResponse({ status: 0 }))).toContain('No hay conexión');
    expect(registerErrorMessage(new HttpErrorResponse({ status: 503 }))).toContain('despertando');
    const mail = new HttpErrorResponse({ status: 502, error: { detail: 'No pudimos enviar el correo.' } });
    expect(registerErrorMessage(mail)).toBe('No pudimos enviar el correo.');
  });
});
