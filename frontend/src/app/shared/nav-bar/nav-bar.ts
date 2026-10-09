import { Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { AuthService } from '../../core/auth/auth.service';
import { ROLE_LABELS } from '../../core/models';
import { TutorialService } from '../../core/services/tutorial.service';

interface NavItem {
  path: string;
  label: string;
  adminOnly?: boolean;
}

const ITEMS: NavItem[] = [
  { path: '/horario', label: 'Horario' },
  { path: '/gestion', label: 'Gestión', adminOnly: true },
  { path: '/analisis', label: 'Análisis' },
];

@Component({
  selector: 'app-nav-bar',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './nav-bar.html',
  styleUrl: './nav-bar.css',
})
export class NavBar {
  protected readonly tutorial = inject(TutorialService);
  protected readonly auth = inject(AuthService);
  protected readonly roleLabels = ROLE_LABELS;

  /** Read-only users do not see Gestión. */
  protected readonly items = computed(() => ITEMS.filter((item) => !item.adminOnly || this.auth.isAdmin()));

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
