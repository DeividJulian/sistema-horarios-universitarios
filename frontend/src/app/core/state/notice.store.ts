import { Injectable, computed, inject, signal } from '@angular/core';
import { forkJoin } from 'rxjs';

import { ClassChangeService } from '../api/class-change.service';
import { AuthService } from '../auth/auth.service';
import { Cancellation, ScheduleNotice } from '../models';

const SEEN_KEY = 'horarios.avisos-vistos';
const REFRESH_MS = 60_000;

/**
 * Notices (cancelled classes, classroom changes) and the cancellations of the coming days.
 * "Unread" is remembered per user in this browser: the id of the newest notice they have seen.
 */
@Injectable({ providedIn: 'root' })
export class NoticeStore {
  private readonly api = inject(ClassChangeService);
  private readonly auth = inject(AuthService);

  readonly notices = signal<ScheduleNotice[]>([]);
  readonly cancellations = signal<Cancellation[]>([]);
  private readonly lastSeenId = signal(0);
  private timer: ReturnType<typeof setInterval> | null = null;

  readonly unread = computed(() => this.notices().filter((n) => n.id > this.lastSeenId()).length);

  /** Cancellations per block id. */
  readonly cancellationsByEntry = computed(() => {
    const map = new Map<number, Cancellation[]>();
    for (const c of this.cancellations()) map.set(c.horario_id, [...(map.get(c.horario_id) ?? []), c]);
    return map;
  });

  /** Starts loading now and every minute (called when someone signs in). */
  start(): void {
    this.lastSeenId.set(this.readSeen());
    this.refresh();
    this.stop();
    this.timer = setInterval(() => this.refresh(), REFRESH_MS);
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  reset(): void {
    this.stop();
    this.notices.set([]);
    this.cancellations.set([]);
    this.lastSeenId.set(0);
  }

  refresh(): void {
    if (!this.auth.isLoggedIn()) return;
    forkJoin({ notices: this.api.notifications(), cancellations: this.api.cancellations() }).subscribe({
      next: ({ notices, cancellations }) => {
        this.notices.set(notices);
        this.cancellations.set(cancellations);
      },
      error: () => undefined, // not critical: the next refresh tries again
    });
  }

  isUnread(notice: ScheduleNotice): boolean {
    return notice.id > this.lastSeenId();
  }

  markAllSeen(): void {
    const newest = Math.max(0, ...this.notices().map((n) => n.id));
    this.lastSeenId.set(newest);
    try {
      localStorage.setItem(this.key(), String(newest));
    } catch {
      // Without storage the badge simply comes back after a reload
    }
  }

  private readSeen(): number {
    try {
      return Number(localStorage.getItem(this.key())) || 0;
    } catch {
      return 0;
    }
  }

  private key(): string {
    return `${SEEN_KEY}.${this.auth.user()?.id ?? 0}`;
  }
}
