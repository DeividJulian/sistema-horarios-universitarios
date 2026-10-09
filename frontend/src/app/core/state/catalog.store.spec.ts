import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { API_URL } from '../api/api-url';
import { ScheduleEntry } from '../models';
import { CatalogStore } from './catalog.store';

const entry: ScheduleEntry = { id: 1, materia_id: 1, aula_id: 1, dia_semana: 'Lunes', hora_inicio: '08:00:00', hora_fin: '09:00:00' };

describe('CatalogStore', () => {
  let store: CatalogStore;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    store = TestBed.inject(CatalogStore);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  function flushLoad(): void {
    http.expectOne(`${API_URL}/teachers`).flush([{ id: 1, nombre: 'Ana', email: 'ana@x.co' }]);
    http.expectOne(`${API_URL}/classrooms`).flush([{ id: 1, nombre: 'Aula 101', aforo: 40 }]);
    http.expectOne(`${API_URL}/groups`).flush([{ id: 1, nombre: '7A', num_estudiantes: 30 }]);
    http.expectOne(`${API_URL}/subjects`).flush([{ id: 1, nombre: 'Redes', intensidad_horaria: 2, grupo_id: 1, profesor_id: 1 }]);
    http.expectOne(`${API_URL}/schedules`).flush([entry]);
  }

  it('loads every resource in parallel and builds the lookup maps', () => {
    store.load().subscribe();
    expect(store.loading()).toBe(true);
    flushLoad();
    expect(store.loaded()).toBe(true);
    expect(store.loading()).toBe(false);
    expect(store.subjectsById().get(1)?.nombre).toBe('Redes');
    expect(store.entries()).toEqual([entry]);
  });

  it('keeps a readable error when loading fails', () => {
    store.load().subscribe({ error: () => undefined });
    http.expectOne(`${API_URL}/teachers`).flush(null, { status: 0, statusText: 'Unknown Error' });
    // forkJoin cancels the other four requests as soon as one fails
    expect(http.match(() => true).every((r) => r.cancelled)).toBe(true);
    expect(store.loadError()).toContain('No se pudo conectar con el servidor');
  });

  it('moves a block optimistically and rolls back when the backend rejects it', () => {
    store.load().subscribe();
    flushLoad();

    store.moveEntry(entry, 'Viernes', 15).subscribe({ error: () => undefined });
    // The block moves before the backend answers...
    expect(store.entries()[0]).toMatchObject({ dia_semana: 'Viernes', hora_inicio: '15:00:00', hora_fin: '16:00:00' });

    const request = http.expectOne(`${API_URL}/schedules/1`);
    expect(request.request.body).toEqual({ dia_semana: 'Viernes', hora_inicio: '15:00:00' });
    request.flush({ detail: 'El aula ya está ocupada en esa franja' }, { status: 409, statusText: 'Conflict' });

    // ...and goes back when the backend answers 409
    expect(store.entries()[0]).toEqual(entry);
  });

  it('adds created items and removes deleted ones without reloading', () => {
    store.load().subscribe();
    flushLoad();

    store.saveClassroom(null, { nombre: 'Sala B', aforo: 25 }).subscribe();
    http.expectOne({ method: 'POST', url: `${API_URL}/classrooms` }).flush({ id: 2, nombre: 'Sala B', aforo: 25 });
    expect(store.classrooms().map((c) => c.nombre)).toEqual(['Aula 101', 'Sala B']);

    store.deleteClassroom(1).subscribe();
    http.expectOne({ method: 'DELETE', url: `${API_URL}/classrooms/1` }).flush({ mensaje: 'Aula eliminada' });
    expect(store.classrooms().map((c) => c.nombre)).toEqual(['Sala B']);
  });

  it('reloads the schedule after deleting a subject, because its blocks are deleted too', () => {
    store.load().subscribe();
    flushLoad();

    store.deleteSubject(1).subscribe();
    http.expectOne({ method: 'DELETE', url: `${API_URL}/subjects/1` }).flush({ mensaje: 'ok' });
    http.expectOne({ method: 'GET', url: `${API_URL}/schedules` }).flush([]);
    expect(store.subjects()).toEqual([]);
    expect(store.entries()).toEqual([]);
  });
});
