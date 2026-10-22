import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

import { API_URL } from '../api/api-url';
import { NotificationService } from '../services/notification.service';
import { AuthService } from './auth.service';

/**
 * - Sends the session token to our backend on every API request (never to other sites).
 * - If the backend answers 401 (expired or invalid session), signs out and goes to the login screen.
 */
export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const notify = inject(NotificationService);

  const token = auth.token();
  const isApi = request.url.startsWith(API_URL);
  // The login screens answer 4xx for a wrong code: that is not an expired session. /auth/me does check the session.
  const isAuthRoute = request.url.startsWith(`${API_URL}/auth/`) && !request.url.startsWith(`${API_URL}/auth/me`);

  const authorized = token && isApi ? request.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : request;

  return next(authorized).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && error.status === 401 && isApi && !isAuthRoute && auth.isLoggedIn()) {
        notify.info('Tu sesión expiró. Inicia sesión de nuevo.');
        auth.logout(router.url);
      }
      return throwError(() => error);
    }),
  );
};
