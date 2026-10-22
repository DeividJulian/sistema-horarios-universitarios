import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { AnalysisService } from '../../../core/api/analysis.service';
import { ClassChangeService } from '../../../core/api/class-change.service';
import { AuthService } from '../../../core/auth/auth.service';
import {
  Classroom,
  Readiness,
  ScheduleEntry,
  formatLongDate,
  hourOf,
  shiftText,
  toIsoDate,
  upcomingSchoolDays,
} from '../../../core/models';
import { ConfirmService } from '../../../core/services/confirm.service';
import { NotificationService } from '../../../core/services/notification.service';
import { CatalogStore } from '../../../core/state/catalog.store';
import { NoticeStore } from '../../../core/state/notice.store';
import { OptimizationStore } from '../../../core/state/optimization.store';
import { AnalysisResult } from '../../../workers/schedule-analysis';
import { StateMessage } from '../../../shared/state-message/state-message';
import { CONFLICT_LABELS } from '../../analysis/conflict-labels';
import { AnalysisPanel } from '../analysis-panel/analysis-panel';
import { BentoOverview } from '../bento-overview/bento-overview';
import { EMPTY_FILTER, ScheduleFilter, matchesFilter } from '../schedule-filter';
import { ScheduleFilters } from '../schedule-filters/schedule-filters';
import { CancelRequest, ClassroomChangeRequest, EntryDetails } from '../entry-details/entry-details';
import { GettingStarted } from '../getting-started/getting-started';
import { EntryMove, ScheduleGrid } from '../schedule-grid/schedule-grid';

@Component({
  selector: 'app-schedule-page',
  imports: [ScheduleFilters, ScheduleGrid, AnalysisPanel, BentoOverview, StateMessage, RouterLink, EntryDetails, GettingStarted],
  templateUrl: './schedule-page.html',
  styleUrl: './schedule-page.css',
})
export class SchedulePage {
  protected readonly store = inject(CatalogStore);
  protected readonly auth = inject(AuthService);
  protected readonly notices = inject(NoticeStore);
  protected readonly optimization = inject(OptimizationStore);
  private readonly notify = inject(NotificationService);
  private readonly confirm = inject(ConfirmService);
  private readonly analysisApi = inject(AnalysisService);
  private readonly classChanges = inject(ClassChangeService);

  protected readonly filter = signal<ScheduleFilter>(EMPTY_FILTER);
  protected readonly analysis = signal<AnalysisResult | null>(null);
  /** Conflicts come from the shared store (the sidebar and the cards use them too). */
  protected readonly conflicts = this.optimization.conflicts;
  protected readonly readiness = signal<Readiness | null>(null);
  protected readonly selectedId = signal<number | null>(null);

  /** Administrators and read-only users see the whole faculty; teachers and students only their own classes. */
  protected readonly seesEverything = computed(() => this.auth.hasRole('admin', 'usuario'));

  protected readonly myGroup = computed(() => {
    const id = this.auth.user()?.grupo_id;
    return id == null ? undefined : this.store.groupsById().get(id);
  });
  protected readonly shiftText = shiftText;

  /** The filter the calendar uses: the one chosen in the filters, or fixed to the teacher's / student's classes. */
  protected readonly effectiveFilter = computed<ScheduleFilter>(() => {
    const user = this.auth.user();
    if (user?.rol === 'profesor') return { ...EMPTY_FILTER, teacherId: user.profesor_id ?? -1 };
    if (user?.rol === 'estudiante') return { ...EMPTY_FILTER, groupId: user.grupo_id ?? -1 };
    return this.filter();
  });

  protected readonly visibleEntries = computed(() => {
    const subjects = this.store.subjectsById();
    const filter = this.effectiveFilter();
    return this.store.entries().filter((e) => matchesFilter(e, subjects.get(e.materia_id), filter));
  });

  protected readonly counts = computed(() => ({
    classrooms: this.store.classrooms().length,
    groups: this.store.groups().length,
    teachers: this.store.teachers().length,
    subjects: this.store.subjects().length,
    entries: this.store.entries().length,
  }));

  protected readonly firstName = computed(() => this.auth.user()?.nombre.split(/\s+/)[0] ?? '');

  // ---------- Days shown (the next five school days), and their cancelled classes ----------
  /** Today's date; checked every minute so the calendar moves on by itself after midnight. */
  private readonly todayIso = signal(toIsoDate(new Date()));
  protected readonly days = computed(() => upcomingSchoolDays(5, new Date(`${this.todayIso()}T00:00:00`)));
  private readonly dateOf = computed(() => new Map(this.days().map((d) => [d.day, d.date])));
  protected readonly daysLabel = computed(() => {
    const days = this.days();
    return `Próximos días de clase: del ${formatLongDate(days[0].date)} al ${formatLongDate(days[days.length - 1].date)}`;
  });

  /** Reason of each cancellation, shown when hovering the cancelled card. */
  protected readonly cancelReasons = computed(
    () => new Map(this.notices.cancellations().map((c) => [`${c.horario_id}|${c.fecha}`, c.motivo])),
  );

  protected readonly cancelledKeys = computed(
    () => new Set(this.notices.cancellations().map((c) => `${c.horario_id}|${c.fecha}`)),
  );

  protected readonly cancelledThisWeek = computed(
    () => this.visibleEntries().filter((e) => this.cancelledKeys().has(`${e.id}|${this.dateOf().get(e.dia_semana)}`)).length,
  );

  // ---------- Selected block ----------

  /** Block whose details are open; it disappears if the block is deleted or the data reloads without it. */
  protected readonly selectedEntry = computed(() => this.store.entries().find((e) => e.id === this.selectedId()) ?? null);

  protected readonly selectedCancellations = computed(() => {
    const entry = this.selectedEntry();
    if (!entry) return [];
    return (this.notices.cancellationsByEntry().get(entry.id) ?? []).filter((c) => c.fecha >= this.todayIso());
  });

  /** The block's own teacher, or an administrator. */
  protected readonly canAdjustSelected = computed(() => {
    const entry = this.selectedEntry();
    const user = this.auth.user();
    if (!entry || !user) return false;
    if (user.rol === 'admin') return true;
    return user.rol === 'profesor' && this.store.subjectsById().get(entry.materia_id)?.profesor_id === user.profesor_id;
  });

  /** Classrooms free at the block's hour that are big enough and of the type the subject needs. */
  protected readonly classroomOptions = computed<Classroom[]>(() => {
    const entry = this.selectedEntry();
    if (!entry || !this.canAdjustSelected()) return [];
    const subject = this.store.subjectsById().get(entry.materia_id);
    const group = subject ? this.store.groupsById().get(subject.grupo_id) : undefined;
    if (!subject || !group) return [];
    const busy = new Set(
      this.store
        .entries()
        .filter((e) => e.id !== entry.id && e.dia_semana === entry.dia_semana && hourOf(e.hora_inicio) === hourOf(entry.hora_inicio))
        .map((e) => e.aula_id),
    );
    const required = subject.tipo_aula ?? 'cualquiera';
    return this.store
      .classrooms()
      .filter((c) => c.id !== entry.aula_id && !busy.has(c.id) && c.aforo >= group.num_estudiantes)
      .filter((c) => required === 'cualquiera' || c.tipo === required)
      .sort((a, b) => a.aforo - b.aforo);
  });

  /** "Type: description" per block, so the calendar can flag the blocks in trouble. */
  protected readonly conflictsByEntry = computed(() => {
    const map = new Map<number, string[]>();
    for (const c of this.conflicts()) {
      for (const id of c.horario_ids) {
        map.set(id, [...(map.get(id) ?? []), `${CONFLICT_LABELS[c.tipo]}: ${c.descripcion}`]);
      }
    }
    return map;
  });

  private readonly worker = this.createWorker();

  constructor() {
    this.reload();
    this.notices.refresh();
    const clock = setInterval(() => this.todayIso.set(toIsoDate(new Date())), 60_000);
    inject(DestroyRef).onDestroy(() => {
      clearInterval(clock);
      this.worker?.terminate();
    });
  }

  /** Generating lives in the shared store, so the sidebar button and the cards do the same. */
  protected generate(): void {
    this.optimization.generate();
  }

  /** The heavy analysis runs in a Web Worker so the page never freezes. */
  protected analyze(): void {
    if (!this.worker) {
      this.notify.error('Tu navegador no soporta Web Workers.');
      return;
    }
    this.worker.postMessage({
      entries: this.store.entries(),
      subjects: this.store.subjects(),
      teachers: this.store.teachers(),
      classrooms: this.store.classrooms(),
    });
  }

  protected move({ entry, day, hour, classroomId }: EntryMove): void {
    this.store.moveEntry(entry, day, hour, classroomId).subscribe({
      next: () => {
        this.notify.success('Bloque movido. Los estudiantes del grupo recibieron un aviso.');
        this.refreshConflicts();
        this.notices.refresh();
      },
      error: (err) => this.notify.apiError(err, 'No se pudo mover el bloque.'),
    });
  }

  protected async deleteEntry(entry: ScheduleEntry): Promise<void> {
    const name = this.subjectName(entry);
    const accepted = await this.confirm.ask({
      title: '¿Eliminar este bloque?',
      message: `Se quitará la clase de ${name} del ${entry.dia_semana}. La materia quedará con horas sin programar hasta que generes el horario de nuevo.`,
      confirmText: 'Eliminar bloque',
      danger: true,
    });
    if (!accepted) return;
    this.store.deleteEntry(entry.id).subscribe({
      next: () => {
        this.notify.success('Bloque eliminado.');
        this.selectedId.set(null);
        this.refreshConflicts();
      },
      error: (err) => this.notify.apiError(err, 'No se pudo eliminar el bloque.'),
    });
  }

  protected async cancelClass({ entry, fecha, motivo, aviso }: CancelRequest): Promise<void> {
    const accepted = await this.confirm.ask({
      title: `¿Cancelar ${this.subjectName(entry)} del ${formatLongDate(fecha)}?`,
      message: aviso
        ? `Los estudiantes del grupo recibirán este aviso: «${aviso}». El resto de semanas la clase sigue igual.`
        : `Los estudiantes del grupo recibirán un aviso con el motivo: «${motivo}». El resto de semanas la clase sigue igual.`,
      confirmText: 'Cancelar clase',
      cancelText: 'Volver',
      danger: true,
    });
    if (!accepted) return;
    this.classChanges.cancel(entry.id, fecha, motivo, aviso).subscribe({
      next: () => {
        this.notify.success('Clase cancelada. Los estudiantes ya tienen el aviso.');
        this.notices.refresh();
      },
      error: (err) => this.notify.apiError(err, 'No se pudo cancelar la clase.'),
    });
  }

  protected restoreClass(cancellation: { id: number; fecha: string }): void {
    this.classChanges.restore(cancellation.id).subscribe({
      next: () => {
        this.notify.success(`La clase del ${formatLongDate(cancellation.fecha)} se dictará. Se avisó a los estudiantes.`);
        this.notices.refresh();
      },
      error: (err) => this.notify.apiError(err, 'No se pudo restablecer la clase.'),
    });
  }

  protected async changeClassroom({ entry, classroomId, aviso }: ClassroomChangeRequest): Promise<void> {
    const classroom = this.store.classroomsById().get(classroomId)?.nombre ?? 'la nueva aula';
    const accepted = await this.confirm.ask({
      title: `¿Pasar ${this.subjectName(entry)} a ${classroom}?`,
      message: `Desde ahora la clase del ${entry.dia_semana.toLowerCase()} será en ${classroom}. Los estudiantes del grupo recibirán un aviso.`,
      confirmText: 'Cambiar aula',
    });
    if (!accepted) return;
    this.classChanges.changeClassroom(entry.id, classroomId, aviso).subscribe({
      next: (saved) => {
        this.store.applyEntry(saved);
        this.notify.success(`Clase pasada a ${classroom}. Se avisó a los estudiantes.`);
        this.notices.refresh();
        this.refreshConflicts();
      },
      error: (err) => this.notify.apiError(err, 'No se pudo cambiar el aula.'),
    });
  }

  protected occupiedDrop(): void {
    this.notify.info('Esa casilla ya está ocupada. Elige una casilla vacía.');
  }

  protected reload(): void {
    this.store.load().subscribe({
      next: () => this.refreshConflicts(),
      error: (err) => this.notify.apiError(err, 'No se pudieron cargar los datos.'),
    });
  }

  private subjectName(entry: ScheduleEntry): string {
    return this.store.subjectsById().get(entry.materia_id)?.nombre ?? 'la clase';
  }

  /** Conflicts and readiness are for the people who see the whole faculty; a failure here is not critical. */
  private refreshConflicts(): void {
    this.optimization.refresh(); // teachers also get the conflicts of their classes
    if (!this.seesEverything()) return;
    this.analysisApi.readiness().subscribe({
      next: (readiness) => this.readiness.set(readiness),
      error: () => this.readiness.set(null),
    });
  }

  private createWorker(): Worker | null {
    if (typeof Worker === 'undefined') return null;
    const worker = new Worker(new URL('../../../workers/schedule-analysis.worker', import.meta.url));
    worker.onmessage = ({ data }: MessageEvent<AnalysisResult>) => this.analysis.set(data);
    return worker;
  }
}
