import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
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
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
const AUDIT_API = '/api/context-doctor/audit';
/** Budget the ring measures against; the audit itself is budget-agnostic. */
const FULL_SCALE = 50_000;
/** Entries listed before a breakdown collapses into a "+N more" line. */
const DETAIL_LIMIT = 6;
const TONE = {
    canvas: 'var(--dsw-alias-bg-layer-1, #121826)',
    raised: 'var(--dsw-alias-bg-layer-2, #171f2e)',
    row: 'var(--dsw-alias-bg-layer-3, #1d2637)',
    border: 'var(--dsw-alias-border-l2, rgba(196, 211, 232, 0.16))',
    borderStrong: 'var(--dsw-alias-border-l3, rgba(196, 211, 232, 0.3))',
    text: 'var(--dsw-alias-label-primary, #f2f6fc)',
    muted: 'var(--dsw-alias-label-secondary, #9daabd)',
    quiet: 'var(--dsw-alias-label-tertiary, #6f7c91)',
    mint: 'var(--dsw-alias-state-success-primary, #46b97a)',
    amber: 'var(--dsw-alias-state-warn-primary, #d99a1f)',
    red: 'var(--dsw-alias-state-error-primary, #e2566a)',
    blue: 'var(--dsw-alias-brand-primary, #4a7dff)',
    violet: '#8a6bd8',
};
const MONO = 'ui-monospace, "Cascadia Mono", "SFMono-Regular", Consolas, monospace';
function formatK(tokens) {
    if (tokens < 1000)
        return String(tokens);
    const value = tokens / 1000;
    if (value >= 100 || Number.isInteger(value))
        return `${Math.round(value)}k`;
    return `${value.toFixed(1)}k`;
}
/** Trailing path segment; the full path stays in the row's `title`. */
function baseName(path) {
    const parts = path.split(/[/\\]/).filter(Boolean);
    const last = parts.at(-1) ?? path;
    const parent = parts.at(-2);
    return parent === undefined ? last : `${parent}/${last}`;
}
function healthLevel(tokens) {
    if (tokens < 10_000)
        return 'mint';
    if (tokens < 30_000)
        return 'amber';
    return 'red';
}
/**
 * Build the four non-overlapping budget slices.
 *
 * MCP schema tokens are a subset of `tools.schemaTokens`, so the tool slice
 * carries `nativeTokens` only — otherwise the shares sum past 100%.
 */
function buildSegments(report, t) {
    const { instructions, skills, tools } = report.injected;
    const receipt = report.receipt;
    const schemaRows = (receipt?.toolSchemas.items ?? [])
        .filter(item => item.server === undefined)
        .sort((a, b) => b.tokens - a.tokens)
        .map(item => ({ name: item.name, tokens: item.tokens }));
    const mcpSchemaRows = (receipt?.toolSchemas.items ?? [])
        .filter(item => item.server !== undefined)
        .sort((a, b) => b.tokens - a.tokens)
        .map(item => ({ name: item.name, tokens: item.tokens }));
    return [{
            key: 'instructions',
            label: t('cd.instructions'),
            sub: instructions.files.length === 0 ? t('cd.emptyCategory') : t('cd.instructions.sub', { n: instructions.files.length }),
            tokens: instructions.totalTokens,
            color: TONE.blue,
            detail: instructions.files.length === 0 ? null : {
                title: t('cd.byFile'),
                rows: instructions.files.map(file => ({ name: baseName(file.path), tokens: file.tokens })),
                ...instructions.duplicateBlocks.length > 0 ? {
                    note: t('cd.duplicateBlocks', {
                        n: instructions.duplicateBlocks.length,
                        tokens: instructions.duplicateBlocks.reduce((sum, block) => sum + block.tokens, 0),
                    }),
                } : {},
            },
        }, {
            key: 'skills',
            label: t('cd.skills'),
            sub: skills.catalogCount === 0 ? t('cd.emptyCategory') : t('cd.skills.sub', { n: skills.catalogCount }),
            tokens: skills.catalogDescriptionTokens,
            color: TONE.violet,
            detail: skills.bySource.length === 0 ? null : {
                title: t('cd.bySource'),
                rows: [...skills.bySource]
                    .sort((a, b) => b.descriptionTokens - a.descriptionTokens)
                    .map(source => ({ name: `${source.source} · ${source.count}`, tokens: source.descriptionTokens })),
                ...skills.duplicateDescriptions.length > 0
                    ? { note: t('cd.duplicateSkills', { n: skills.duplicateDescriptions.length }) }
                    : report.conflicts.length > 0 ? { note: t('cd.shadowed', { n: report.conflicts.length }) } : {},
            },
        }, {
            key: 'tools',
            label: t('cd.tools'),
            sub: tools.nativeCount === 0 ? t('cd.emptyCategory') : t('cd.tools.sub', { n: tools.nativeCount }),
            tokens: tools.nativeTokens,
            color: TONE.amber,
            detail: schemaRows.length === 0 ? null : { title: t('cd.topSchemas'), rows: schemaRows },
        }, {
            key: 'mcp',
            label: t('cd.mcp'),
            sub: tools.mcp.totalTools === 0
                ? t('cd.emptyCategory')
                : t('cd.mcp.sub', { n: tools.mcp.totalTools, servers: tools.mcp.servers.length }),
            tokens: tools.mcp.totalTokens,
            color: TONE.mint,
            detail: tools.mcp.servers.length === 0 ? null : {
                title: mcpSchemaRows.length > 0 ? t('cd.topSchemas') : t('cd.byServer'),
                rows: mcpSchemaRows.length > 0
                    ? mcpSchemaRows
                    : [...tools.mcp.servers]
                        .sort((a, b) => b.schemaTokens - a.schemaTokens)
                        .map(server => ({ name: `${server.server} · ${server.tools}`, tokens: server.schemaTokens })),
            },
        }];
}
function PulseIcon({ size = 20 }) {
    return _jsx("svg", { width: size, height: size, viewBox: "0 0 24 24", fill: "none", "aria-hidden": "true", children: _jsx("path", { d: "M3 12h4l2.05-5 3.62 10L15.2 12H21", stroke: "currentColor", strokeWidth: "1.8", strokeLinecap: "round", strokeLinejoin: "round" }) });
}
function ChevronIcon({ open }) {
    return _jsx("svg", { width: "12", height: "12", viewBox: "0 0 24 24", fill: "none", "aria-hidden": "true", style: { transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 120ms ease' }, children: _jsx("path", { d: "m9 5 7 7-7 7", stroke: "currentColor", strokeWidth: "2.2", strokeLinecap: "round", strokeLinejoin: "round" }) });
}
function RefreshIcon() {
    return _jsx("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", "aria-hidden": "true", children: _jsx("path", { d: "M20 11a8 8 0 0 0-14.98-3.8M4 5v4h4M4 13a8 8 0 0 0 14.98 3.8M20 19v-4h-4", stroke: "currentColor", strokeWidth: "1.9", strokeLinecap: "round", strokeLinejoin: "round" }) });
}
/** Resident control in the tool row, just before Send. */
export function ContextAuditRing(props) {
    const { useStore, actions, sessionId, t } = props;
    const state = useStore(snapshot => snapshot);
    const [open, setOpen] = useState(false);
    const [expanded, setExpanded] = useState(null);
    const panelId = useId();
    const dockRef = useRef(null);
    const controllerRef = useRef(null);
    const refresh = useCallback(() => {
        controllerRef.current?.abort();
        const controller = new AbortController();
        controllerRef.current = controller;
        actions.setState('loading', null);
        // `detail=developer` carries the per-entry receipt the breakdown lists.
        const url = `${AUDIT_API}?session=${encodeURIComponent(sessionId)}&detail=developer`;
        void fetch(url, { signal: controller.signal }).then(response => {
            if (!response.ok)
                throw new Error(`audit ${response.status}`);
            return response.json();
        }).then(data => {
            if (controller.signal.aborted)
                return;
            if (data.ok && data.report !== null && data.report !== undefined)
                actions.setReport(data.report);
            else
                actions.setState('error', 'empty audit response');
        }, () => {
            if (!controller.signal.aborted)
                actions.setState('error', 'audit transport error');
        });
    }, [actions, sessionId]);
    useEffect(() => {
        refresh();
        return () => controllerRef.current?.abort();
    }, [refresh]);
    // Dismiss on Escape or on any pointer landing outside the control.
    useEffect(() => {
        if (!open)
            return undefined;
        const onKeyDown = (event) => { if (event.key === 'Escape')
            setOpen(false); };
        const onPointerDown = (event) => {
            const dock = dockRef.current;
            if (dock !== null && event.target instanceof Node && !dock.contains(event.target))
                setOpen(false);
        };
        document.addEventListener('keydown', onKeyDown);
        // Capture phase: a click handled (and stopped) by page content still closes.
        document.addEventListener('pointerdown', onPointerDown, true);
        return () => {
            document.removeEventListener('keydown', onKeyDown);
            document.removeEventListener('pointerdown', onPointerDown, true);
        };
    }, [open]);
    const report = state.report;
    const segments = useMemo(() => report === null ? [] : buildSegments(report, t), [report, t]);
    const resident = segments.reduce((sum, segment) => sum + segment.tokens, 0);
    const percent = Math.min(resident / FULL_SCALE, 1);
    const level = state.state === 'error' ? 'red' : healthLevel(resident);
    const accent = TONE[level];
    const suggestions = report?.suggestions ?? [];
    const status = state.state === 'error'
        ? t('cd.error')
        : level === 'red' ? t('cd.heavy') : suggestions.length > 0 ? t('cd.review') : t('cd.healthy');
    const statusHint = level === 'red'
        ? t('cd.heavyHint')
        : suggestions.length > 0 ? t('cd.reviewHint') : t('cd.healthyHint');
    const updated = state.refreshedAt === null ? '—' : (() => {
        const seconds = Math.max(0, Math.round((Date.now() - state.refreshedAt) / 1000));
        if (seconds < 10)
            return t('cd.justNow');
        if (seconds < 60)
            return t('cd.secondsAgo', { n: seconds });
        return t('cd.minutesAgo', { n: Math.round(seconds / 60) });
    })();
    return _jsxs("span", { ref: dockRef, "data-context-doctor": true, style: dockStyle, children: [_jsxs("button", { type: "button", onClick: () => setOpen(value => !value), title: t('cd.hint'), "aria-label": t('cd.title'), "aria-expanded": open, "aria-controls": panelId, style: triggerStyle, children: [_jsx("span", { style: { color: accent, display: 'inline-flex' }, children: _jsx(PulseIcon, { size: 15 }) }), _jsx("span", { style: triggerLabelStyle, children: t('cd.title') }), _jsx("span", { "aria-hidden": "true", style: { ...triggerDotStyle, background: accent } })] }), open && _jsxs("section", { id: panelId, role: "dialog", "aria-label": t('cd.title'), style: panelStyle, children: [_jsxs("header", { style: headerStyle, children: [_jsx("span", { style: { color: accent, display: 'inline-flex' }, children: _jsx(PulseIcon, { size: 17 }) }), _jsxs("div", { style: { minWidth: 0 }, children: [_jsx("h2", { style: titleStyle, children: t('cd.title') }), _jsx("p", { style: subtitleStyle, children: t('cd.subtitle') })] }), _jsx("span", { style: { ...statusPillStyle, color: accent, borderColor: accent }, children: status })] }), state.state === 'error' && _jsxs("p", { style: errorStyle, children: [t('cd.error'), ": ", state.error] }), report === null && state.state !== 'error'
                        ? _jsx("p", { style: emptyStyle, children: state.state === 'loading' ? t('cd.loading') : t('cd.emptyState') })
                        : report !== null && _jsxs(_Fragment, { children: [_jsxs("div", { style: summaryStyle, children: [_jsxs("div", { style: summaryHeadStyle, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'baseline', gap: 7, minWidth: 0 }, children: [_jsx("strong", { style: totalStyle, children: formatK(resident) }), _jsx("span", { style: totalUnitStyle, children: t('cd.tokens') })] }), _jsxs("span", { style: budgetStyle, children: [Math.round(percent * 100), "% \u00B7 ", t('cd.ofBudget', { budget: formatK(FULL_SCALE) })] })] }), _jsx("div", { style: barTrackStyle, "aria-hidden": "true", children: resident > 0 && segments.filter(segment => segment.tokens > 0).map(segment => _jsx("span", { style: {
                                                    width: `${(segment.tokens / resident) * 100}%`,
                                                    background: segment.color,
                                                    height: '100%',
                                                } }, segment.key)) }), _jsx("span", { style: totalCaptionStyle, children: t('cd.total') })] }), _jsx("ul", { style: listStyle, children: segments.map(segment => {
                                        const share = resident === 0 ? 0 : segment.tokens / resident;
                                        const isOpen = expanded === segment.key;
                                        const canExpand = segment.detail !== null;
                                        return _jsxs("li", { style: listItemStyle, children: [_jsxs("button", { type: "button", disabled: !canExpand, onClick: () => setExpanded(current => current === segment.key ? null : segment.key), "aria-expanded": isOpen, title: canExpand ? (isOpen ? t('cd.collapse') : t('cd.expand')) : t('cd.noDetail'), style: { ...rowStyle, cursor: canExpand ? 'pointer' : 'default', opacity: canExpand ? 1 : 0.62 }, children: [_jsx("span", { style: { ...chevronStyle, color: canExpand ? TONE.quiet : 'transparent' }, children: _jsx(ChevronIcon, { open: isOpen }) }), _jsx("span", { "aria-hidden": "true", style: { ...swatchStyle, background: segment.color } }), _jsxs("span", { style: { minWidth: 0 }, children: [_jsx("span", { style: rowLabelStyle, children: segment.label }), _jsx("span", { style: rowSubStyle, children: segment.sub })] }), _jsx("span", { style: rowTokensStyle, children: formatK(segment.tokens) }), _jsxs("span", { style: rowShareStyle, children: [Math.round(share * 100), "%"] })] }), isOpen && segment.detail !== null && _jsxs("div", { style: detailStyle, children: [_jsx("span", { style: detailTitleStyle, children: segment.detail.title }), _jsx("ol", { style: detailListStyle, children: segment.detail.rows.slice(0, DETAIL_LIMIT).map(row => {
                                                                const rowShare = segment.tokens === 0 ? 0 : row.tokens / segment.tokens;
                                                                return _jsxs("li", { style: detailRowStyle, title: row.name, children: [_jsx("span", { style: detailNameStyle, children: row.name }), _jsx("span", { style: detailBarStyle, children: _jsx("span", { style: { display: 'block', width: `${Math.max(rowShare * 100, 2)}%`, height: '100%', background: segment.color, borderRadius: 2 } }) }), _jsx("span", { style: detailTokensStyle, children: formatK(row.tokens) })] }, row.name);
                                                            }) }), segment.detail.rows.length > DETAIL_LIMIT
                                                            && _jsx("span", { style: detailMoreStyle, children: t('cd.more', { n: segment.detail.rows.length - DETAIL_LIMIT }) }), segment.detail.note !== undefined && _jsx("span", { style: detailNoteStyle, children: segment.detail.note })] })] }, segment.key);
                                    }) }), _jsxs("div", { style: healthStyle, children: [_jsx("strong", { style: { ...healthTitleStyle, color: accent }, children: status }), _jsx("p", { style: healthCopyStyle, children: statusHint }), suggestions.length > 0 && _jsx("ol", { style: suggestionListStyle, children: suggestions.slice(0, 3).map(suggestion => {
                                                const tone = suggestion.severity === 'high' ? TONE.red : suggestion.severity === 'medium' ? TONE.amber : TONE.mint;
                                                return _jsxs("li", { style: suggestionStyle, children: [_jsx("span", { "aria-hidden": "true", style: { ...suggestionDotStyle, background: tone } }), _jsx("span", { style: suggestionCopyStyle, children: suggestion.text })] }, suggestion.text);
                                            }) })] })] }), _jsxs("footer", { style: footerStyle, children: [_jsx("span", { style: updatedStyle, children: t('cd.updated', { when: updated }) }), _jsxs("button", { type: "button", onClick: refresh, disabled: state.state === 'loading', style: refreshStyle, children: [_jsx(RefreshIcon, {}), t('cd.refresh')] })] })] })] });
}
const dockStyle = { display: 'inline-flex', alignItems: 'center', position: 'relative', fontFamily: MONO };
const triggerStyle = { display: 'inline-flex', alignItems: 'center', gap: 6, minHeight: 31, padding: '4px 9px', color: TONE.text, background: TONE.raised, border: `1px solid ${TONE.border}`, borderRadius: 7, cursor: 'pointer', fontFamily: MONO, fontWeight: 430 };
const triggerLabelStyle = { color: TONE.text, fontSize: 12, fontWeight: 430, whiteSpace: 'nowrap' };
const triggerDotStyle = { width: 7, height: 7, marginLeft: 1, borderRadius: 99 };
const panelStyle = { position: 'absolute', zIndex: 1000, right: 0, bottom: 'calc(100% + 12px)', width: 428, maxWidth: 'calc(100vw - 24px)', maxHeight: 'min(70vh, 620px)', overflowX: 'hidden', overflowY: 'auto', color: TONE.text, background: TONE.canvas, border: `1px solid ${TONE.borderStrong}`, borderRadius: 12, boxShadow: '0 18px 44px rgba(3, 8, 18, 0.34)', textAlign: 'left', fontFamily: MONO, fontWeight: 400 };
const headerStyle = { display: 'grid', gridTemplateColumns: '20px minmax(0, 1fr) auto', alignItems: 'center', columnGap: 10, padding: '14px 16px 13px', borderBottom: `1px solid ${TONE.border}` };
const titleStyle = { margin: 0, color: TONE.text, fontFamily: MONO, fontSize: 14, fontWeight: 480, letterSpacing: '-0.01em', lineHeight: 1.2 };
const subtitleStyle = { margin: '3px 0 0', color: TONE.muted, fontFamily: MONO, fontSize: 11.5, fontWeight: 400, lineHeight: 1.2 };
const statusPillStyle = { padding: '3px 9px', border: '1px solid', borderRadius: 99, fontSize: 11, fontWeight: 460, whiteSpace: 'nowrap' };
const errorStyle = { margin: '12px 16px 0', color: TONE.red, fontSize: 12, lineHeight: 1.45 };
const emptyStyle = { margin: 0, padding: '34px 16px', color: TONE.muted, fontSize: 12.5, textAlign: 'center' };
const summaryStyle = { padding: '15px 16px 14px', borderBottom: `1px solid ${TONE.border}` };
const summaryHeadStyle = { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 };
const totalStyle = { color: TONE.text, fontSize: 27, fontWeight: 460, lineHeight: 1, letterSpacing: '-0.035em', fontVariantNumeric: 'tabular-nums' };
const totalUnitStyle = { color: TONE.muted, fontSize: 12, fontWeight: 400 };
const budgetStyle = { color: TONE.muted, fontSize: 11.5, fontWeight: 400, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' };
const barTrackStyle = { display: 'flex', gap: 2, height: 7, margin: '12px 0 0', overflow: 'hidden', background: TONE.row, borderRadius: 99 };
const totalCaptionStyle = { display: 'block', marginTop: 9, color: TONE.quiet, fontSize: 11, fontWeight: 400 };
const listStyle = { margin: 0, padding: '5px 8px 7px', listStyle: 'none', borderBottom: `1px solid ${TONE.border}` };
const listItemStyle = { listStyle: 'none' };
const rowStyle = { display: 'grid', width: '100%', gridTemplateColumns: '16px 9px minmax(0, 1fr) auto 38px', alignItems: 'center', columnGap: 9, padding: '9px 8px', color: TONE.text, background: 'transparent', border: 0, borderRadius: 7, textAlign: 'left', fontFamily: MONO };
const chevronStyle = { display: 'inline-flex', justifyContent: 'center' };
const swatchStyle = { width: 9, height: 9, borderRadius: 3 };
const rowLabelStyle = { display: 'block', overflow: 'hidden', color: TONE.text, fontSize: 12.5, fontWeight: 440, textOverflow: 'ellipsis', whiteSpace: 'nowrap' };
const rowSubStyle = { display: 'block', marginTop: 2, overflow: 'hidden', color: TONE.quiet, fontSize: 11, fontWeight: 400, textOverflow: 'ellipsis', whiteSpace: 'nowrap' };
const rowTokensStyle = { color: TONE.text, fontSize: 12.5, fontWeight: 440, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' };
const rowShareStyle = { color: TONE.muted, fontSize: 12, fontWeight: 430, fontVariantNumeric: 'tabular-nums', textAlign: 'right' };
const detailStyle = { display: 'flex', flexDirection: 'column', gap: 7, margin: '0 8px 9px 33px', padding: '10px 11px', background: TONE.row, borderRadius: 8 };
// No uppercasing here: the dictionaries mix CJK with Latin product nouns, and
// `text-transform` would shout the Latin half ("占用最大的 SCHEMA").
const detailTitleStyle = { color: TONE.quiet, fontSize: 10.5, fontWeight: 460 };
const detailListStyle = { display: 'flex', flexDirection: 'column', gap: 6, margin: 0, padding: 0, listStyle: 'none' };
const detailRowStyle = { display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 54px 42px', alignItems: 'center', columnGap: 9 };
const detailNameStyle = { overflow: 'hidden', color: TONE.muted, fontSize: 11.5, fontWeight: 400, textOverflow: 'ellipsis', whiteSpace: 'nowrap' };
const detailBarStyle = { height: 4, background: TONE.borderStrong, borderRadius: 2, overflow: 'hidden' };
const detailTokensStyle = { color: TONE.text, fontSize: 11.5, fontWeight: 430, fontVariantNumeric: 'tabular-nums', textAlign: 'right' };
const detailMoreStyle = { color: TONE.quiet, fontSize: 11, fontWeight: 400 };
const detailNoteStyle = { marginTop: 1, color: TONE.amber, fontSize: 11, fontWeight: 400, lineHeight: 1.4 };
const healthStyle = { padding: '13px 16px 14px', borderBottom: `1px solid ${TONE.border}` };
const healthTitleStyle = { display: 'block', fontSize: 12.5, fontWeight: 470 };
const healthCopyStyle = { margin: '5px 0 0', color: TONE.muted, fontSize: 11.5, fontWeight: 400, lineHeight: 1.5 };
const suggestionListStyle = { display: 'flex', flexDirection: 'column', gap: 6, margin: '11px 0 0', padding: 0, listStyle: 'none' };
const suggestionStyle = { display: 'grid', gridTemplateColumns: '7px minmax(0, 1fr)', alignItems: 'start', columnGap: 9 };
const suggestionDotStyle = { width: 6, height: 6, marginTop: 5, borderRadius: 99 };
const suggestionCopyStyle = { color: TONE.muted, fontSize: 11.5, fontWeight: 400, lineHeight: 1.45 };
const footerStyle = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '11px 16px 12px' };
const updatedStyle = { color: TONE.quiet, fontSize: 11, fontWeight: 400, fontVariantNumeric: 'tabular-nums' };
const refreshStyle = { display: 'inline-flex', alignItems: 'center', gap: 6, padding: 0, color: TONE.blue, background: 'transparent', border: 0, cursor: 'pointer', fontFamily: MONO, fontSize: 12, fontWeight: 440 };
