import { Component, computed, inject, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';

import { AuthService } from '../../../core/auth/auth.service';
import { ScheduleEntry, relativeTime } from '../../../core/models';
import { NoticeStore } from '../../../core/state/notice.store';
import { OptimizationStore } from '../../../core/state/optimization.store';

interface Check {
  label: string;
  ok: boolean;
  value: string;
}

const RING_RADIUS = 34;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;

/**
 * Bento grid at the top of the schedule: a hero card with a percentage ring, a checklist and a quick action.
 * Administrators and read-only users see the faculty; teachers and students see their own week.
 */
@Component({
  selector: 'app-bento-overview',
  imports: [RouterLink],
  templateUrl: './bento-overview.html',
  styleUrl: './bento-overview.css',
})
export class BentoOverview {
  protected readonly auth = inject(AuthService);
  protected readonly optimization = inject(OptimizationStore);
  protected readonly notices = inject(NoticeStore);

  /** Classes the person sees (all of them, or their own). */
  readonly entries = input.required<ScheduleEntry[]>();
  /** Of those, how many are cancelled in the days shown. */
  readonly cancelled = input(0);
  /** Whether the catalog finished loading (otherwise the cards show skeletons). */
  readonly ready = input(false);
  readonly analyze = output<void>();

  protected readonly faculty = computed(() => this.auth.hasRole('admin', 'usuario'));
  protected readonly ringLength = RING_LENGTH;

  /** Percentage shown in the ring: schedule efficiency, or the share of my classes that are not cancelled. */
  protected readonly percent = computed(() => {
    if (this.faculty()) return this.optimization.efficiency();
    const total = this.entries().length;
    return total === 0 ? 0 : ((total - this.cancelled()) / total) * 100;
  });

  protected readonly ringOffset = computed(() => RING_LENGTH * (1 - Math.min(100, this.percent()) / 100));

  protected readonly percentText = computed(() => `${this.percent().toLocaleString('es-CO', { maximumFractionDigits: 1 })}`);

  protected readonly conflictCount = computed(() => {
    if (this.faculty()) return this.optimization.conflicts().length;
    const mine = new Set(this.entries().map((e) => e.id));
    return this.optimization.conflicts().filter((c) => c.horario_ids.some((id) => mine.has(id))).length;
  });

  protected readonly loading = computed(() => !this.ready() || (this.faculty() && !this.optimization.loaded()));

  /** Teachers and students: the state of their own classes. */
  protected readonly personalChecks = computed<Check[]>(() => {
    const checks: Check[] = [];
    if (this.auth.isTeacher()) {
      const conflicts = this.conflictCount();
      checks.push({ label: 'Clases sin cruces', ok: conflicts === 0, value: conflicts === 0 ? 'Correcto' : `${conflicts} conflictos` });
    }
    checks.push(
      { label: 'Aula asignada', ok: this.entries().length > 0, value: this.entries().length > 0 ? 'Todas' : 'Sin clases' },
      { label: 'Cancelaciones próximas', ok: this.cancelled() === 0, value: this.cancelled() === 0 ? 'Ninguna' : String(this.cancelled()) },
      { label: 'Avisos sin leer', ok: this.notices.unread() === 0, value: this.notices.unread() === 0 ? 'Al día' : String(this.notices.unread()) },
    );
    return checks;
  });

  protected readonly lastRunText = computed(() => {
    const last = this.optimization.lastRun();
    return last ? relativeTime(last) : 'Sin registro en este navegador';
  });

  protected readonly hours = computed(() => this.optimization.stats()?.cumplimiento);
}
