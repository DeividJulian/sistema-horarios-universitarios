import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

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

/** The login page is not shown to someone who is already signed in. */
export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return auth.isLoggedIn() ? inject(Router).createUrlTree(['/horario']) : true;
};
