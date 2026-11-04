// The AI only advises: these answers never change data by themselves. Shapes from the backend contract.
import type {
  AiStatus as AiStatusOut,
  ConflictOption as ConflictOptionOut,
  ConflictSuggestion as ConflictSuggestionOut,
  NoticeDraftOut,
  NoticeDraftRequest as NoticeDraftRequestIn,
} from '../api/generated';

/** GET /ai/status. The frontend shows the provider named here, never a hard-coded one. */
export type AiStatus = AiStatusOut;
/** One slot and classroom where a conflicting class fits without breaking any rule. */
export type ConflictOption = ConflictOptionOut;
/** POST /ai/conflicts/{id}/suggestion */
export type ConflictSuggestion = ConflictSuggestionOut;
export type NoticeKind = NoticeDraftRequestIn['tipo'];
/** POST /ai/notices/draft */
export type NoticeDraftRequest = NoticeDraftRequestIn;
export type NoticeDraft = NoticeDraftOut;
