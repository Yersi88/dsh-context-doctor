/**
 * Context Doctor browser half — registers the audit ring into the
 * conversation composer dock and drives it from the host's same-origin
 * `/api/context-doctor/audit` endpoint: fetch on mount, manual refresh.
 * @module @dsh-external/context-doctor/client
 */

import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type { SessionId } from '@deepseek-ai/dsh-client-connection/client'
import type { BakedActions } from '@deepseek-ai/dsh-client-ui-slots'
// Type-only: pulls the locale plugin's Context merge (ctx.locale).
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import { createAuditStore, type AuditUiActions, type AuditUiState } from './store.ts'
import { ContextAuditRing, type AuditInjected } from './ContextAuditRing.tsx'
import { NS, en, zh } from './locales.ts'

/** 浏览器侧审计 API（与 host 路由对应）。 */
const AUDIT_API = '/api/context-doctor/audit'

/** Required services. */
export const inject = ['slots', 'locale']

/** 烘焙后的 store actions（draft 已注入，组件侧直接调用）。 */
export type BakedAuditActions = BakedActions<AuditUiState, AuditUiActions>

export type { AuditInjected, ContextAuditRingProps } from './ContextAuditRing.tsx'
export type { AuditUiState } from './store.ts'

/** 当前 in-flight 请求的取消控制器：新请求先取消旧请求（避免乱序覆盖）。 */
let currentController: AbortController | null = null

/** Fetch the host audit report into the store. */
function fetchReport(actions: BakedAuditActions | null): void {
  currentController?.abort()
  const controller = new AbortController()
  currentController = controller
  actions?.setState('loading', null)
  fetch(AUDIT_API, { signal: controller.signal }).then((response) => {
    if (!response.ok) throw new Error(`audit ${response.status}`)
    return response.json() as Promise<{ ok: boolean; report: AuditUiState['report'] }>
  }).then((data) => {
    if (controller.signal.aborted) return
    if (data.ok && data.report !== null && data.report !== undefined) actions?.setReport(data.report)
    else actions?.setState('error', 'empty audit response')
  }, (error: unknown) => {
    if (controller.signal.aborted) return
    actions?.setState('error', 'audit transport error')
  })
}

/**
 * Client plugin body: register dictionaries, seed the store, and seat the
 * audit ring once its hole is on the ledger.
 */
export function apply(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'context-doctor: dictionaries')

  const store = createAuditStore()
  let baked: BakedAuditActions | null = null

  const injected = (_sessionId: SessionId, actions: BakedAuditActions): AuditInjected => {
    baked = actions
    return {
      ensure: () => fetchReport(baked),
      refresh: () => fetchReport(baked),
    }
  }

  ctx.slots.inject('conversation.composer.dock', () =>
    ctx.slots.register({
      name: 'conversation.composer.dock',
      id: 'context-doctor',
      order: 30,
      store,
      inject: injected,
      locale: NS,
    }, ContextAuditRing))
}
