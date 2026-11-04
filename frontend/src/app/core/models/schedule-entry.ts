import type { GenerationOut, OptimizationReport as OptimizationReportOut, ScheduleEntryMove as ScheduleEntryMoveIn, ScheduleEntryOut } from '../api/generated';

export type ScheduleEntry = ScheduleEntryOut;

/** Move a block; aula_id (optional) also changes its classroom, for example an option suggested by the AI. */
export type ScheduleEntryMove = ScheduleEntryMoveIn;

/** Figures of the metaheuristic phase (simulated annealing) that improves the CSP schedule. */
export type OptimizationReport = OptimizationReportOut;

export type GenerationResult = GenerationOut;
