/**
 * Context Doctor's composer control, seated in the input tool row through
 * `conversation.input.right` — a stock DSH slot, so the control appears on an
 * unmodified harness (issue #4).
 * The panel deliberately uses one lightweight, mono-inspired visual language
 * in both DSH themes instead of inheriting the surrounding chat typography.
 */
import { type ReactElement } from 'react';
import type { PropsLocale, PropsRuntime, PropsStore } from '@deepseek-ai/dsh-client-ui-slots';
import type { createAuditStore } from './store.ts';
import { NS } from './locales.ts';
export type ContextAuditRingProps = PropsRuntime<'conversation.input.right'> & PropsStore<ReturnType<typeof createAuditStore>> & PropsLocale<typeof NS>;
/** Resident control in the tool row, just before Send. */
export declare function ContextAuditRing(props: ContextAuditRingProps): ReactElement;
