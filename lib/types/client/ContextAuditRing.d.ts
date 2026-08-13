/**
 * Context Doctor 圆环 + 展开面板（挂在 conversation.composer.dock）。
 * 圆环显示"常驻注入"估算 token（指令链 + 技能 catalog + 工具 schema），
 * 颜色按严重度分级；点击展开分项明细与建议数。数据经同源
 * `/api/context-doctor/audit` 拉取。
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
/**
 * Dock entry：常驻注入 token 圆环 + 点击展开面板。
 */
export declare function ContextAuditRing(props: ContextAuditRingProps): ReactElement;
