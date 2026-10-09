import { Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { AuthService } from '../../core/auth/auth.service';
import { ROLE_LABELS, Role } from '../../core/models';
import { TutorialService } from '../../core/services/tutorial.service';
import { NoticeStore } from '../../core/state/notice.store';
import { PasswordDialog } from '../password-dialog/password-dialog';

interface NavItem {
  path: string;
  label: string;
  /** Roles that see the item (all of them when missing). */
  roles?: Role[];
  /** Shows the number of unread notices. */
  badge?: boolean;
}

@Component({
  selector: 'app-nav-bar',
  imports: [RouterLink, RouterLinkActive, PasswordDialog],
  templateUrl: './nav-bar.html',
  styleUrl: './nav-bar.css',
})
export class NavBar {
  protected readonly tutorial = inject(TutorialService);
  protected readonly auth = inject(AuthService);
  protected readonly notices = inject(NoticeStore);
  protected readonly roleLabels = ROLE_LABELS;

  protected readonly items = computed<NavItem[]>(() => {
    const role = this.auth.role();
    const all: NavItem[] = [
      { path: '/horario', label: role === 'profesor' ? 'Mis clases' : role === 'estudiante' ? 'Mi horario' : 'Horario' },
      { path: '/gestion', label: 'Gestión', roles: ['admin'] },
      { path: '/analisis', label: 'Análisis', roles: ['admin', 'usuario'] },
      { path: '/avisos', label: 'Avisos', badge: true },
    ];
    return all.filter((item) => !item.roles || (role !== null && item.roles.includes(role)));
  });

  protected readonly initials = computed(() =>
    (this.auth.user()?.nombre ?? '')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0].toUpperCase())
      .join(''),
  );

  protected logout(): void {
    this.auth.logout();
  }
}
