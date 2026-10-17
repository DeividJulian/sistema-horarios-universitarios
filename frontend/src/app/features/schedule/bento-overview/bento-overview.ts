import { Component, computed, inject, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';

import { AuthService } from '../../../core/auth/auth.service';
import { ScheduleEntry, relativeTime } from '../../../core/models';
import { CatalogStore } from '../../../core/state/catalog.store';
import { NoticeStore } from '../../../core/state/notice.store';
import { OptimizationStore } from '../../../core/state/optimization.store';

interface Stat {
  label: string;
  value: number;
  /** 24x24 stroke icon. */
  icon: string;
  color: string;
}

const ICONS = {
  teacher: 'M16 19v-1a4 4 0 0 0-8 0v1M12 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  classroom: 'M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6',
  group: 'M17 20v-1a4 4 0 0 0-3-3.87M7 20v-1a4 4 0 0 1 3-3.87M12 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  subject: 'M4 19V5a2 2 0 0 1 2-2h12v16H6a2 2 0 0 0-2 2zM8 7h6',
  calendar: 'M8 3v3M16 3v3M4 9h16M5 5h14v15H5z',
  cancelled: 'M5 5h14v15H5zM9 11l6 6M15 11l-6 6',
  bell: 'M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10 21h4',
};

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
  private readonly catalog = inject(CatalogStore);

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
    return last ? relativeTime(last.fecha) : 'Sin registro en este navegador';
  });

  /** Idle hours removed by the simulated annealing in the last run: "104 → 22 (−79 %)". */
  protected readonly idleText = computed(() => {
    const last = this.optimization.lastRun();
    if (last?.antes === undefined || last.despues === undefined) return null;
    const saved = last.antes > 0 ? Math.round(((last.antes - last.despues) / last.antes) * 100) : 0;
    return `${last.antes} → ${last.despues}${saved > 0 ? ` (−${saved} %)` : ''}`;
  });

  protected readonly hours = computed(() => this.optimization.stats()?.cumplimiento);

  /** «Generar» the first time, «Re-optimizar» once there is a schedule. */
  protected readonly generateLabel = computed(() =>
    this.optimization.generating() ? 'Optimizando…' : this.catalog.entries().length ? 'Re-optimizar' : 'Generar horario',
  );

  /** Totals strip under the cards (the counters the dashboard always had). */
  protected readonly stats = computed<Stat[]>(() => {
    if (this.faculty()) {
      return [
        { label: 'Profesores', value: this.catalog.teachers().length, icon: ICONS.teacher, color: '#a78bfa' },
        { label: 'Aulas', value: this.catalog.classrooms().length, icon: ICONS.classroom, color: '#60a5fa' },
        { label: 'Grupos', value: this.catalog.groups().length, icon: ICONS.group, color: '#4ade80' },
        { label: 'Materias', value: this.catalog.subjects().length, icon: ICONS.subject, color: '#f472b6' },
        { label: 'Clases programadas', value: this.catalog.entries().length, icon: ICONS.calendar, color: '#fbbf24' },
      ];
    }
    const entries = this.entries();
    const subjects = this.catalog.subjectsById();
    const stats: Stat[] = [
      { label: 'Clases a la semana', value: entries.length, icon: ICONS.calendar, color: '#fbbf24' },
      { label: 'Materias', value: new Set(entries.map((e) => e.materia_id)).size, icon: ICONS.subject, color: '#f472b6' },
    ];
    if (this.auth.isTeacher()) {
      const groups = new Set(entries.map((e) => subjects.get(e.materia_id)?.grupo_id));
      stats.push({ label: 'Grupos', value: groups.size, icon: ICONS.group, color: '#4ade80' });
    }
    stats.push(
      { label: 'Canceladas próximos días', value: this.cancelled(), icon: ICONS.cancelled, color: '#f87171' },
      { label: 'Avisos nuevos', value: this.notices.unread(), icon: ICONS.bell, color: '#60a5fa' },
    );
    return stats;
  });
}
