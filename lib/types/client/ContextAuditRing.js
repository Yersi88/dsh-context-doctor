import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/**
 * Context Doctor 圆环 + 展开面板（挂在 conversation.composer.dock）。
 * 圆环显示"常驻注入"估算 token（指令链 + 技能 catalog + 工具 schema），
 * 颜色按严重度分级；点击展开分项明细与建议数。数据经同源
 * `/api/context-doctor/audit` 拉取（带当前会话 id，审计落在会话工作区）。
 * @module dsh-context-doctor/client/ContextAuditRing
 */
import { useEffect, useState } from 'react';
/** 常驻注入的"满量程"基准（token）：超过即视为接近爆满。 */
const FULL_SCALE = 50_000;
/** 严重度色阶（resident token）：绿=健康，黄=偏高，红=膨胀。 */
const HEALTH = { green: '#22c55e', yellow: '#eab308', red: '#ef4444' };
function colorOf(tokens) {
    if (tokens < 10_000)
        return HEALTH.green;
    if (tokens < 30_000)
        return HEALTH.yellow;
    return HEALTH.red;
}
/** 严重度对应的强调色（建议列表左侧条）。 */
function severityColor(severity) {
    switch (severity) {
        case 'high': return HEALTH.red;
        case 'medium': return HEALTH.yellow;
        default: return '#60a5fa';
    }
}
/** 格式化为 k 单位（保留 1 位，≥100k 取整）。 */
function formatK(tokens) {
    if (tokens >= 1000) {
        const k = tokens / 1000;
        return `${k >= 100 ? Math.round(k) : k.toFixed(1)}k`;
    }
    return String(tokens);
}
/**
 * Dock entry：常驻注入 token 圆环 + 点击展开面板。
 */
export function ContextAuditRing(props) {
    const { useStore, ensure, refresh, t } = props;
    const state = useStore((s) => s);
    const [open, setOpen] = useState(false);
    useEffect(() => {
        ensure();
    }, [ensure]);
    const report = state.report;
    const resident = report === null
        ? 0
        : report.injected.instructions.totalTokens
            + report.injected.skills.catalogDescriptionTokens
            + report.injected.tools.schemaTokens;
    const percent = Math.min(1, resident / FULL_SCALE);
    const color = state.state === 'error' ? HEALTH.red : colorOf(resident);
    const radius = 9;
    const circumference = 2 * Math.PI * radius;
    return (_jsxs("span", { "data-context-doctor": true, style: { display: 'inline-flex', alignItems: 'center', gap: 4, position: 'relative' }, children: [_jsxs("button", { type: "button", onClick: () => setOpen((v) => !v), title: t('cd.title'), "aria-label": t('cd.title'), style: {
                    background: 'none',
                    border: 'none',
                    padding: 2,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    borderRadius: 8,
                    transition: 'background 120ms ease',
                }, onMouseEnter: (e) => { e.currentTarget.style.background = 'rgba(128,128,128,0.12)'; }, onMouseLeave: (e) => { e.currentTarget.style.background = 'none'; }, children: [_jsxs("svg", { width: 26, height: 26, viewBox: "0 0 24 24", role: "img", "aria-hidden": "true", children: [_jsx("circle", { cx: 12, cy: 12, r: radius, fill: "none", stroke: "rgba(128,128,128,0.25)", strokeWidth: 2.5 }), _jsx("circle", { cx: 12, cy: 12, r: radius, fill: "none", stroke: color, strokeWidth: 2.5, strokeLinecap: "round", strokeDasharray: `${percent * circumference} ${circumference}`, transform: "rotate(-90 12 12)" })] }), _jsx("span", { style: { fontSize: 11, fontWeight: 600, color: state.state === 'error' ? HEALTH.red : '#666', whiteSpace: 'nowrap' }, children: state.state === 'loading'
                            ? t('cd.loading')
                            : state.state === 'error'
                                ? '!'
                                : report === null
                                    ? t('cd.empty')
                                    : `${formatK(resident)}t` })] }), open && (_jsxs("div", { role: "dialog", "aria-label": t('cd.title'), style: {
                    position: 'absolute',
                    right: 0,
                    bottom: 'calc(100% + 8px)',
                    width: 292,
                    background: '#fff',
                    border: '1px solid rgba(0,0,0,0.08)',
                    borderRadius: 12,
                    boxShadow: '0 12px 32px rgba(0,0,0,0.16), 0 2px 8px rgba(0,0,0,0.06)',
                    padding: '14px 14px 12px',
                    fontSize: 12,
                    color: '#1f2328',
                    zIndex: 100,
                    textAlign: 'left',
                }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }, children: [_jsx("strong", { style: { fontSize: 13 }, children: t('cd.title') }), _jsx("span", { style: { fontSize: 11, color: '#8b949e' }, children: t('cd.residentTokens') })] }), state.state === 'error' && (_jsxs("div", { style: { color: HEALTH.red, marginBottom: 8, lineHeight: 1.5 }, children: [t('cd.error'), ": ", state.error] })), report === null && state.state !== 'loading' && (_jsx("div", { style: { color: '#8b949e', padding: '8px 0' }, children: t('cd.empty') })), report !== null && (_jsxs(_Fragment, { children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }, children: [_jsxs("svg", { width: 44, height: 44, viewBox: "0 0 24 24", role: "img", "aria-hidden": "true", children: [_jsx("circle", { cx: 12, cy: 12, r: radius, fill: "none", stroke: "rgba(128,128,128,0.2)", strokeWidth: 2 }), _jsx("circle", { cx: 12, cy: 12, r: radius, fill: "none", stroke: color, strokeWidth: 2, strokeLinecap: "round", strokeDasharray: `${percent * circumference} ${circumference}`, transform: "rotate(-90 12 12)" })] }), _jsxs("div", { style: { lineHeight: 1.2 }, children: [_jsxs("div", { style: { fontSize: 18, fontWeight: 700, color }, children: [formatK(resident), "t"] }), _jsx("div", { style: { fontSize: 11, color: '#8b949e' }, children: t('cd.residentTokens') })] })] }), _jsxs("div", { style: { borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: 8 }, children: [_jsx(Row, { dot: HEALTH.green, label: t('cd.instructions'), value: `${formatK(report.injected.instructions.totalTokens)}t`, sub: report.injected.instructions.files.length > 0
                                            ? `${report.injected.instructions.files.length} ${t('cd.files')}` : undefined }), _jsx(Row, { dot: HEALTH.green, label: t('cd.skills'), value: `${formatK(report.injected.skills.catalogDescriptionTokens)}t`, sub: report.injected.skills.catalogCount > 0
                                            ? t('cd.catalog', { n: report.injected.skills.catalogCount }) : undefined }), _jsx(Row, { dot: HEALTH.green, label: t('cd.tools'), value: `${formatK(report.injected.tools.schemaTokens)}t`, sub: report.injected.tools.visibleCount > 0
                                            ? `${report.injected.tools.visibleCount} ${t('cd.toolsCount')}` : undefined }), _jsx(Row, { dot: HEALTH.yellow, label: t('cd.mcp'), value: report.injected.tools.mcp.totalTools > 0
                                            ? `${formatK(report.injected.tools.mcp.totalTokens)}t`
                                            : '—', sub: report.injected.tools.mcp.totalTools > 0
                                            ? t('cd.mcpTools', { n: report.injected.tools.mcp.totalTools }) : undefined })] }), _jsx("div", { style: {
                                    marginTop: 10,
                                    padding: '6px 10px',
                                    borderRadius: 8,
                                    background: report.suggestions.length > 0 ? 'rgba(234,179,8,0.12)' : 'rgba(34,197,94,0.10)',
                                    color: report.suggestions.length > 0 ? '#92400e' : '#15803d',
                                    fontSize: 11,
                                    fontWeight: 600,
                                }, children: report.suggestions.length > 0
                                    ? t('cd.suggestions', { n: report.suggestions.length })
                                    : '✓ ' + t('cd.healthy') }), report.suggestions.length > 0 && (_jsx("div", { style: { marginTop: 6, maxHeight: 96, overflowY: 'auto' }, children: report.suggestions.slice(0, 4).map((s, i) => (_jsxs("div", { style: {
                                        display: 'flex',
                                        gap: 6,
                                        padding: '3px 0',
                                        color: '#4b5563',
                                        lineHeight: 1.5,
                                        alignItems: 'flex-start',
                                    }, children: [_jsx("span", { style: {
                                                flexShrink: 0,
                                                width: 3,
                                                height: 'auto',
                                                alignSelf: 'stretch',
                                                borderRadius: 2,
                                                background: severityColor(s.severity),
                                                marginTop: 4,
                                            } }), _jsx("span", { children: s.text })] }, i))) }))] })), _jsxs("div", { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }, children: [_jsx("span", { style: { fontSize: 10, color: '#9ca3af' }, children: t('cd.hint') }), _jsx("button", { type: "button", onClick: () => refresh(), disabled: state.state === 'loading', style: {
                                    background: '#f3f4f6',
                                    border: '1px solid #e5e7eb',
                                    borderRadius: 6,
                                    padding: '3px 10px',
                                    fontSize: 11,
                                    cursor: 'pointer',
                                    color: '#374151',
                                }, children: t('cd.refresh') })] })] }))] }));
}
function Row({ dot, label, value, sub, }) {
    return (_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 6, padding: '3px 0' }, children: [_jsx("span", { style: { flexShrink: 0, width: 6, height: 6, borderRadius: 3, background: dot } }), _jsx("span", { style: { flex: 1, color: '#57606a' }, children: label }), _jsx("span", { style: { fontWeight: 600, whiteSpace: 'nowrap' }, children: value }), sub !== undefined && _jsx("span", { style: { fontSize: 10, color: '#9ca3af', whiteSpace: 'nowrap' }, children: sub })] }));
}
