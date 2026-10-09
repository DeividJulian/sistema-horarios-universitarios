import { Component, effect, inject, untracked } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { AuthService } from './core/auth/auth.service';
import { TabSyncService } from './core/services/tab-sync.service';
import { TutorialService } from './core/services/tutorial.service';
import { CatalogStore } from './core/state/catalog.store';
import { ConfirmDialog } from './shared/confirm-dialog/confirm-dialog';
import { ConnectionStatus } from './shared/connection-status/connection-status';
import { NavBar } from './shared/nav-bar/nav-bar';
import { ToastContainer } from './shared/toast-container/toast-container';
import { Tutorial } from './shared/tutorial/tutorial';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, NavBar, ConnectionStatus, ToastContainer, ConfirmDialog, Tutorial],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly auth = inject(AuthService);
  private readonly store = inject(CatalogStore);
  private readonly tabSync = inject(TabSyncService);
  private readonly tutorial = inject(TutorialService);

  constructor() {
    effect(() => {
      if (this.auth.isLoggedIn()) {
        // The tutorial opens by itself the first time someone signs in on this browser
        untracked(() => this.tutorial.openIfFirstVisit());
      } else {
        // Signing out forgets the data, so the next account loads its own
        untracked(() => {
          this.tutorial.close(false);
          this.store.reset();
        });
      }
    });

    // When another tab changes the schedule (Shared Worker message), this tab reloads the data
    effect(() => {
      if (this.tabSync.remoteChanges() > 0 && untracked(() => this.auth.isLoggedIn())) {
        untracked(() => this.store.load().subscribe({ error: () => undefined }));
      }
    });
  }
}
