/**
 * Context Doctor budget control and audit popover for the conversation dock.
 * @module dsh-context-doctor/client/ContextAuditRing
 */
import { type ReactElement } from 'react';
import type { PropsLocale, PropsRuntime, PropsStore } from '@deepseek-ai/dsh-client-ui-slots';
import type { createAuditStore } from './store.ts';
import { NS } from './locales.ts';
/** Injected actions handed to the dock entry component. */
export interface AuditInjected {
    /** Fetch the report on mount. */
    ensure: () => void;
    /** Force a fresh audit. */
    refresh: () => void;
}
/** Composed props of the dock entry. */
export type ContextAuditRingProps = PropsRuntime<'conversation.composer.dock'> & PropsStore<ReturnType<typeof createAuditStore>> & AuditInjected & PropsLocale<typeof NS>;
/** Dock entry: resident-token gauge plus a detailed, keyboard-dismissable popover. */
export declare function ContextAuditRing(props: ContextAuditRingProps): ReactElement;
