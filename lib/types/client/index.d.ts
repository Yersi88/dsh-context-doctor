/**
 * Context Doctor browser half — registers the audit ring into the
 * conversation composer dock and drives it from the host's same-origin
 * `/api/context-doctor/audit` endpoint: fetch on mount, manual refresh.
 * @module @dsh-external/context-doctor/client
 */
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client';
import type { BakedActions } from '@deepseek-ai/dsh-client-ui-slots';
import { type AuditUiActions, type AuditUiState } from './store.ts';
/** Required services. */
export declare const inject: string[];
/** 烘焙后的 store actions（draft 已注入，组件侧直接调用）。 */
export type BakedAuditActions = BakedActions<AuditUiState, AuditUiActions>;
export type { AuditInjected, ContextAuditRingProps } from './ContextAuditRing.tsx';
export type { AuditUiState } from './store.ts';
/**
 * Client plugin body: register dictionaries, seed the store, and seat the
 * audit ring once its hole is on the ledger.
 */
export declare function apply(ctx: ClientContext): void;
