import { Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { AuthService } from '../../core/auth/auth.service';
import { Role } from '../../core/models';
import { LayoutService } from '../../core/services/layout.service';
import { NoticeStore } from '../../core/state/notice.store';
import { OptimizationStore, ScheduleStatus } from '../../core/state/optimization.store';

interface NavItem {
  path: string;
  label: string;
  /** 24x24 stroke icon. */
  icon: string;
  /** Roles that see the item (all of them when missing). */
  roles?: Role[];
  /** Shows the number of unread notices. */
  badge?: boolean;
}

const ICONS = {
  calendar: 'M8 3v3M16 3v3M4 9h16M5 5h14v15H5z',
  chart: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  bell: 'M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10 21h4',
  teacher: 'M16 19v-1a4 4 0 0 0-8 0v1M12 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  room: 'M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6',
  group: 'M17 20v-1a4 4 0 0 0-3-3.87M7 20v-1a4 4 0 0 1 3-3.87M12 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  subject: 'M4 19V5a2 2 0 0 1 2-2h12v16H6a2 2 0 0 0-2 2zM8 7h6',
  users: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21v-1a6 6 0 0 1 12 0v1M18 8v6M21 11h-6',
};

const STATUS_LABELS: Record<ScheduleStatus, string> = {
  optimizado: 'Optimizado',
  'con-conflictos': 'Con conflictos',
  incompleto: 'Incompleto',
  'sin-horario': 'Sin horario',
};

/** Left sidebar: views, data management (administrators) and the health of the schedule. */
@Component({
  selector: 'app-nav-bar',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './nav-bar.html',
  styleUrl: './nav-bar.css',
  host: { '[class.open]': 'layout.sidebarOpen()' },
})
export class NavBar {
  protected readonly auth = inject(AuthService);
  protected readonly notices = inject(NoticeStore);
  protected readonly optimization = inject(OptimizationStore);
  protected readonly layout = inject(LayoutService);
  protected readonly statusLabels = STATUS_LABELS;

  protected readonly views = computed<NavItem[]>(() => {
    const role = this.auth.role();
    const all: NavItem[] = [
      { path: '/horario', icon: ICONS.calendar, label: role === 'profesor' ? 'Mis clases' : role === 'estudiante' ? 'Mi horario' : 'Horario' },
      { path: '/analisis', icon: ICONS.chart, label: 'Análisis', roles: ['admin', 'usuario'] },
      { path: '/avisos', icon: ICONS.bell, label: 'Avisos', badge: true },
    ];
    return all.filter((item) => !item.roles || (role !== null && item.roles.includes(role)));
  });

  /** Data management, only for administrators. */
  protected readonly management: NavItem[] = [
    { path: '/gestion/profesores', icon: ICONS.teacher, label: 'Profesores' },
    { path: '/gestion/aulas', icon: ICONS.room, label: 'Aulas' },
    { path: '/gestion/grupos', icon: ICONS.group, label: 'Grupos' },
    { path: '/gestion/materias', icon: ICONS.subject, label: 'Materias' },
    { path: '/gestion/usuarios', icon: ICONS.users, label: 'Usuarios' },
  ];

  protected efficiencyText(): string {
    return `${this.optimization.efficiency().toLocaleString('es-CO', { maximumFractionDigits: 1 })} %`;
  }
}
