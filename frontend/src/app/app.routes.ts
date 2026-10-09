import { Routes } from '@angular/router';

import { adminGuard, authGuard, guestGuard } from './core/auth/auth.guards';

// Paths are what the user sees in the address bar, so they are in Spanish.
// Every page is lazy loaded: its code is only downloaded when the user opens it.
// Everything needs a session; data management (Gestión) is only for administrators.
export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'horario' },
  {
    path: 'login',
    title: 'Iniciar sesión',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/login/login-page/login-page').then((m) => m.LoginPage),
  },
  {
    path: 'horario',
    title: 'Horario',
    canActivate: [authGuard],
    loadComponent: () => import('./features/schedule/schedule-page/schedule-page').then((m) => m.SchedulePage),
  },
  {
    path: 'gestion',
    title: 'Gestión',
    canActivate: [authGuard, adminGuard],
    loadComponent: () => import('./features/management/management-page/management-page').then((m) => m.ManagementPage),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'profesores' },
      {
        path: 'profesores',
        title: 'Profesores',
        loadComponent: () => import('./features/management/teachers-section/teachers-section').then((m) => m.TeachersSection),
      },
      {
        path: 'aulas',
        title: 'Aulas',
        loadComponent: () => import('./features/management/classrooms-section/classrooms-section').then((m) => m.ClassroomsSection),
      },
      {
        path: 'grupos',
        title: 'Grupos',
        loadComponent: () => import('./features/management/groups-section/groups-section').then((m) => m.GroupsSection),
      },
      {
        path: 'materias',
        title: 'Materias',
        loadComponent: () => import('./features/management/subjects-section/subjects-section').then((m) => m.SubjectsSection),
      },
      {
        path: 'usuarios',
        title: 'Usuarios',
        loadComponent: () => import('./features/management/users-section/users-section').then((m) => m.UsersSection),
      },
    ],
  },
  {
    path: 'analisis',
    title: 'Análisis',
    canActivate: [authGuard],
    loadComponent: () => import('./features/analysis/analysis-page/analysis-page').then((m) => m.AnalysisPage),
  },
  { path: '**', redirectTo: 'horario' },
];
