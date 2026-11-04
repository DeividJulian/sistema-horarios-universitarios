import { Injectable, Injector, computed, inject, signal } from '@angular/core';
import { forkJoin } from 'rxjs';
import * as z from 'zod/mini';

import { AnalysisService } from '../api/analysis.service';
import { AuthService } from '../auth/auth.service';
import { Conflict, ConflictKind, GenerationResult, Statistics } from '../models';
// Only the type: the RPC client (Connect + protobuf-es) is loaded on demand, the first time someone generates by gRPC
import type { GenerationEvent } from '../rpc/gen/horarios/v1/horarios_pb';
import { ConfirmService } from '../services/confirm.service';
import { NotificationService } from '../services/notification.service';
import { CatalogStore } from './catalog.store';
import { NoticeStore } from './notice.store';

const LAST_RUN_KEY = 'horarios.ultima-optimizacion';
const PROTOCOL_KEY = 'horarios.protocolo-generacion';

/** REST: one JSON answer at the end. gRPC: the RPC service streams the progress (Connect, Protobuf). */
export type GenerationProtocol = 'rest' | 'grpc';

export type ScheduleStatus = 'optimizado' | 'con-conflictos' | 'incompleto' | 'sin-horario';

/** Last optimization run in this browser: when, and the idle hours before and after the simulated annealing. */
const zLastRun = z.object({ fecha: z.string(), antes: z.optional(z.number()), despues: z.optional(z.number()) });

export interface LastRun {
  fecha: string;
  antes?: number;
  despues?: number;
}

export interface ConstraintCheck {
  label: string;
  ok: boolean;
  /** "100 %", "Cumple", "2 problemas"… */
  value: string;
}

/** Each check groups the conflict types (GET /conflicts) that break it. */
const CHECKS: { label: string; kinds: ConflictKind[]; okText: string }[] = [
  { label: 'Disponibilidad docente', kinds: ['fuera_de_disponibilidad', 'cruce_profesor'], okText: '100 %' },
  { label: 'Aforo y tipo de aula', kinds: ['sobrecupo', 'tipo_de_aula', 'cruce_aula'], okText: 'Cumple' },
  { label: 'Grupos y jornadas', kinds: ['cruce_grupo', 'fuera_de_jornada'], okText: 'Correcto' },
  { label: 'Horas por materia', kinds: ['intensidad_incorrecta'], okText: 'Completas' },
];

/**
 * Health of the schedule shared by the sidebar and the dashboard cards: efficiency, constraint checks,
 * when it was last optimized, and the action that generates it again.
 */
@Injectable({ providedIn: 'root' })
export class OptimizationStore {
  private readonly api = inject(AnalysisService);
  private readonly auth = inject(AuthService);
  private readonly catalog = inject(CatalogStore);
  private readonly notices = inject(NoticeStore);
  private readonly confirm = inject(ConfirmService);
  private readonly notify = inject(NotificationService);
  private readonly injector = inject(Injector);

  readonly stats = signal<Statistics | null>(null);
  readonly conflicts = signal<Conflict[]>([]);
  readonly loaded = signal(false);
  readonly lastRun = signal<LastRun | null>(this.readLastRun());
  readonly generating = this.catalog.generating;
  readonly protocol = signal<GenerationProtocol>(this.readProtocol());
  /** Last event of the gRPC stream while generating (null with REST or when idle). */
  readonly progress = signal<GenerationEvent | null>(null);
  private abort: AbortController | null = null;

  /** Students only see their group; the faculty-wide numbers are not for them. */
  readonly available = computed(() => this.auth.hasRole('admin', 'usuario', 'profesor'));

  /** Scheduled classes without conflicts over the hours the subjects require. */
  readonly efficiency = computed(() => {
    const stats = this.stats();
    if (!stats || stats.cumplimiento.horas_requeridas === 0) return 0;
    const troubled = new Set(this.conflicts().flatMap((c) => c.horario_ids)).size;
    const clean = Math.max(0, stats.cumplimiento.horas_programadas - troubled);
    return Math.min(100, (clean / stats.cumplimiento.horas_requeridas) * 100);
  });

  readonly status = computed<ScheduleStatus>(() => {
    const stats = this.stats();
    if (!stats || stats.totales.bloques_programados === 0) return 'sin-horario';
    if (this.conflicts().some((c) => c.tipo !== 'intensidad_incorrecta')) return 'con-conflictos';
    if (stats.cumplimiento.horas_programadas < stats.cumplimiento.horas_requeridas) return 'incompleto';
    return 'optimizado';
  });

  readonly checks = computed<ConstraintCheck[]>(() =>
    CHECKS.map((check) => {
      const problems = this.conflicts().filter((c) => check.kinds.includes(c.tipo)).length;
      return {
        label: check.label,
        ok: problems === 0,
        value: problems === 0 ? check.okText : `${problems} ${problems === 1 ? 'problema' : 'problemas'}`,
      };
    }),
  );

  refresh(): void {
    if (!this.available()) return;
    forkJoin({ stats: this.api.statistics(), report: this.api.conflicts() }).subscribe({
      next: ({ stats, report }) => {
        this.stats.set(stats);
        this.conflicts.set(report.conflictos);
        this.loaded.set(true);
      },
      error: () => this.loaded.set(true), // not critical: the cards show "—"
    });
  }

  reset(): void {
    this.stats.set(null);
    this.conflicts.set([]);
    this.loaded.set(false);
  }

  /** Generates the whole schedule again (administrators), asking first if there is one already. */
  async generate(): Promise<boolean> {
    if (this.catalog.entries().length > 0) {
      const accepted = await this.confirm.ask({
        title: '¿Re-optimizar el horario?',
        message: 'El horario actual se reemplazará por completo, incluidos los bloques que hayas movido a mano y las clases canceladas.',
        confirmText: 'Re-optimizar',
      });
      if (!accepted) return false;
    }
    if (this.protocol() === 'grpc') return this.generateStreaming();
    return new Promise((resolve) => {
      this.catalog.generateSchedule().subscribe({
        next: (result) => {
          const opt = result.optimizacion;
          const idle = opt ? ` Horas muertas: ${opt.horas_muertas_antes} → ${opt.horas_muertas_despues}.` : '';
          this.notify.success(`Horario optimizado: ${result.total_bloques} bloques sin cruces.${idle}`);
          this.saveLastRun(result);
          this.catalog.load().subscribe({ error: () => undefined });
          this.notices.refresh();
          this.refresh();
          resolve(true);
        },
        error: (err) => {
          this.notify.apiError(err, 'No se pudo generar el horario.');
          resolve(false);
        },
      });
    });
  }

  setProtocol(protocol: GenerationProtocol): void {
    this.protocol.set(protocol);
    try {
      localStorage.setItem(PROTOCOL_KEY, protocol);
    } catch {
      // Only remembered until the page reloads
    }
  }

  /** Stops the gRPC generation: the server stops before saving, so the previous schedule stays. */
  cancelGeneration(): void {
    this.abort?.abort();
  }

  /** Generation through the RPC service: the same CSP + annealing, with each phase streamed as it runs. */
  private async generateStreaming(): Promise<boolean> {
    this.abort = new AbortController();
    this.catalog.generating.set(true);
    this.progress.set(null);
    const { Phase } = await import('../rpc/gen/horarios/v1/horarios_pb');
    const { ScheduleRpcService, rpcErrorMessage } = await import('../rpc/schedule-rpc.service');
    const rpc = this.injector.get(ScheduleRpcService);
    try {
      for await (const event of rpc.generate(this.abort.signal)) {
        this.progress.set(event);
        if (event.phase === Phase.DONE) {
          const idle = ` Horas muertas: ${event.idleHoursBefore} → ${event.idleHours}.`;
          this.notify.success(`Horario optimizado por gRPC en ${event.elapsedSeconds.toFixed(1)} s: ${event.totalBlocks} bloques sin cruces.${idle}`);
          this.saveLastRun({
            mensaje: event.message,
            total_bloques: event.totalBlocks,
            optimizacion: {
              horas_muertas_antes: event.idleHoursBefore,
              horas_muertas_despues: event.idleHours,
              iteraciones: event.iterations,
              mejoras: event.improvements,
              segundos: event.elapsedSeconds,
            },
          });
        }
      }
      this.catalog.load().subscribe({ error: () => undefined });
      this.notices.refresh();
      this.refresh();
      return true;
    } catch (error) {
      const cancelled = this.abort.signal.aborted;
      if (cancelled) this.notify.info('Generación cancelada: el horario anterior se conserva.');
      else this.notify.error(rpcErrorMessage(error, 'No se pudo generar el horario.'));
      return false;
    } finally {
      this.catalog.generating.set(false);
      this.abort = null;
      this.progress.set(null);
    }
  }

  private readProtocol(): GenerationProtocol {
    try {
      return localStorage.getItem(PROTOCOL_KEY) === 'grpc' ? 'grpc' : 'rest';
    } catch {
      return 'rest';
    }
  }

  private saveLastRun(result: GenerationResult): void {
    const run: LastRun = {
      fecha: new Date().toISOString(),
      antes: result.optimizacion?.horas_muertas_antes,
      despues: result.optimizacion?.horas_muertas_despues,
    };
    this.lastRun.set(run);
    try {
      localStorage.setItem(LAST_RUN_KEY, JSON.stringify(run));
    } catch {
      // Without storage the result is only kept until the page reloads
    }
  }

  private readLastRun(): LastRun | null {
    try {
      const raw = localStorage.getItem(LAST_RUN_KEY);
      if (!raw) return null;
      // Older versions stored only the date
      if (!raw.startsWith('{')) return { fecha: raw };
      const parsed = zLastRun.safeParse(JSON.parse(raw));
      return parsed.success ? parsed.data : null;
    } catch {
      return null;
    }
  }
}
