import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { API_URL } from '../api/api-url';
import { AuthService } from '../auth/auth.service';
import { Statistics } from '../models';
import { OptimizationStore } from './optimization.store';

function stats(required: number, scheduled: number): Statistics {
  return {
    totales: { profesores: 1, aulas: 1, grupos: 1, materias: 1, bloques_programados: scheduled },
    cumplimiento: { horas_requeridas: required, horas_programadas: scheduled, porcentaje: (scheduled / required) * 100 },
    ocupacion_aulas: [],
    carga_profesores: [],
  } as unknown as Statistics;
}

describe('OptimizationStore', () => {
  let store: OptimizationStore;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()] });
    vi.spyOn(TestBed.inject(AuthService), 'hasRole').mockReturnValue(true);
    store = TestBed.inject(OptimizationStore);
    http = TestBed.inject(HttpTestingController);
  });

  function load(required: number, scheduled: number, conflicts: { tipo: string; horario_ids: number[] }[]) {
    store.refresh();
    http.expectOne(`${API_URL}/statistics`).flush(stats(required, scheduled));
    http.expectOne(`${API_URL}/conflicts`).flush({ total: conflicts.length, hay_conflictos: conflicts.length > 0, conflictos: conflicts });
  }

  it('is 100 % and optimized when every hour is scheduled without conflicts', () => {
    load(20, 20, []);
    expect(store.efficiency()).toBe(100);
    expect(store.status()).toBe('optimizado');
    expect(store.checks().every((c) => c.ok)).toBe(true);
  });

  it('discounts the blocks that have conflicts and flags the broken constraints', () => {
    load(20, 20, [
      { tipo: 'cruce_aula', horario_ids: [1, 2] },
      { tipo: 'fuera_de_disponibilidad', horario_ids: [2] },
    ]);
    expect(store.efficiency()).toBe(90); // 18 clean blocks of 20
    expect(store.status()).toBe('con-conflictos');
    const byLabel = Object.fromEntries(store.checks().map((c) => [c.label, c]));
    expect(byLabel['Aforo y tipo de aula'].value).toBe('1 problema');
    expect(byLabel['Disponibilidad docente'].ok).toBe(false);
    expect(byLabel['Grupos y jornadas'].ok).toBe(true);
  });

  it('knows when there is no schedule yet', () => {
    load(20, 0, []);
    expect(store.status()).toBe('sin-horario');
    expect(store.efficiency()).toBe(0);
  });
});
