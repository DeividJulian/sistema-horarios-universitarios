import { Component, DestroyRef, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { AuthService } from '../../../core/auth/auth.service';
import { NotificationKind } from '../../../core/models';
import { CatalogStore } from '../../../core/state/catalog.store';
import { NoticeStore } from '../../../core/state/notice.store';
import { StateMessage } from '../../../shared/state-message/state-message';

const KIND_LABELS: Record<NotificationKind, string> = {
  cancelacion: 'Clase cancelada',
  restablecida: 'Clase restablecida',
  cambio_aula: 'Cambio de aula',
  cambio_horario: 'Cambio de horario',
};

const dateTime = new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short' });

@Component({
  selector: 'app-notices-page',
  imports: [RouterLink, StateMessage],
  templateUrl: './notices-page.html',
  styleUrl: './notices-page.css',
})
export class NoticesPage {
  protected readonly notices = inject(NoticeStore);
  protected readonly auth = inject(AuthService);
  private readonly store = inject(CatalogStore);
  protected readonly kindLabels = KIND_LABELS;

  /** Notices with the group name, and whether they were new when the page opened. */
  protected readonly items = computed(() =>
    this.notices.notices().map((n) => ({
      ...n,
      group: this.store.groupsById().get(n.grupo_id)?.nombre,
      when: dateTime.format(new Date(n.creada_en)),
      unread: this.notices.isUnread(n),
    })),
  );

  constructor() {
    this.notices.refresh();
    if (!this.store.loaded()) this.store.load().subscribe({ error: () => undefined });
    // Leaving the page marks everything as read (they were all on screen)
    inject(DestroyRef).onDestroy(() => this.notices.markAllSeen());
  }
}
