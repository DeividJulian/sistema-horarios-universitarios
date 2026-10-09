import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

import { API_URL } from '../api/api-url';
import { NotificationService } from '../services/notification.service';
import { AuthService } from './auth.service';

/**
 * - Sends the session token to the backend on every API request.
 * - If the backend answers 401 (expired or invalid session), signs out and goes to the login screen.
 */
export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const notify = inject(NotificationService);

  const token = auth.token();
  const isApi = request.url.startsWith(API_URL);
  const isLogin = request.url.endsWith('/auth/login');

  const authorized = token && isApi && !isLogin ? request.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : request;

  return next(authorized).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && error.status === 401 && isApi && !isLogin && auth.isLoggedIn()) {
        notify.info('Tu sesión expiró. Inicia sesión de nuevo.');
        auth.logout(router.url);
      }
      return throwError(() => error);
    }),
  );
};
