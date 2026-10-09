import { Component, inject } from '@angular/core';

import { ConnectionService } from '../../core/services/connection.service';
import { TabSyncService } from '../../core/services/tab-sync.service';

@Component({
  selector: 'app-connection-status',
  templateUrl: './connection-status.html',
  styleUrl: './connection-status.css',
})
export class ConnectionStatus {
  protected readonly connection = inject(ConnectionService);
  protected readonly tabSync = inject(TabSyncService);
}
