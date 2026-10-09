import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { NotificationService } from '../../../core/services/notification.service';
import { CatalogStore } from '../../../core/state/catalog.store';
import { StateMessage } from '../../../shared/state-message/state-message';

@Component({
  selector: 'app-management-page',
  imports: [RouterLink, RouterLinkActive, RouterOutlet, StateMessage],
  templateUrl: './management-page.html',
  styleUrl: './management-page.css',
})
export class ManagementPage {
  protected readonly store = inject(CatalogStore);
  private readonly notify = inject(NotificationService);

  protected readonly tabs = [
    { path: 'profesores', label: 'Profesores' },
    { path: 'aulas', label: 'Aulas' },
    { path: 'grupos', label: 'Grupos' },
    { path: 'materias', label: 'Materias' },
    { path: 'usuarios', label: 'Usuarios' },
  ];

  constructor() {
    if (!this.store.loaded()) this.reload();
  }

  protected reload(): void {
    this.store.load().subscribe({
      error: (err) => this.notify.apiError(err, 'No se pudieron cargar los datos.'),
    });
  }
}
