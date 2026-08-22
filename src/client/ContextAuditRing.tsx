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

import { useCallback, useEffect, useId, useMemo, useRef, useState, type CSSProperties, type ReactElement } from 'react'
import type { PropsLocale, PropsRuntime, PropsStore } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type { AuditReport } from '../audit.ts'
import type { AuditUiState } from './store.ts'
import type { createAuditStore } from './store.ts'
import { NS } from './locales.ts'

export type ContextAuditRingProps =
  PropsRuntime<'conversation.input.right'>
  & PropsStore<ReturnType<typeof createAuditStore>>
  & PropsLocale<typeof NS>

const AUDIT_API = '/api/context-doctor/audit'
/** Budget the ring measures against; the audit itself is budget-agnostic. */
const FULL_SCALE = 50_000
/** Entries listed before a breakdown collapses into a "+N more" line. */
const DETAIL_LIMIT = 6

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
} as const

const MONO = 'ui-monospace, "Cascadia Mono", "SFMono-Regular", Consolas, monospace'

/** One non-overlapping slice of the resident budget. */
interface Segment {
  key: 'instructions' | 'skills' | 'tools' | 'mcp'
  label: string
  sub: string
  tokens: number
  color: string
  detail: { title: string; rows: { name: string; tokens: number }[]; note?: string } | null
}

function formatK(tokens: number): string {
  if (tokens < 1000) return String(tokens)
  const value = tokens / 1000
  if (value >= 100 || Number.isInteger(value)) return `${Math.round(value)}k`
  return `${value.toFixed(1)}k`
}

/** Trailing path segment; the full path stays in the row's `title`. */
function baseName(path: string): string {
  const parts = path.split(/[/\\]/).filter(Boolean)
  const last = parts.at(-1) ?? path
  const parent = parts.at(-2)
  return parent === undefined ? last : `${parent}/${last}`
}

function healthLevel(tokens: number): 'mint' | 'amber' | 'red' {
  if (tokens < 10_000) return 'mint'
  if (tokens < 30_000) return 'amber'
  return 'red'
}

/**
 * Build the four non-overlapping budget slices.
 *
 * MCP schema tokens are a subset of `tools.schemaTokens`, so the tool slice
 * carries `nativeTokens` only — otherwise the shares sum past 100%.
 */
function buildSegments(report: AuditReport, t: ContextAuditRingProps['t']): Segment[] {
  const { instructions, skills, tools } = report.injected
  const receipt = report.receipt

  const schemaRows = (receipt?.toolSchemas.items ?? [])
    .filter(item => item.server === undefined)
    .sort((a, b) => b.tokens - a.tokens)
    .map(item => ({ name: item.name, tokens: item.tokens }))

  const mcpSchemaRows = (receipt?.toolSchemas.items ?? [])
    .filter(item => item.server !== undefined)
    .sort((a, b) => b.tokens - a.tokens)
    .map(item => ({ name: item.name, tokens: item.tokens }))

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
  }]
}

function PulseIcon({ size = 20 }: { size?: number }): ReactElement {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M3 12h4l2.05-5 3.62 10L15.2 12H21" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
}

function ChevronIcon({ open }: { open: boolean }): ReactElement {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true"
    style={{ transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 120ms ease' }}>
    <path d="m9 5 7 7-7 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
}

function RefreshIcon(): ReactElement {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M20 11a8 8 0 0 0-14.98-3.8M4 5v4h4M4 13a8 8 0 0 0 14.98 3.8M20 19v-4h-4" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
}

/** Resident control in the tool row, just before Send. */
export function ContextAuditRing(props: ContextAuditRingProps): ReactElement {
  const { useStore, actions, sessionId, t } = props
  const state: AuditUiState = useStore(snapshot => snapshot)
  const [open, setOpen] = useState(false)
  const [expanded, setExpanded] = useState<Segment['key'] | null>(null)
  const panelId = useId()
  const dockRef = useRef<HTMLSpanElement | null>(null)
  const controllerRef = useRef<AbortController | null>(null)

  const refresh = useCallback(() => {
    controllerRef.current?.abort()
    const controller = new AbortController()
    controllerRef.current = controller
    actions.setState('loading', null)
    // `detail=developer` carries the per-entry receipt the breakdown lists.
    const url = `${AUDIT_API}?session=${encodeURIComponent(sessionId)}&detail=developer`
    void fetch(url, { signal: controller.signal }).then(response => {
      if (!response.ok) throw new Error(`audit ${response.status}`)
      return response.json() as Promise<{ ok: boolean; report: AuditUiState['report'] }>
    }).then(data => {
      if (controller.signal.aborted) return
      if (data.ok && data.report !== null && data.report !== undefined) actions.setReport(data.report)
      else actions.setState('error', 'empty audit response')
    }, () => {
      if (!controller.signal.aborted) actions.setState('error', 'audit transport error')
    })
  }, [actions, sessionId])

  useEffect(() => {
    refresh()
    return () => controllerRef.current?.abort()
  }, [refresh])

  // Dismiss on Escape or on any pointer landing outside the control.
  useEffect(() => {
    if (!open) return undefined
    const onKeyDown = (event: KeyboardEvent): void => { if (event.key === 'Escape') setOpen(false) }
    const onPointerDown = (event: PointerEvent): void => {
      const dock = dockRef.current
      if (dock !== null && event.target instanceof Node && !dock.contains(event.target)) setOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    // Capture phase: a click handled (and stopped) by page content still closes.
    document.addEventListener('pointerdown', onPointerDown, true)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('pointerdown', onPointerDown, true)
    }
  }, [open])

  const report = state.report
  const segments = useMemo(() => report === null ? [] : buildSegments(report, t), [report, t])
  const resident = segments.reduce((sum, segment) => sum + segment.tokens, 0)
  const percent = Math.min(resident / FULL_SCALE, 1)
  const level = state.state === 'error' ? 'red' : healthLevel(resident)
  const accent = TONE[level]
  const suggestions = report?.suggestions ?? []
  const status = state.state === 'error'
    ? t('cd.error')
    : level === 'red' ? t('cd.heavy') : suggestions.length > 0 ? t('cd.review') : t('cd.healthy')
  const statusHint = level === 'red'
    ? t('cd.heavyHint')
    : suggestions.length > 0 ? t('cd.reviewHint') : t('cd.healthyHint')

  const updated = state.refreshedAt === null ? '—' : (() => {
    const seconds = Math.max(0, Math.round((Date.now() - state.refreshedAt) / 1000))
    if (seconds < 10) return t('cd.justNow')
    if (seconds < 60) return t('cd.secondsAgo', { n: seconds })
    return t('cd.minutesAgo', { n: Math.round(seconds / 60) })
  })()

  return <span ref={dockRef} data-context-doctor style={dockStyle}>
    <button type="button" onClick={() => setOpen(value => !value)} title={t('cd.hint')} aria-label={t('cd.title')}
      aria-expanded={open} aria-controls={panelId} style={triggerStyle}>
      <span style={{ color: accent, display: 'inline-flex' }}><PulseIcon size={15} /></span>
      <span style={triggerLabelStyle}>{t('cd.title')}</span>
      <span aria-hidden="true" style={{ ...triggerDotStyle, background: accent }} />
    </button>

    {open && <section id={panelId} role="dialog" aria-label={t('cd.title')} style={panelStyle}>
      <header style={headerStyle}>
        <span style={{ color: accent, display: 'inline-flex' }}><PulseIcon size={17} /></span>
        <div style={{ minWidth: 0 }}>
          <h2 style={titleStyle}>{t('cd.title')}</h2>
          <p style={subtitleStyle}>{t('cd.subtitle')}</p>
        </div>
        <span style={{ ...statusPillStyle, color: accent, borderColor: accent }}>{status}</span>
      </header>

      {state.state === 'error' && <p style={errorStyle}>{t('cd.error')}: {state.error}</p>}

      {report === null && state.state !== 'error'
        ? <p style={emptyStyle}>{state.state === 'loading' ? t('cd.loading') : t('cd.emptyState')}</p>
        : report !== null && <>
          <div style={summaryStyle}>
            <div style={summaryHeadStyle}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 7, minWidth: 0 }}>
                <strong style={totalStyle}>{formatK(resident)}</strong>
                <span style={totalUnitStyle}>{t('cd.tokens')}</span>
              </div>
              <span style={budgetStyle}>
                {Math.round(percent * 100)}% · {t('cd.ofBudget', { budget: formatK(FULL_SCALE) })}
              </span>
            </div>
            <div style={barTrackStyle} aria-hidden="true">
              {resident > 0 && segments.filter(segment => segment.tokens > 0).map(segment =>
                <span key={segment.key} style={{
                  width: `${(segment.tokens / resident) * 100}%`,
                  background: segment.color,
                  height: '100%',
                }} />)}
            </div>
            <span style={totalCaptionStyle}>{t('cd.total')}</span>
          </div>

          <ul style={listStyle}>
            {segments.map(segment => {
              const share = resident === 0 ? 0 : segment.tokens / resident
              const isOpen = expanded === segment.key
              const canExpand = segment.detail !== null
              return <li key={segment.key} style={listItemStyle}>
                <button type="button" disabled={!canExpand}
                  onClick={() => setExpanded(current => current === segment.key ? null : segment.key)}
                  aria-expanded={isOpen}
                  title={canExpand ? (isOpen ? t('cd.collapse') : t('cd.expand')) : t('cd.noDetail')}
                  style={{ ...rowStyle, cursor: canExpand ? 'pointer' : 'default', opacity: canExpand ? 1 : 0.62 }}>
                  <span style={{ ...chevronStyle, color: canExpand ? TONE.quiet : 'transparent' }}>
                    <ChevronIcon open={isOpen} />
                  </span>
                  <span aria-hidden="true" style={{ ...swatchStyle, background: segment.color }} />
                  <span style={{ minWidth: 0 }}>
                    <span style={rowLabelStyle}>{segment.label}</span>
                    <span style={rowSubStyle}>{segment.sub}</span>
                  </span>
                  <span style={rowTokensStyle}>{formatK(segment.tokens)}</span>
                  <span style={rowShareStyle}>{Math.round(share * 100)}%</span>
                </button>

                {isOpen && segment.detail !== null && <div style={detailStyle}>
                  <span style={detailTitleStyle}>{segment.detail.title}</span>
                  <ol style={detailListStyle}>
                    {segment.detail.rows.slice(0, DETAIL_LIMIT).map(row => {
                      const rowShare = segment.tokens === 0 ? 0 : row.tokens / segment.tokens
                      return <li key={row.name} style={detailRowStyle} title={row.name}>
                        <span style={detailNameStyle}>{row.name}</span>
                        <span style={detailBarStyle}>
                          <span style={{ display: 'block', width: `${Math.max(rowShare * 100, 2)}%`, height: '100%', background: segment.color, borderRadius: 2 }} />
                        </span>
                        <span style={detailTokensStyle}>{formatK(row.tokens)}</span>
                      </li>
                    })}
                  </ol>
                  {segment.detail.rows.length > DETAIL_LIMIT
                    && <span style={detailMoreStyle}>{t('cd.more', { n: segment.detail.rows.length - DETAIL_LIMIT })}</span>}
                  {segment.detail.note !== undefined && <span style={detailNoteStyle}>{segment.detail.note}</span>}
                </div>}
              </li>
            })}
          </ul>

          <div style={healthStyle}>
            <strong style={{ ...healthTitleStyle, color: accent }}>{status}</strong>
            <p style={healthCopyStyle}>{statusHint}</p>
            {suggestions.length > 0 && <ol style={suggestionListStyle}>
              {suggestions.slice(0, 3).map(suggestion => {
                const tone = suggestion.severity === 'high' ? TONE.red : suggestion.severity === 'medium' ? TONE.amber : TONE.mint
                return <li key={suggestion.text} style={suggestionStyle}>
                  <span aria-hidden="true" style={{ ...suggestionDotStyle, background: tone }} />
                  <span style={suggestionCopyStyle}>{suggestion.text}</span>
                </li>
              })}
            </ol>}
          </div>
        </>}

      <footer style={footerStyle}>
        <span style={updatedStyle}>{t('cd.updated', { when: updated })}</span>
        <button type="button" onClick={refresh} disabled={state.state === 'loading'} style={refreshStyle}>
          <RefreshIcon />{t('cd.refresh')}
        </button>
      </footer>
    </section>}
  </span>
}

const dockStyle: CSSProperties = { display: 'inline-flex', alignItems: 'center', position: 'relative', fontFamily: MONO }
const triggerStyle: CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 6, minHeight: 31, padding: '4px 9px', color: TONE.text, background: TONE.raised, border: `1px solid ${TONE.border}`, borderRadius: 7, cursor: 'pointer', fontFamily: MONO, fontWeight: 430 }
const triggerLabelStyle: CSSProperties = { color: TONE.text, fontSize: 12, fontWeight: 430, whiteSpace: 'nowrap' }
const triggerDotStyle: CSSProperties = { width: 7, height: 7, marginLeft: 1, borderRadius: 99 }

const panelStyle: CSSProperties = { position: 'absolute', zIndex: 1000, right: 0, bottom: 'calc(100% + 12px)', width: 428, maxWidth: 'calc(100vw - 24px)', maxHeight: 'min(70vh, 620px)', overflowX: 'hidden', overflowY: 'auto', color: TONE.text, background: TONE.canvas, border: `1px solid ${TONE.borderStrong}`, borderRadius: 12, boxShadow: '0 18px 44px rgba(3, 8, 18, 0.34)', textAlign: 'left', fontFamily: MONO, fontWeight: 400 }
const headerStyle: CSSProperties = { display: 'grid', gridTemplateColumns: '20px minmax(0, 1fr) auto', alignItems: 'center', columnGap: 10, padding: '14px 16px 13px', borderBottom: `1px solid ${TONE.border}` }
const titleStyle: CSSProperties = { margin: 0, color: TONE.text, fontFamily: MONO, fontSize: 14, fontWeight: 480, letterSpacing: '-0.01em', lineHeight: 1.2 }
const subtitleStyle: CSSProperties = { margin: '3px 0 0', color: TONE.muted, fontFamily: MONO, fontSize: 11.5, fontWeight: 400, lineHeight: 1.2 }
const statusPillStyle: CSSProperties = { padding: '3px 9px', border: '1px solid', borderRadius: 99, fontSize: 11, fontWeight: 460, whiteSpace: 'nowrap' }

const errorStyle: CSSProperties = { margin: '12px 16px 0', color: TONE.red, fontSize: 12, lineHeight: 1.45 }
const emptyStyle: CSSProperties = { margin: 0, padding: '34px 16px', color: TONE.muted, fontSize: 12.5, textAlign: 'center' }

const summaryStyle: CSSProperties = { padding: '15px 16px 14px', borderBottom: `1px solid ${TONE.border}` }
const summaryHeadStyle: CSSProperties = { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }
const totalStyle: CSSProperties = { color: TONE.text, fontSize: 27, fontWeight: 460, lineHeight: 1, letterSpacing: '-0.035em', fontVariantNumeric: 'tabular-nums' }
const totalUnitStyle: CSSProperties = { color: TONE.muted, fontSize: 12, fontWeight: 400 }
const budgetStyle: CSSProperties = { color: TONE.muted, fontSize: 11.5, fontWeight: 400, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }
const barTrackStyle: CSSProperties = { display: 'flex', gap: 2, height: 7, margin: '12px 0 0', overflow: 'hidden', background: TONE.row, borderRadius: 99 }
const totalCaptionStyle: CSSProperties = { display: 'block', marginTop: 9, color: TONE.quiet, fontSize: 11, fontWeight: 400 }

const listStyle: CSSProperties = { margin: 0, padding: '5px 8px 7px', listStyle: 'none', borderBottom: `1px solid ${TONE.border}` }
const listItemStyle: CSSProperties = { listStyle: 'none' }
const rowStyle: CSSProperties = { display: 'grid', width: '100%', gridTemplateColumns: '16px 9px minmax(0, 1fr) auto 38px', alignItems: 'center', columnGap: 9, padding: '9px 8px', color: TONE.text, background: 'transparent', border: 0, borderRadius: 7, textAlign: 'left', fontFamily: MONO }
const chevronStyle: CSSProperties = { display: 'inline-flex', justifyContent: 'center' }
const swatchStyle: CSSProperties = { width: 9, height: 9, borderRadius: 3 }
const rowLabelStyle: CSSProperties = { display: 'block', overflow: 'hidden', color: TONE.text, fontSize: 12.5, fontWeight: 440, textOverflow: 'ellipsis', whiteSpace: 'nowrap' }
const rowSubStyle: CSSProperties = { display: 'block', marginTop: 2, overflow: 'hidden', color: TONE.quiet, fontSize: 11, fontWeight: 400, textOverflow: 'ellipsis', whiteSpace: 'nowrap' }
const rowTokensStyle: CSSProperties = { color: TONE.text, fontSize: 12.5, fontWeight: 440, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }
const rowShareStyle: CSSProperties = { color: TONE.muted, fontSize: 12, fontWeight: 430, fontVariantNumeric: 'tabular-nums', textAlign: 'right' }

const detailStyle: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 7, margin: '0 8px 9px 33px', padding: '10px 11px', background: TONE.row, borderRadius: 8 }
// No uppercasing here: the dictionaries mix CJK with Latin product nouns, and
// `text-transform` would shout the Latin half ("占用最大的 SCHEMA").
const detailTitleStyle: CSSProperties = { color: TONE.quiet, fontSize: 10.5, fontWeight: 460 }
const detailListStyle: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 6, margin: 0, padding: 0, listStyle: 'none' }
const detailRowStyle: CSSProperties = { display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 54px 42px', alignItems: 'center', columnGap: 9 }
const detailNameStyle: CSSProperties = { overflow: 'hidden', color: TONE.muted, fontSize: 11.5, fontWeight: 400, textOverflow: 'ellipsis', whiteSpace: 'nowrap' }
const detailBarStyle: CSSProperties = { height: 4, background: TONE.borderStrong, borderRadius: 2, overflow: 'hidden' }
const detailTokensStyle: CSSProperties = { color: TONE.text, fontSize: 11.5, fontWeight: 430, fontVariantNumeric: 'tabular-nums', textAlign: 'right' }
const detailMoreStyle: CSSProperties = { color: TONE.quiet, fontSize: 11, fontWeight: 400 }
const detailNoteStyle: CSSProperties = { marginTop: 1, color: TONE.amber, fontSize: 11, fontWeight: 400, lineHeight: 1.4 }

const healthStyle: CSSProperties = { padding: '13px 16px 14px', borderBottom: `1px solid ${TONE.border}` }
const healthTitleStyle: CSSProperties = { display: 'block', fontSize: 12.5, fontWeight: 470 }
const healthCopyStyle: CSSProperties = { margin: '5px 0 0', color: TONE.muted, fontSize: 11.5, fontWeight: 400, lineHeight: 1.5 }
const suggestionListStyle: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 6, margin: '11px 0 0', padding: 0, listStyle: 'none' }
const suggestionStyle: CSSProperties = { display: 'grid', gridTemplateColumns: '7px minmax(0, 1fr)', alignItems: 'start', columnGap: 9 }
const suggestionDotStyle: CSSProperties = { width: 6, height: 6, marginTop: 5, borderRadius: 99 }
const suggestionCopyStyle: CSSProperties = { color: TONE.muted, fontSize: 11.5, fontWeight: 400, lineHeight: 1.45 }

const footerStyle: CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '11px 16px 12px' }
const updatedStyle: CSSProperties = { color: TONE.quiet, fontSize: 11, fontWeight: 400, fontVariantNumeric: 'tabular-nums' }
const refreshStyle: CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 6, padding: 0, color: TONE.blue, background: 'transparent', border: 0, cursor: 'pointer', fontFamily: MONO, fontSize: 12, fontWeight: 440 }
