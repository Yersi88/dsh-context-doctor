/**
 * Context Doctor budget control and audit popover for the conversation dock.
 * @module dsh-context-doctor/client/ContextAuditRing
 */

import { useEffect, useId, useState, type CSSProperties, type ReactElement } from 'react'
import type { PropsLocale, PropsRuntime, PropsStore } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type { AuditUiState } from './store.ts'
import type { createAuditStore } from './store.ts'
import { NS } from './locales.ts'

/** Injected actions handed to the dock entry component. */
export interface AuditInjected {
  /** Fetch the report on mount. */
  ensure: () => void
  /** Force a fresh audit. */
  refresh: () => void
}

/** Composed props of the dock entry. */
export type ContextAuditRingProps =
  PropsRuntime<'conversation.composer.dock'>
  & PropsStore<ReturnType<typeof createAuditStore>>
  & AuditInjected
  & PropsLocale<typeof NS>

/** Resident-injection guideline used to size the circular gauge. */
const FULL_SCALE = 50_000

const TONE = {
  canvas: 'var(--dsw-alias-bg-layer-2, #101722)',
  surface: 'var(--dsw-alias-bg-layer-1, #171f2b)',
  surfaceRaised: 'var(--dsw-alias-bg-layer-3, #1d2735)',
  border: 'var(--dsw-alias-border-l2, rgba(196, 211, 232, 0.16))',
  borderStrong: 'var(--dsw-alias-border-l3, rgba(196, 211, 232, 0.26))',
  text: 'var(--dsw-alias-label-primary, #f2f6fc)',
  muted: 'var(--dsw-alias-label-secondary, #9daabd)',
  quiet: 'var(--dsw-alias-label-tertiary, #718096)',
  mint: 'var(--dsw-alias-state-success-primary, #7ce0aa)',
  mintSoft: 'var(--dsw-alias-state-success-tertiary, rgba(124, 224, 170, 0.13))',
  amber: 'var(--dsw-alias-state-warn-primary, #f7c75d)',
  amberSoft: 'var(--dsw-alias-state-warn-tertiary, rgba(247, 199, 93, 0.13))',
  red: 'var(--dsw-alias-state-error-primary, #ff8592)',
  redSoft: 'var(--dsw-alias-state-error-secondary, rgba(255, 133, 146, 0.13))',
  blue: 'var(--dsw-alias-brand-primary, #8ec5ff)',
} as const

function healthTone(tokens: number): keyof typeof TONE {
  if (tokens < 10_000) return 'mint'
  if (tokens < 30_000) return 'amber'
  return 'red'
}

function severityColor(severity: string): string {
  if (severity === 'high') return TONE.red
  if (severity === 'medium') return TONE.amber
  return TONE.blue
}

function softTone(tone: keyof typeof TONE): string {
  if (tone === 'mint') return TONE.mintSoft
  if (tone === 'amber') return TONE.amberSoft
  return TONE.redSoft
}

/** Format tokens for the compact dock and detail panel. */
function formatK(tokens: number): string {
  if (tokens < 1000) return String(tokens)
  const thousands = tokens / 1000
  return `${thousands >= 100 ? Math.round(thousands) : thousands.toFixed(1)}k`
}

function updatedLabel(refreshedAt: number | null): string {
  if (refreshedAt === null) return '—'
  const seconds = Math.max(0, Math.round((Date.now() - refreshedAt) / 1000))
  if (seconds < 10) return 'just now'
  if (seconds < 60) return `${seconds}s ago`
  return `${Math.round(seconds / 60)}m ago`
}

/** Small product glyph used in the dock trigger and popover title. */
function PulseIcon({ size = 18, color = 'currentColor' }: { size?: number; color?: string }): ReactElement {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M3 12h4l2.05-5 3.62 10L15.2 12H21" stroke={color} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3.6 6.8C5.1 4.86 8.06 4.4 10.06 6l1.94 1.58L13.94 6c2-1.6 4.96-1.14 6.46.8 1.72 2.23 1.43 5.42-.66 7.29L12 21 4.26 14.09C2.17 12.22 1.88 9.03 3.6 6.8Z" stroke={color} strokeWidth="1.45" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function RefreshIcon(): ReactElement {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M20 11a8 8 0 0 0-14.98-3.8M4 5v4h4M4 13a8 8 0 0 0 14.98 3.8M20 19v-4h-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/** Circular visual that always leaves a small gap, even at full scale. */
function BudgetRing({ percent, color, size = 84 }: { percent: number; color: string; size?: number }): ReactElement {
  const radius = 39
  const circumference = 2 * Math.PI * radius
  const progress = Math.max(0.035, Math.min(0.965, percent))
  return (
    <svg width={size} height={size} viewBox="0 0 96 96" aria-hidden="true" style={{ display: 'block', transform: 'rotate(-90deg)' }}>
      <circle cx="48" cy="48" r={radius} fill="none" stroke="rgba(219, 231, 247, 0.13)" strokeWidth="8" />
      <circle
        cx="48"
        cy="48"
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth="8"
        strokeLinecap="round"
        strokeDasharray={`${progress * circumference} ${circumference}`}
      />
    </svg>
  )
}

/** Dock entry: resident-token gauge plus a detailed, keyboard-dismissable popover. */
export function ContextAuditRing(props: ContextAuditRingProps): ReactElement {
  const { useStore, ensure, refresh, t } = props
  const state: AuditUiState = useStore((snapshot) => snapshot)
  const [open, setOpen] = useState(false)
  const panelId = useId()

  useEffect(() => {
    ensure()
  }, [ensure])

  useEffect(() => {
    if (!open) return undefined
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open])

  const report = state.report
  const instructions = report?.injected.instructions.totalTokens ?? 0
  const skills = report?.injected.skills.catalogDescriptionTokens ?? 0
  const schemas = report?.injected.tools.schemaTokens ?? 0
  const resident = instructions + skills + schemas
  const percent = resident / FULL_SCALE
  const tone = state.state === 'error' ? 'red' : healthTone(resident)
  const accent = TONE[tone]
  const suggestions = report?.suggestions ?? []

  return (
    <span data-context-doctor style={dockStyle}>
      <button
        type="button"
        onClick={() => setOpen((visible) => !visible)}
        title={t('cd.title')}
        aria-label={t('cd.title')}
        aria-expanded={open}
        aria-controls={panelId}
        style={triggerStyle}
      >
        <span style={{ color: accent, display: 'inline-flex' }}><PulseIcon size={17} /></span>
        <span style={triggerMetricStyle}>
          {state.state === 'loading' ? t('cd.loading') : state.state === 'error' ? '!' : report === null ? t('cd.empty') : `${formatK(resident)}t`}
        </span>
        <span aria-hidden="true" style={{ ...triggerStatusStyle, background: accent }} />
      </button>

      {open && (
        <section id={panelId} role="dialog" aria-label={t('cd.title')} style={panelStyle}>
          <header style={headerStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <span style={{ width: 30, height: 30, borderRadius: 9, display: 'grid', placeItems: 'center', color: TONE.mint, background: TONE.mintSoft }}><PulseIcon /></span>
              <div>
                <h2 style={titleStyle}>{t('cd.title')}</h2>
                <p style={subtitleStyle}>{t('cd.residentTokens')}</p>
              </div>
            </div>
            <span style={{ ...statusChipStyle, color: accent, background: softTone(tone), borderColor: TONE.border }}>
              <span aria-hidden="true" style={{ width: 5, height: 5, borderRadius: 99, background: accent }} />
              {state.state === 'error' ? t('cd.error') : suggestions.length > 0 ? t('cd.attention') : t('cd.healthy')}
            </span>
          </header>

          {state.state === 'error' && <div style={{ ...noticeStyle, color: TONE.red, background: TONE.redSoft }}>{t('cd.error')}: {state.error}</div>}

          {report === null && state.state !== 'error' ? (
            <div style={emptyStyle}>{state.state === 'loading' ? t('cd.loading') : t('cd.empty')}</div>
          ) : report !== null && (
            <>
              <div style={summaryStyle}>
                <div style={gaugeColumnStyle}>
                  <div style={{ position: 'relative', width: 96, height: 96 }}>
                    <BudgetRing percent={percent} color={accent} size={96} />
                    <div style={gaugeCaptionStyle}>
                      <strong style={{ color: accent, fontSize: 18, letterSpacing: '-0.04em' }}>{Math.round(Math.min(percent, 1) * 100)}%</strong>
                      <span style={{ color: TONE.muted, fontSize: 9 }}>{t('cd.guideline')}</span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <strong style={totalStyle}>{formatK(resident)}<small style={totalUnitStyle}>t</small></strong>
                    <span style={totalCaptionStyle}>{t('cd.residentTokens')}</span>
                  </div>
                </div>

                <div style={breakdownStyle}>
                  <MetricRow label={t('cd.instructions')} value={instructions} ratio={resident === 0 ? 0 : instructions / resident} color={TONE.mint} detail={report.injected.instructions.files.length > 0 ? `${report.injected.instructions.files.length} ${t('cd.files')}` : undefined} />
                  <MetricRow label={t('cd.skills')} value={skills} ratio={resident === 0 ? 0 : skills / resident} color={TONE.blue} detail={report.injected.skills.catalogCount > 0 ? t('cd.catalog', { n: report.injected.skills.catalogCount }) : undefined} />
                  <MetricRow label={t('cd.tools')} value={schemas} ratio={resident === 0 ? 0 : schemas / resident} color={TONE.amber} detail={report.injected.tools.visibleCount > 0 ? `${report.injected.tools.visibleCount} ${t('cd.toolsCount')}` : undefined} />
                  <div style={mcpLineStyle}>
                    <span>{t('cd.mcp')}</span>
                    <span>{report.injected.tools.mcp.totalTools > 0 ? `${formatK(report.injected.tools.mcp.totalTokens)}t · ${t('cd.mcpTools', { n: report.injected.tools.mcp.totalTools })}` : '—'}</span>
                  </div>
                </div>
              </div>

              <div style={{ ...insightStyle, background: suggestions.length > 0 ? TONE.amberSoft : TONE.mintSoft, borderColor: TONE.border }}>
                <span style={{ ...checkStyle, color: suggestions.length > 0 ? TONE.amber : TONE.mint }}>{suggestions.length > 0 ? '!' : '✓'}</span>
                <div>
                  <strong style={{ color: suggestions.length > 0 ? TONE.amber : TONE.mint }}>{suggestions.length > 0 ? t('cd.review') : t('cd.healthy')}</strong>
                  <p style={insightCopyStyle}>{suggestions.length > 0 ? t('cd.reviewHint') : t('cd.healthyHint')}</p>
                </div>
              </div>

              {suggestions.length > 0 && (
                <div style={suggestionsStyle}>
                  <div style={sectionLabelStyle}>{t('cd.suggestions', { n: suggestions.length })}</div>
                  <ol style={suggestionListStyle}>
                    {suggestions.slice(0, 3).map((suggestion, index) => (
                      <li key={`${suggestion.severity}-${suggestion.text}`} style={suggestionStyle}>
                        <span style={{ ...suggestionIndexStyle, color: severityColor(suggestion.severity), borderColor: `${severityColor(suggestion.severity)}77` }}>{index + 1}</span>
                        <span style={suggestionTextStyle}>{suggestion.text}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </>
          )}

          <footer style={footerStyle}>
            <span style={updatedStyle}>{t('cd.updated')}: {updatedLabel(state.refreshedAt)}</span>
            <button type="button" onClick={refresh} disabled={state.state === 'loading'} style={refreshStyle}>
              <RefreshIcon />
              {t('cd.refresh')}
            </button>
          </footer>
        </section>
      )}
    </span>
  )
}

function MetricRow({ label, value, ratio, color, detail }: { label: string; value: number; ratio: number; color: string; detail: string | undefined }): ReactElement {
  return (
    <div style={metricRowStyle}>
      <span style={{ width: 5, height: 5, borderRadius: 99, background: color, boxShadow: '0 0 0 3px var(--dsw-alias-bg-mask-1, rgba(124,224,170,0.12))' }} />
      <span style={metricLabelStyle}>{label}</span>
      <span style={metricValueStyle}>{formatK(value)}t</span>
      <span style={{ ...metricPercentStyle, color }}>{Math.round(ratio * 100)}%</span>
      {detail !== undefined && <span style={metricDetailStyle}>{detail}</span>}
    </div>
  )
}

const dockStyle: CSSProperties = { display: 'inline-flex', alignItems: 'center', position: 'relative', fontFamily: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }
const triggerStyle: CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 6, minHeight: 28, padding: '4px 8px 4px 7px', border: `1px solid ${TONE.border}`, borderRadius: 8, color: TONE.text, background: TONE.surface, cursor: 'pointer', boxShadow: '0 1px 0 rgba(255,255,255,0.04) inset', transition: 'border-color 160ms ease, background 160ms ease, transform 160ms ease' }
const triggerMetricStyle: CSSProperties = { fontSize: 11, lineHeight: 1, fontWeight: 700, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }
const triggerStatusStyle: CSSProperties = { width: 5, height: 5, borderRadius: 99, marginLeft: 1, boxShadow: '0 0 0 3px var(--dsw-alias-bg-mask-1, rgba(124,224,170,0.12))' }
const panelStyle: CSSProperties = { position: 'absolute', zIndex: 100, right: 0, bottom: 'calc(100% + 11px)', width: 380, maxWidth: 'calc(100vw - 24px)', overflow: 'hidden', color: TONE.text, background: TONE.canvas, border: `1px solid ${TONE.borderStrong}`, borderRadius: 14, boxShadow: '0 24px 68px rgba(3, 8, 18, 0.42), 0 4px 14px rgba(3, 8, 18, 0.3)', textAlign: 'left', fontFamily: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }
const headerStyle: CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '15px 16px 13px', borderBottom: `1px solid ${TONE.border}` }
const titleStyle: CSSProperties = { margin: 0, color: TONE.text, fontSize: 13, fontWeight: 760, letterSpacing: '-0.02em', lineHeight: 1.2 }
const subtitleStyle: CSSProperties = { margin: '3px 0 0', color: TONE.muted, fontSize: 10, lineHeight: 1.2 }
const statusChipStyle: CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 7px', border: '1px solid', borderRadius: 99, fontSize: 10, fontWeight: 700, whiteSpace: 'nowrap' }
const noticeStyle: CSSProperties = { margin: '12px 14px 0', padding: '8px 10px', borderRadius: 8, fontSize: 11, lineHeight: 1.45 }
const emptyStyle: CSSProperties = { padding: '36px 16px', color: TONE.muted, fontSize: 12, textAlign: 'center' }
const summaryStyle: CSSProperties = { display: 'grid', gridTemplateColumns: '128px 1fr', minHeight: 155, borderBottom: `1px solid ${TONE.border}` }
const gaugeColumnStyle: CSSProperties = { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '15px 10px 13px', borderRight: `1px solid ${TONE.border}` }
const gaugeCaptionStyle: CSSProperties = { position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, transform: 'rotate(0deg)' }
const totalStyle: CSSProperties = { display: 'block', color: TONE.text, fontSize: 23, fontWeight: 760, letterSpacing: '-0.06em', lineHeight: 0.9, fontVariantNumeric: 'tabular-nums' }
const totalUnitStyle: CSSProperties = { marginLeft: 2, color: TONE.muted, fontSize: 11, letterSpacing: 0 }
const totalCaptionStyle: CSSProperties = { display: 'block', marginTop: 4, color: TONE.muted, fontSize: 9, lineHeight: 1.2 }
const breakdownStyle: CSSProperties = { display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 7, padding: '13px 14px 11px' }
const metricRowStyle: CSSProperties = { display: 'grid', gridTemplateColumns: '7px minmax(0, 1fr) auto auto', alignItems: 'center', columnGap: 6, minHeight: 17, fontSize: 10 }
const metricLabelStyle: CSSProperties = { overflow: 'hidden', color: TONE.text, fontWeight: 600, textOverflow: 'ellipsis', whiteSpace: 'nowrap' }
const metricValueStyle: CSSProperties = { color: TONE.text, fontSize: 11, fontWeight: 720, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }
const metricPercentStyle: CSSProperties = { minWidth: 25, textAlign: 'right', fontSize: 10, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }
const metricDetailStyle: CSSProperties = { gridColumn: '2 / -1', color: TONE.quiet, fontSize: 9, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }
const mcpLineStyle: CSSProperties = { display: 'flex', justifyContent: 'space-between', gap: 8, marginTop: 1, paddingTop: 7, borderTop: `1px solid ${TONE.border}`, color: TONE.muted, fontSize: 9 }
const insightStyle: CSSProperties = { display: 'flex', gap: 9, alignItems: 'flex-start', margin: '12px 14px 0', padding: '9px 10px', border: '1px solid', borderRadius: 9 }
const checkStyle: CSSProperties = { display: 'grid', flexShrink: 0, width: 18, height: 18, border: '1px solid currentColor', borderRadius: 99, placeItems: 'center', fontSize: 11, fontWeight: 800 }
const insightCopyStyle: CSSProperties = { margin: '3px 0 0', color: TONE.muted, fontSize: 10, lineHeight: 1.45 }
const suggestionsStyle: CSSProperties = { padding: '12px 14px 0' }
const sectionLabelStyle: CSSProperties = { marginBottom: 7, color: TONE.muted, fontSize: 9, fontWeight: 750, letterSpacing: '0.08em', textTransform: 'uppercase' }
const suggestionListStyle: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 6, margin: 0, padding: 0, listStyle: 'none' }
const suggestionStyle: CSSProperties = { display: 'flex', alignItems: 'flex-start', gap: 8, padding: '8px 9px', color: TONE.text, background: TONE.surface, border: `1px solid ${TONE.border}`, borderRadius: 8, fontSize: 10, lineHeight: 1.4 }
const suggestionIndexStyle: CSSProperties = { display: 'grid', flex: '0 0 auto', width: 17, height: 17, border: '1px solid', borderRadius: 99, placeItems: 'center', fontSize: 9, fontWeight: 800, lineHeight: 1 }
const suggestionTextStyle: CSSProperties = { color: TONE.text }
const footerStyle: CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 13, padding: '11px 14px 12px', borderTop: `1px solid ${TONE.border}` }
const updatedStyle: CSSProperties = { color: TONE.quiet, fontSize: 9, fontVariantNumeric: 'tabular-nums' }
const refreshStyle: CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 7px', color: TONE.blue, background: 'transparent', border: '1px solid transparent', borderRadius: 6, cursor: 'pointer', fontSize: 10, fontWeight: 700 }
