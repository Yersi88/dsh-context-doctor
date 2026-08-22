/**
 * Context Doctor's composer control, seated in the input tool row through
 * `conversation.input.right` — a stock DSH slot, so the control appears on an
 * unmodified harness (issue #4).
 *
 * The panel is number-first: one composition bar shows where the resident
 * budget actually goes, and every category expands into the entries behind it
 * (files, skill sources, individual schemas, MCP servers). All copy comes from
 * the locale seat, so it follows the DSH shell's language.
 */
import { type ReactElement } from 'react';
import type { PropsLocale, PropsRuntime, PropsStore } from '@deepseek-ai/dsh-client-ui-slots';
import type { createAuditStore } from './store.ts';
import { NS } from './locales.ts';
export type ContextAuditRingProps = PropsRuntime<'conversation.input.right'> & PropsStore<ReturnType<typeof createAuditStore>> & PropsLocale<typeof NS>;
/** Resident control in the tool row, just before Send. */
export declare function ContextAuditRing(props: ContextAuditRingProps): ReactElement;
