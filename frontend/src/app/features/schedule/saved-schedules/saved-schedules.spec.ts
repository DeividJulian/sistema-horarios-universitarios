import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { API_URL } from '../../../core/api/api-url';
import { AuthService } from '../../../core/auth/auth.service';
import { SavedSchedule } from '../../../core/models';
import { ConfirmService } from '../../../core/services/confirm.service';
import { SavedSchedules } from './saved-schedules';

const MAIN: SavedSchedule = { id: 1, nombre: 'Horario principal', activo: true, total_bloques: 20, creado_en: '2026-11-01T12:00:00+00:00' };
const OTHER: SavedSchedule = { id: 2, nombre: 'Propuesta B', activo: false, total_bloques: 18, creado_en: '2026-11-10T12:00:00+00:00' };

function setup(admin: boolean) {
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      { provide: AuthService, useValue: { isAdmin: signal(admin) } },
      { provide: ConfirmService, useValue: { ask: () => Promise.resolve(true) } },
    ],
  });
  const backend = TestBed.inject(HttpTestingController);
  const fixture = TestBed.createComponent(SavedSchedules);
  fixture.detectChanges();
  backend.expectOne(`${API_URL}/saved-schedules`).flush([MAIN, OTHER]);
  fixture.detectChanges();
  return { fixture, backend, page: fixture.nativeElement as HTMLElement };
}

const button = (page: HTMLElement, text: string) =>
  [...page.querySelectorAll<HTMLButtonElement>('button')].find((b) => b.textContent?.includes(text));

describe('SavedSchedules', () => {
  it('everyone sees the active schedule, but only the administrator gets the buttons', () => {
    const { page } = setup(false);
    expect(page.textContent).toContain('Horario activo: Horario principal');
    expect(page.textContent).toContain('Propuesta B');
    expect(page.querySelector('form')).toBeNull();
    expect(button(page, 'Activar')).toBeUndefined();
    expect(button(page, 'Eliminar')).toBeUndefined();
  });

  it('the administrator creates a new schedule with a name and the page is told to reload', async () => {
    const { fixture, backend, page } = setup(true);
    let changed = 0;
    fixture.componentInstance.changed.subscribe(() => changed++);

    const input = page.querySelector<HTMLInputElement>('form input')!;
    input.value = 'Semestre 2026-2';
    input.dispatchEvent(new Event('input'));
    page.querySelector('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();

    const request = backend.expectOne(`${API_URL}/saved-schedules`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ nombre: 'Semestre 2026-2' });
    request.flush({ mensaje: 'Horario «Semestre 2026-2» creado y activo', horario: { ...MAIN, id: 3, nombre: 'Semestre 2026-2' }, optimizacion: null });
    backend.expectOne(`${API_URL}/saved-schedules`).flush([{ ...MAIN, activo: false }, OTHER, { ...MAIN, id: 3, nombre: 'Semestre 2026-2' }]);
    expect(changed).toBe(1);
  });

  it('the administrator activates a saved schedule', async () => {
    const { fixture, backend, page } = setup(true);
    button(page, 'Activar')!.click();
    await fixture.whenStable();
    backend
      .expectOne(`${API_URL}/saved-schedules/2/activate`)
      .flush({ mensaje: 'Ahora el horario activo es «Propuesta B»', horario: { ...OTHER, activo: true }, bloques_omitidos: 0 });
    backend.expectOne(`${API_URL}/saved-schedules`).flush([{ ...MAIN, activo: false }, { ...OTHER, activo: true }]);
    fixture.detectChanges();
    expect(page.textContent).toContain('Horario activo: Propuesta B');
  });
});
