import { HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { tap } from 'rxjs';

import { ConnectionService } from '../services/connection.service';
import { TabSyncService } from '../services/tab-sync.service';

// Deleting a subject also deletes its blocks, so /subjects counts as a schedule change too
const SCHEDULE_CHANGING_ROUTES = /\/(schedules|seed|subjects)/;

/**
 * - When a request changes the schedule (POST/PUT/DELETE), tells the other tabs through the Shared Worker.
 * - When the Service Worker answered with saved data, reports it to the UI.
 */
export const workersInterceptor: HttpInterceptorFn = (request, next) => {
  const tabSync = inject(TabSyncService);
  const connection = inject(ConnectionService);

  const changesSchedule = request.method !== 'GET' && SCHEDULE_CHANGING_ROUTES.test(request.url);

  return next(request).pipe(
    tap((event) => {
      if (!(event instanceof HttpResponse)) return;

      if (changesSchedule && event.ok) {
        tabSync.notifyChange(`${request.method} ${new URL(request.url, window.location.origin).pathname}`);
      }
      if (request.method === 'GET') {
        connection.markDataFromCache(event.headers.get('X-From-Cache') === '1');
      }
    }),
  );
};
