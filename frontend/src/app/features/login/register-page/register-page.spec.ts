import { HttpErrorResponse } from '@angular/common/http';

import { registerErrorMessage } from './register-page';

describe('registerErrorMessage', () => {
  it('shows the backend reason (email taken, teacher not registered, account already active)', () => {
    const taken = new HttpErrorResponse({ status: 409, error: { detail: 'Ya existe una cuenta con ese correo. Inicia sesión.' } });
    expect(registerErrorMessage(taken)).toBe('Ya existe una cuenta con ese correo. Inicia sesión.');
  });

  it('explains connection problems and a sleeping server', () => {
    expect(registerErrorMessage(new HttpErrorResponse({ status: 0 }))).toContain('No hay conexión');
    expect(registerErrorMessage(new HttpErrorResponse({ status: 503 }))).toContain('despertando');
  });
});
