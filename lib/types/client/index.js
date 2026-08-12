/**
 * Context Doctor browser half — registers the audit ring into the
 * conversation composer dock and drives it from the host's same-origin
 * `/api/context-doctor/audit` endpoint: fetch on mount, manual refresh.
 * @module @dsh-external/context-doctor/client
 */
import { createAuditStore } from "./store.js";
import { ContextAuditRing } from "./ContextAuditRing.js";
import { NS, en, zh } from "./locales.js";
/** 浏览器侧审计 API（与 host 路由对应）。 */
const AUDIT_API = '/api/context-doctor/audit';
/** Required services. */
export const inject = ['slots', 'locale'];
/** Fetch the host audit report into the store. */
function fetchReport(actions) {
    actions?.setState('loading', null);
    fetch(AUDIT_API).then((response) => {
        if (!response.ok)
            throw new Error(`audit ${response.status}`);
        return response.json();
    }).then((data) => {
        if (data.ok && data.report !== null && data.report !== undefined)
            actions?.setReport(data.report);
        else
            actions?.setState('error', 'empty audit response');
    }, () => {
        actions?.setState('error', 'audit transport error');
    });
}
/**
 * Client plugin body: register dictionaries, seed the store, and seat the
 * audit ring once its hole is on the ledger.
 */
export function apply(ctx) {
    ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'context-doctor: dictionaries');
    const store = createAuditStore();
    let baked = null;
    const injected = (_sessionId, actions) => {
        baked = actions;
        return {
            ensure: () => fetchReport(baked),
            refresh: () => fetchReport(baked),
        };
    };
    ctx.slots.inject('conversation.composer.dock', () => ctx.slots.register({
        name: 'conversation.composer.dock',
        id: 'context-doctor',
        order: 30,
        store,
        inject: injected,
        locale: NS,
    }, ContextAuditRing));
}
