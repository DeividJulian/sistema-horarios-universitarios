import { Injectable, isDevMode, signal } from '@angular/core';

/**
 * Registers the Service Worker (public/sw.js) and exposes the connection state.
 * It is not registered in development (ng serve) to avoid confusing cache behaviour.
 */
@Injectable({ providedIn: 'root' })
export class ConnectionService {
  readonly online = signal(typeof navigator === 'undefined' ? true : navigator.onLine);
  /** true when the last backend response came from the copy saved by the Service Worker. */
  readonly dataFromCache = signal(false);
  readonly serviceWorkerReady = signal(false);

  constructor() {
    if (typeof window === 'undefined') return;

    window.addEventListener('online', () => this.online.set(true));
    window.addEventListener('offline', () => this.online.set(false));
    this.registerServiceWorker();
  }

  markDataFromCache(fromCache: boolean): void {
    this.dataFromCache.set(fromCache);
  }

  private registerServiceWorker(): void {
    if (isDevMode() || !('serviceWorker' in navigator)) return;

    navigator.serviceWorker
      .register('/sw.js')
      .then(() => this.serviceWorkerReady.set(true))
      .catch(() => this.serviceWorkerReady.set(false));
  }
}
