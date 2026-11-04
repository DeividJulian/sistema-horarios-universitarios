import { HttpErrorResponse, HttpInterceptorFn, HttpRequest, HttpResponse } from '@angular/common/http';
import { delay, of, throwError } from 'rxjs';

import { API_URL } from '../api-url';
import type { CodeSent, ErrorOut, GenerationOut, MessageOut } from '../generated';
import {
  MOCK_ADMIN,
  MOCK_AI_STATUS,
  MOCK_AVAILABILITY,
  MOCK_CANCELLATIONS,
  MOCK_CLASSROOMS,
  MOCK_CONFLICTS,
  MOCK_GROUPS,
  MOCK_NOTIFICATIONS,
  MOCK_READINESS,
  MOCK_REGISTER_GROUPS,
  MOCK_SCHEDULE,
  MOCK_STATISTICS,
  MOCK_SUBJECTS,
  MOCK_TEACHERS,
  mockToken,
} from './fixtures';

/** The code that the mock "emails". */
export const MOCK_CODE = '123456';

const READS: Record<string, unknown> = {
  '/health': { estado: 'ok', base_de_datos: 'mock' },
  '/auth/me': MOCK_ADMIN,
  '/auth/register-options': MOCK_REGISTER_GROUPS,
  '/teachers': MOCK_TEACHERS,
  '/classrooms': MOCK_CLASSROOMS,
  '/groups': MOCK_GROUPS,
  '/subjects': MOCK_SUBJECTS,
  '/schedules': MOCK_SCHEDULE,
  '/cancellations': MOCK_CANCELLATIONS,
  '/notifications': MOCK_NOTIFICATIONS,
  '/statistics': MOCK_STATISTICS,
  '/conflicts': MOCK_CONFLICTS,
  '/diagnostics': MOCK_READINESS,
  '/seed/backup': { existe: false },
  '/users': [MOCK_ADMIN],
  '/ai/status': MOCK_AI_STATUS,
};

const ok = (body: unknown, status = 200) => of(new HttpResponse({ status, body })).pipe(delay(150));
const fail = (status: number, detail: string, url: string) =>
  throwError(() => new HttpErrorResponse({ status, error: { detail } satisfies ErrorOut, url })).pipe(delay(150));

function answer(request: HttpRequest<unknown>, path: string) {
  const body = (request.body ?? {}) as Record<string, unknown>;
  if (request.method === 'GET') {
    if (path in READS) return ok(READS[path]);
    if (/^\/availability\/\d+$/.test(path)) {
      const id = Number(path.split('/')[2]);
      return ok(MOCK_AVAILABILITY.filter((a) => a.profesor_id === id));
    }
    return fail(404, `No hay mock para GET ${path}`, request.url);
  }
  if (path === '/auth/login' || path === '/auth/register') {
    return ok({ mensaje: `Código de prueba: ${MOCK_CODE}`, email: String(body['email'] ?? '') } satisfies CodeSent, path === '/auth/register' ? 201 : 200);
  }
  if (path === '/auth/verify') {
    return body['codigo'] === MOCK_CODE ? ok(mockToken()) : fail(400, `Código incorrecto. En el modo mock el código es ${MOCK_CODE}.`, request.url);
  }
  if (path === '/schedules/generate') {
    return ok({ mensaje: 'Horario generado (mock)', total_bloques: MOCK_SCHEDULE.length, optimizacion: null } satisfies GenerationOut);
  }
  if (path.startsWith('/ai/')) return fail(503, 'La IA no está disponible en el modo mock.', request.url);
  if (request.method === 'DELETE') return ok({ mensaje: 'Eliminado (mock)' } satisfies MessageOut);
  // Creating or editing: the mock answers with what was sent, as the backend would after saving it
  const id = Number(path.split('/').find((part) => /^\d+$/.test(part)) ?? Date.now() % 100000);
  return ok({ id, ...body }, request.method === 'POST' ? 201 : 200);
}

/**
 * Answers the API from typed fixtures instead of the backend (`npm run start:mock`), to work on the frontend
 * without a server. Only registered when environment.mockApi is true.
 */
export const mockApiInterceptor: HttpInterceptorFn = (request, next) => {
  if (!request.url.startsWith(API_URL)) return next(request);
  const path = new URL(request.url).pathname;
  return answer(request, path);
};
