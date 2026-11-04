import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { CatalogStore } from '../state/catalog.store';
import { CONTRACT_ERROR_MESSAGE, apiErrorMessage } from '../http/api-error';
import { API_URL } from './api-url';
import { ApiContractError, parseOrThrow } from './parse';
import { zTeacherOut } from './generated/zod.gen';
import { TeacherService } from './teacher.service';

function setup() {
  TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])] });
  return { http: TestBed.inject(HttpTestingController) };
}

describe('parse, do not just validate', () => {
  beforeEach(() => vi.spyOn(console, 'error').mockImplementation(() => undefined));

  it('a well-formed answer arrives typed, and unknown extra fields are dropped', async () => {
    const { http } = setup();
    const result = firstValueFrom(TestBed.inject(TeacherService).list());
    http.expectOne(`${API_URL}/teachers`).flush([{ id: 1, nombre: 'Ana', email: 'ana@ucc.edu.co', extra: 'x' }]);
    expect(await result).toEqual([{ id: 1, nombre: 'Ana', email: 'ana@ucc.edu.co' }]);
  });

  it('an answer with another shape is detected at the boundary, with the endpoint and the field', async () => {
    const { http } = setup();
    const result = firstValueFrom(TestBed.inject(TeacherService).list());
    // The backend renamed "nombre" and sends the id as text: `http.get<Teacher[]>` would have accepted it
    http.expectOne(`${API_URL}/teachers`).flush([{ id: '1', nombre_completo: 'Ana', email: 'ana@ucc.edu.co' }]);
    const error = await result.catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiContractError);
    expect((error as ApiContractError).endpoint).toBe('GET /teachers');
    expect((error as ApiContractError).issues.map((i) => i.path.join('.'))).toEqual(['0.id', '0.nombre']);
    expect(console.error).toHaveBeenCalled();
  });

  it('the user sees a clear message in Spanish', () => {
    const error = new ApiContractError('GET /teachers', []);
    expect(apiErrorMessage(error, 'No se pudieron cargar los profesores.')).toBe(CONTRACT_ERROR_MESSAGE);
    expect(CONTRACT_ERROR_MESSAGE).toContain('datos que la aplicación no esperaba');
  });

  it('the screen does not break: the store keeps a readable error instead of half-loaded data', async () => {
    const { http } = setup();
    const store = TestBed.inject(CatalogStore);
    const loading = firstValueFrom(store.load()).catch(() => undefined);
    http.expectOne(`${API_URL}/teachers`).flush([{ id: 1, nombre: 'Ana', email: 'ana@ucc.edu.co' }]);
    http.expectOne(`${API_URL}/classrooms`).flush([{ id: 1, nombre: 'Aula 101', aforo: 'cuarenta', tipo: 'general' }]);
    // The rest of the parallel requests are cancelled as soon as one answer is rejected
    expect(http.match(`${API_URL}/groups`).every((request) => request.cancelled)).toBe(true);
    await loading;
    expect(store.loadError()).toBe(CONTRACT_ERROR_MESSAGE);
    expect(store.classrooms()).toEqual([]);
  });

  it('parseOrThrow also guards data read from storage', () => {
    expect(() => parseOrThrow(zTeacherOut, { id: 1 }, 'localStorage')).toThrow(ApiContractError);
  });
});
