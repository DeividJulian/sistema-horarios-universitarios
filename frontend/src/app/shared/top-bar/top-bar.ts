import { Component, ElementRef, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter, map } from 'rxjs';

import { AuthService } from '../../core/auth/auth.service';
import { ROLE_LABELS } from '../../core/models';
import { LayoutService } from '../../core/services/layout.service';
import { TutorialService } from '../../core/services/tutorial.service';
import { NoticeStore } from '../../core/state/notice.store';
import { ConnectionStatus } from '../connection-status/connection-status';

/** Top bar of the workspace: page title, tutorial, notices and the account menu. */
@Component({
  selector: 'app-top-bar',
  imports: [RouterLink, ConnectionStatus],
  templateUrl: './top-bar.html',
  styleUrl: './top-bar.css',
  host: { '(document:click)': 'closeMenuOutside($event)', '(document:keydown.escape)': 'menuOpen.set(false)' },
})
export class TopBar {
  protected readonly auth = inject(AuthService);
  protected readonly notices = inject(NoticeStore);
  protected readonly tutorial = inject(TutorialService);
  protected readonly layout = inject(LayoutService);
  private readonly router = inject(Router);
  private readonly host = inject(ElementRef<HTMLElement>);
  protected readonly roleLabels = ROLE_LABELS;
  protected readonly menuOpen = signal(false);
  /** "Miércoles, 21 de octubre de 2026" above the title. */
  protected readonly today = new Intl.DateTimeFormat('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    .format(new Date())
    .replace(/^./, (c) => c.toUpperCase());

  private readonly url = toSignal(
    this.router.events.pipe(
      filter((e) => e instanceof NavigationEnd),
      map(() => this.router.url),
    ),
    { initialValue: this.router.url },
  );

  protected readonly title = computed(() => {
    const url = this.url();
    const role = this.auth.role();
    if (url.startsWith('/gestion')) return 'Gestión';
    if (url.startsWith('/analisis')) return 'Análisis';
    if (url.startsWith('/avisos')) return 'Avisos';
    return role === 'profesor' ? 'Mis clases' : role === 'estudiante' ? 'Mi horario' : 'Panel del horario';
  });

  protected readonly initials = computed(() =>
    (this.auth.user()?.nombre ?? '')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0].toUpperCase())
      .join(''),
  );

  protected closeMenuOutside(event: MouseEvent): void {
    if (this.menuOpen() && !this.host.nativeElement.querySelector('.account')?.contains(event.target as Node)) {
      this.menuOpen.set(false);
    }
  }

  protected logout(): void {
    this.menuOpen.set(false);
    this.auth.logout();
  }
}
