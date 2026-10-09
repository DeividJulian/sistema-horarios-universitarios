import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { Role } from '../models';
import { NotificationService } from '../services/notification.service';
import { AuthService } from './auth.service';

/** Pages that need a session: without one, go to the login and come back afterwards. */
export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  return auth.isLoggedIn() ? true : inject(Router).createUrlTree(['/login'], { queryParams: { volver: state.url } });
};

/** Pages only for administrators (data management). */
export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  if (auth.isAdmin()) return true;
  inject(NotificationService).info('Esa sección es solo para administradores.');
  return inject(Router).createUrlTree(['/horario']);
};

/** Pages for some roles only (for example Análisis is not for teachers or students). */
export function roleGuard(...roles: Role[]): CanActivateFn {
  return () => {
    const auth = inject(AuthService);
    if (auth.hasRole(...roles)) return true;
    inject(NotificationService).info('Esa sección no está disponible para tu rol.');
    return inject(Router).createUrlTree(['/horario']);
  };
}

/** The login page is not shown to someone who is already signed in. */
export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return auth.isLoggedIn() ? inject(Router).createUrlTree(['/horario']) : true;
};
