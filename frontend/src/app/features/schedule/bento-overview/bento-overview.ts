import { Component, computed, inject, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';

import { AuthService } from '../../../core/auth/auth.service';
import { ScheduleEntry, formatHour, formatLongDate, hourOf, relativeTime, toIsoDate, upcomingSchoolDays } from '../../../core/models';
import { subjectColor } from '../subject-color';
import { CatalogStore } from '../../../core/state/catalog.store';
import { NoticeStore } from '../../../core/state/notice.store';
import { OptimizationStore } from '../../../core/state/optimization.store';

interface Stat {
  label: string;
  value: number;
  /** 24x24 stroke icon. */
  icon: string;
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

/** One class in the "today" agenda of a teacher or student. */
interface AgendaItem {
  id: number;
  start: number;
  end: number;
  subject: string;
  room: string;
  /** The teacher (for a student) or the group (for a teacher). */
  who: string;
  cancelled: boolean;
  /** Already over, happening now, or still to come (only meaningful today). */
  when: 'past' | 'now' | 'next';
  color: { fill: string; ink: string; edge: string };
}

interface Check {
  label: string;
  ok: boolean;
  value: string;
}

const RING_RADIUS = 42;
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
  /** "id|date" of the classes cancelled on that date, to cross them out in the agenda. */
  readonly cancelledKeys = input<ReadonlySet<string>>(new Set());
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

  /** The same figures as idleText, separately, for the big numbers of the card. */
  protected readonly idle = computed(() => {
    const last = this.optimization.lastRun();
    if (last?.antes === undefined || last.despues === undefined) return null;
    const saved = last.antes > 0 ? Math.round(((last.antes - last.despues) / last.antes) * 100) : 0;
    return { before: last.antes, after: last.despues, saved };
  });

  protected readonly hours = computed(() => this.optimization.stats()?.cumplimiento);

  /** Phases of the gRPC stream (values of the Phase enum in proto/horarios/v1/horarios.proto). */
  protected readonly phases = [
    { value: 1, label: 'Preparar' },
    { value: 2, label: 'CSP' },
    { value: 3, label: 'Recocido' },
    { value: 4, label: 'Guardar' },
  ];
  protected readonly streamPhase = computed(() => this.optimization.progress()?.phase ?? 0);

  /** «Generar» the first time, «Re-optimizar» once there is a schedule. */
  protected readonly generateLabel = computed(() =>
    this.optimization.generating() ? 'Optimizando…' : this.catalog.entries().length ? 'Re-optimizar' : 'Generar horario',
  );

  /**
   * Teachers and students: the classes of the first school day that has any (today, or the next one),
   * in order, each marked as over, happening now or still to come.
   */
  protected readonly agenda = computed(() => {
    const subjects = this.catalog.subjectsById();
    const rooms = this.catalog.classroomsById();
    const groups = this.catalog.groupsById();
    const teachers = this.catalog.teachersById();
    const now = new Date();
    const today = toIsoDate(now);
    const hour = now.getHours() + now.getMinutes() / 60;
    for (const day of upcomingSchoolDays(5, now)) {
      const list = this.entries()
        .filter((e) => e.dia_semana === day.day)
        .sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio));
      if (list.length === 0) continue;
      const isToday = day.date === today;
      const items: AgendaItem[] = list.map((e) => {
        const subject = subjects.get(e.materia_id);
        const start = hourOf(e.hora_inicio);
        const end = hourOf(e.hora_fin);
        const who = this.auth.isTeacher()
          ? (subject ? groups.get(subject.grupo_id)?.nombre : undefined)
          : (subject ? teachers.get(subject.profesor_id)?.nombre : undefined);
        return {
          id: e.id,
          start,
          end,
          subject: subject?.nombre ?? 'Materia',
          room: rooms.get(e.aula_id)?.nombre ?? 'Aula sin asignar',
          who: who ?? '',
          cancelled: this.cancelledKeys().has(`${e.id}|${day.date}`),
          when: !isToday ? 'next' : hour >= end ? 'past' : hour >= start ? 'now' : 'next',
          color: subjectColor(e.materia_id),
        };
      });
      const label = isToday ? 'Hoy' : formatLongDate(day.date).replace(/^./, (c) => c.toUpperCase());
      return { label, isToday, items };
    }
    return null;
  });

  /** 8 -> "8:00 a. m." */
  protected hour(h: number): string {
    return formatHour(h);
  }

  /** Totals strip under the cards (the counters the dashboard always had). */
  protected readonly stats = computed<Stat[]>(() => {
    if (this.faculty()) {
      return [
        { label: 'Profesores', value: this.catalog.teachers().length, icon: ICONS.teacher },
        { label: 'Aulas', value: this.catalog.classrooms().length, icon: ICONS.classroom },
        { label: 'Grupos', value: this.catalog.groups().length, icon: ICONS.group },
        { label: 'Materias', value: this.catalog.subjects().length, icon: ICONS.subject },
        { label: 'Clases programadas', value: this.catalog.entries().length, icon: ICONS.calendar },
      ];
    }
    const entries = this.entries();
    const subjects = this.catalog.subjectsById();
    const stats: Stat[] = [
      { label: 'Clases a la semana', value: entries.length, icon: ICONS.calendar },
      { label: 'Materias', value: new Set(entries.map((e) => e.materia_id)).size, icon: ICONS.subject },
    ];
    if (this.auth.isTeacher()) {
      const groups = new Set(entries.map((e) => subjects.get(e.materia_id)?.grupo_id));
      stats.push({ label: 'Grupos', value: groups.size, icon: ICONS.group });
    }
    stats.push(
      { label: 'Canceladas próximos días', value: this.cancelled(), icon: ICONS.cancelled },
      { label: 'Avisos nuevos', value: this.notices.unread(), icon: ICONS.bell },
    );
    return stats;
  });
}
