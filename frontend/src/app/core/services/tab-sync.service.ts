import { Injectable, signal } from '@angular/core';

interface WorkerMessage {
  type: 'init' | 'tabs' | 'schedule-changed';
  total?: number;
  action?: string;
  time?: number;
  lastChange?: { action: string; time: number } | null;
}

/**
 * Connects this tab to the Shared Worker (public/shared-worker.js).
 * Every tab shares the same worker, so they learn about each other's changes.
 */
@Injectable({ providedIn: 'root' })
export class TabSyncService {
  readonly available = signal(false);
  readonly openTabs = signal(1);
  /** Goes up by one every time ANOTHER tab changes the schedule. */
  readonly remoteChanges = signal(0);
  readonly lastRemoteAction = signal<string | null>(null);

  private port: MessagePort | null = null;

  constructor() {
    this.connect();
  }

  notifyChange(action: string): void {
    this.port?.postMessage({ type: 'schedule-changed', action });
  }

  private connect(): void {
    if (typeof SharedWorker === 'undefined') return; // browser without support

    try {
      const worker = new SharedWorker('/shared-worker.js', { name: 'schedule-sync' });
      this.port = worker.port;
      this.port.onmessage = (event: MessageEvent<WorkerMessage>) => this.receive(event.data);
      this.port.start();
      this.available.set(true);

      // When the tab closes, tell the worker so the tab counter stays right
      window.addEventListener('pagehide', () => this.port?.postMessage({ type: 'disconnect' }));
    } catch {
      this.available.set(false);
    }
  }

  private receive(message: WorkerMessage): void {
    if (message.type === 'init' || message.type === 'tabs') {
      this.openTabs.set(message.total ?? 1);
    }
    if (message.type === 'schedule-changed') {
      this.lastRemoteAction.set(message.action ?? null);
      this.remoteChanges.update((n) => n + 1);
    }
  }
}
