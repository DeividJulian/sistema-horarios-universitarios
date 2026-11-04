// Response shapes of GET /statistics, GET /conflicts, GET /diagnostics and the demo data, from the backend contract.
import type {
  BackupInfo as BackupInfoOut,
  ConflictOut,
  ConflictReport as ConflictReportOut,
  ReadinessOut,
  ReadinessProblem as ReadinessProblemOut,
  RestoreOut,
  SeedOut,
  StatisticsOut,
} from '../api/generated';

export type Statistics = StatisticsOut;
export type ConflictKind = ConflictOut['tipo'];
export type Conflict = ConflictOut;
export type ConflictReport = ConflictReportOut;
export type SeedResult = SeedOut;
export type RestoreResult = RestoreOut;
/** Copy of the data that the demo replaced (GET /seed/backup). */
export type BackupInfo = BackupInfoOut;
export type ReadinessSection = ReadinessProblemOut['seccion'];
/** One thing that stops the generator (GET /diagnostics). */
export type ReadinessProblem = ReadinessProblemOut;
export type Readiness = ReadinessOut;
