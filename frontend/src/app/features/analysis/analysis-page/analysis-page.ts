import { DecimalPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';

import { AnalysisService, SeedDataset } from '../../../core/api/analysis.service';
import { AuthService } from '../../../core/auth/auth.service';
import { apiErrorMessage } from '../../../core/http/api-error';
import { ConflictReport, Statistics } from '../../../core/models';
import { ConfirmService } from '../../../core/services/confirm.service';
import { NotificationService } from '../../../core/services/notification.service';
import { TabSyncService } from '../../../core/services/tab-sync.service';
import { CatalogStore } from '../../../core/state/catalog.store';
import { BarItem, BarList } from '../../../shared/bar-list/bar-list';
import { StateMessage } from '../../../shared/state-message/state-message';
import { CONFLICT_LABELS } from '../conflict-labels';

const percent = (value: number) => `${value.toLocaleString('es-CO', { maximumFractionDigits: 1 })} %`;

@Component({
  selector: 'app-analysis-page',
  imports: [BarList, StateMessage, DecimalPipe, RouterLink],
  templateUrl: './analysis-page.html',
  styleUrl: './analysis-page.css',
})
export class AnalysisPage {
  private readonly api = inject(AnalysisService);
  private readonly tabSync = inject(TabSyncService);
  private readonly store = inject(CatalogStore);
  private readonly notify = inject(NotificationService);
  private readonly confirm = inject(ConfirmService);
  protected readonly auth = inject(AuthService);

  protected readonly stats = signal<Statistics | null>(null);
  protected readonly report = signal<ConflictReport | null>(null);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly labels = CONFLICT_LABELS;
  protected readonly seeding = signal(false);
  protected readonly seeded = signal(false);

  protected readonly classroomBars = computed<BarItem[]>(() =>
    (this.stats()?.ocupacion_aulas ?? []).map((c) => ({
      label: c.aula,
      value: c.ocupacion_pct,
      display: `${c.horas_ocupadas} h · ${percent(c.ocupacion_pct)}`,
    })),
  );

  protected readonly dayBars = computed<BarItem[]>(() =>
    (this.stats()?.distribucion_por_dia ?? []).map((d) => ({
      label: d.dia,
      value: d.bloques,
      display: `${d.bloques} ${d.bloques === 1 ? 'bloque' : 'bloques'}`,
    })),
  );

  protected readonly totalIdleHours = computed(() =>
    (this.stats()?.carga_profesores ?? []).reduce((sum, t) => sum + t.franjas_muertas, 0),
  );

  constructor() {
    // Refresh when another tab changes the schedule (and once at start, when the counter is 0)
    effect(() => {
      this.tabSync.remoteChanges();
      untracked(() => this.refresh());
    });
  }

  /**
   * Loads the demo data. If the database already has data the backend answers 409, and only after an
   * explicit destructive confirmation the request is repeated with ?reset=true (which deletes everything).
   */
  protected loadDemoData(dataset: SeedDataset, reset = false): void {
    this.seeding.set(true);
    this.api.seed(dataset, reset).subscribe({
      next: (result) => {
        const r = result.resumen;
        this.notify.success(
          `Datos de demostración cargados: ${r.profesores} profesores, ${r.aulas} aulas, ${r.grupos} grupos y ${r.materias} materias.`,
        );
        this.seeding.set(false);
        this.seeded.set(true);
        this.store.load().subscribe({ error: () => undefined });
        this.refresh();
      },
      error: async (err) => {
        this.seeding.set(false);
        if (!reset && err instanceof HttpErrorResponse && err.status === 409) {
          const accepted = await this.confirm.ask({
            title: '¿Borrar todos los datos actuales?',
            message:
              'Ya hay datos cargados. Para usar los de demostración se eliminarán TODOS los profesores, aulas, grupos, materias y el horario actual. Esta acción no se puede deshacer.',
            confirmText: 'Borrar todo y cargar demo',
            danger: true,
          });
          if (accepted) this.loadDemoData(dataset, true);
          return;
        }
        this.notify.apiError(err, 'No se pudieron cargar los datos de demostración.');
      },
    });
  }

  protected refresh(): void {
    this.loading.set(true);
    this.error.set(null);
    forkJoin({ stats: this.api.statistics(), report: this.api.conflicts() }).subscribe({
      next: ({ stats, report }) => {
        this.stats.set(stats);
        this.report.set(report);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(apiErrorMessage(err, 'No se pudo cargar el análisis.'));
        this.loading.set(false);
      },
    });
  }
}
