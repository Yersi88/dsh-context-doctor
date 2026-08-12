import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/**
 * Context Doctor 圆环 + 展开面板（挂在 conversation.composer.dock）。
 * 圆环显示"常驻注入"估算 token（指令链 + 技能 catalog + 工具 schema），
 * 颜色按严重度分级；点击展开分项明细与建议数。数据经同源
 * `/api/context-doctor/audit` 拉取。
 * @module @dsh-external/context-doctor/client/ContextAuditRing
 */
import { useEffect, useState } from 'react';
import { NS } from "./locales.js";
/** 常驻注入的"满量程"基准（token）：超过即视为接近爆满。 */
const FULL_SCALE = 50_000;
/** 严重度色阶（resident token）。 */
function colorOf(tokens) {
    if (tokens < 10_000)
        return '#22c55e'; // 绿：健康
    if (tokens < 30_000)
        return '#eab308'; // 黄：偏高
    return '#ef4444'; // 红：膨胀
}
/** 格式化为 k 单位。 */
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
    const color = state.state === 'error' ? '#ef4444' : colorOf(resident);
    const radius = 9;
    const circumference = 2 * Math.PI * radius;
    return (_jsxs("span", { "data-context-doctor": true, style: { display: 'inline-flex', alignItems: 'center', gap: 4, position: 'relative' }, children: [_jsxs("button", { type: "button", onClick: () => setOpen((v) => !v), title: t('cd.title'), "aria-label": t('cd.title'), style: {
                    background: 'none',
                    border: 'none',
                    padding: 2,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                }, children: [_jsxs("svg", { width: 26, height: 26, viewBox: "0 0 24 24", role: "img", "aria-hidden": "true", children: [_jsx("circle", { cx: 12, cy: 12, r: radius, fill: "none", stroke: "rgba(128,128,128,0.3)", strokeWidth: 2.5 }), _jsx("circle", { cx: 12, cy: 12, r: radius, fill: "none", stroke: color, strokeWidth: 2.5, strokeLinecap: "round", strokeDasharray: `${percent * circumference} ${circumference}`, transform: "rotate(-90 12 12)" })] }), _jsx("span", { style: { fontSize: 11, color: state.state === 'error' ? '#ef4444' : '#666', whiteSpace: 'nowrap' }, children: state.state === 'loading'
                            ? t('cd.loading')
                            : state.state === 'error'
                                ? '!'
                                : report === null
                                    ? t('cd.empty')
                                    : `${formatK(resident)}t` })] }), open && (_jsxs("div", { role: "dialog", "aria-label": t('cd.title'), style: {
                    position: 'absolute',
                    right: 0,
                    bottom: 'calc(100% + 6px)',
                    width: 260,
                    background: '#fff',
                    border: '1px solid rgba(128,128,128,0.35)',
                    borderRadius: 10,
                    boxShadow: '0 8px 24px rgba(0,0,0,0.14)',
                    padding: '10px 12px',
                    fontSize: 12,
                    color: '#333',
                    zIndex: 100,
                    textAlign: 'left',
                }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }, children: [_jsx("strong", { children: t('cd.title') }), _jsx("span", { style: { fontSize: 11, color: '#888' }, children: t('cd.residentTokens') })] }), state.state === 'error' && (_jsxs("div", { style: { color: '#ef4444', marginBottom: 6 }, children: [t('cd.error'), ": ", state.error] })), report === null && state.state !== 'loading' && (_jsx("div", { style: { color: '#888' }, children: t('cd.empty') })), report !== null && (_jsxs(_Fragment, { children: [_jsx(Row, { label: t('cd.instructions'), value: `${formatK(report.injected.instructions.totalTokens)}t` }), _jsx(Row, { label: t('cd.skills'), value: `${formatK(report.injected.skills.catalogDescriptionTokens)}t / ${t('cd.catalog', { n: report.injected.skills.catalogCount })}` }), _jsx(Row, { label: t('cd.tools'), value: `${formatK(report.injected.tools.schemaTokens)}t` }), _jsx(Row, { label: t('cd.mcp'), value: report.injected.tools.mcp.totalTools > 0
                                    ? `${formatK(report.injected.tools.mcp.totalTokens)}t / ${t('cd.mcpTools', { n: report.injected.tools.mcp.totalTools })}`
                                    : '—' }), _jsx("div", { style: { marginTop: 8, color: report.suggestions.length > 0 ? '#b45309' : '#16a34a' }, children: report.suggestions.length > 0
                                    ? t('cd.suggestions', { n: report.suggestions.length })
                                    : '✓ healthy' }), _jsx("div", { style: { marginTop: 4, maxHeight: 120, overflowY: 'auto', color: '#666', lineHeight: 1.5 }, children: report.suggestions.slice(0, 4).map((s, i) => (_jsxs("div", { children: ["\u00B7 [", s.severity, "] ", s.text] }, i))) })] })), _jsx("button", { type: "button", onClick: () => refresh(), disabled: state.state === 'loading', style: {
                            marginTop: 8,
                            background: '#f3f4f6',
                            border: '1px solid #d1d5db',
                            borderRadius: 6,
                            padding: '3px 10px',
                            fontSize: 11,
                            cursor: 'pointer',
                            color: '#333',
                        }, children: t('cd.refresh') })] }))] }));
}
function Row({ label, value }) {
    return (_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', gap: 8, padding: '2px 0' }, children: [_jsx("span", { style: { color: '#666' }, children: label }), _jsx("span", { style: { fontWeight: 500, whiteSpace: 'nowrap' }, children: value })] }));
}
