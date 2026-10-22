import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { API_URL } from '../../../core/api/api-url';
import { CodeStep, cleanCode, inboxFor } from './code-step';

function fakeToken(expSeconds: number): string {
  return `header.${btoa(JSON.stringify({ sub: '1', exp: expSeconds })).replace(/=+$/, '')}.signature`;
}

const USER = { id: 1, nombre: 'Laura Gómez', email: 'laura@ucc.edu.co', rol: 'profesor', verificado: true };

function setup() {
  TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])] });
  const fixture = TestBed.createComponent(CodeStep);
  fixture.componentRef.setInput('email', 'laura@ucc.edu.co');
  return { fixture, backend: TestBed.inject(HttpTestingController), page: fixture.nativeElement as HTMLElement };
}

function type(page: HTMLElement, value: string) {
  const input = page.querySelector<HTMLInputElement>('input#code')!;
  input.value = value;
  input.dispatchEvent(new Event('input'));
}

describe('CodeStep', () => {
  beforeEach(() => localStorage.clear());

  it('sends the code by itself once the six digits are pasted', async () => {
    const { fixture, backend, page } = setup();
    await fixture.whenStable();
    let verified = false;
    fixture.componentInstance.verified.subscribe(() => (verified = true));
    type(page, 'Tu código: 123 456');
    const request = backend.expectOne(`${API_URL}/auth/verify`);
    expect(request.request.body).toEqual({ email: 'laura@ucc.edu.co', codigo: '123456' });
    request.flush({ access_token: fakeToken(Math.floor(Date.now() / 1000) + 3600), token_type: 'bearer', usuario: USER });
    expect(verified).toBe(true);
  });

  it('waits while the code is incomplete', async () => {
    const { fixture, backend, page } = setup();
    await fixture.whenStable();
    type(page, '1234');
    backend.expectNone(`${API_URL}/auth/verify`);
  });

  it('shows the reason of a wrong code and clears the field', async () => {
    const { fixture, backend, page } = setup();
    await fixture.whenStable();
    type(page, '000000');
    backend
      .expectOne(`${API_URL}/auth/verify`)
      .flush({ detail: 'Código incorrecto. Te quedan 4 intentos.' }, { status: 400, statusText: 'Bad Request' });
    await fixture.whenStable();
    expect(page.textContent).toContain('Te quedan 4 intentos');
    expect(page.querySelector<HTMLInputElement>('input#code')!.value).toBe('');
  });

  it('counts down 30 seconds before allowing to resend, then resends and focuses the field', () => {
    vi.useFakeTimers();
    const { fixture, backend, page } = setup();
    fixture.detectChanges();
    expect(page.textContent).toContain('Reenviar en 30 s');
    vi.advanceTimersByTime(30_000);
    fixture.detectChanges();
    type(page, '12');
    [...page.querySelectorAll<HTMLButtonElement>('button')].find((b) => b.textContent?.includes('Reenviar código'))!.click();
    backend.expectOne(`${API_URL}/auth/login`).flush({ mensaje: 'ok', email: 'laura@ucc.edu.co' });
    fixture.detectChanges();
    const input = page.querySelector<HTMLInputElement>('input#code')!;
    expect(input.value).toBe('');
    expect(document.activeElement).toBe(input);
    expect(page.textContent).toContain('Reenviar en 30 s');
    vi.useRealTimers();
  });
});

describe('cleanCode', () => {
  it('keeps only six digits', () => {
    expect(cleanCode(' 12-34 56 78')).toBe('123456');
  });
});

describe('inboxFor', () => {
  it('opens the inbox of the usual providers', () => {
    expect(inboxFor('deivid+profe@gmail.com')?.label).toBe('Abrir Gmail');
    expect(inboxFor('ana@hotmail.com')?.label).toBe('Abrir Outlook');
    expect(inboxFor('ana@ucc.edu.co')).toBeNull();
  });
});
