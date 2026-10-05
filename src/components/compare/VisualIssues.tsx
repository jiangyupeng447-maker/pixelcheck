import { useEffect, useMemo, useRef } from 'react'
import type { IssueType, QAScope, Rect, VisualIssue } from '../../types'
import { ISSUE_TYPE_LABEL, ISSUE_TYPE_ORDER } from '../../types'
import { severityMeta, issueTypeIcon } from '../../lib/issueMeta'
import { baseToImage } from '../../lib/analysis'
import { IconGlobe, IconCrop } from '../icons'

type Filter = IssueType | 'all'
type Size = { w: number; h: number }

interface Props {
  issues: VisualIssue[]
  numberOf: Map<string, number>
  selectedId: string | null
  onSelect: (id: string) => void
  scope: QAScope
  isReal?: boolean
  coverage: number
  filter: Filter
  onFilter: (f: Filter) => void
  // Local QA context
  designSrc: string
  actualSrc: string
  region: Rect | null
  baseSize: Size
  designSize: Size
  actualSize: Size
  onReselect: () => void
  onRerun: () => void
  onBackToFullPage: () => void
}

function fmt(value: string, unit?: string) {
  const isHex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value.trim())
  return unit === 'px' && !isHex ? `${value}px` : value
}

function ColorSwatch({ value }: { value: string }) {
  const isHex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value.trim())
  if (!isHex) return null
  return <span className="inline-block h-3 w-3 shrink-0 rounded-sm border border-border-strong" style={{ backgroundColor: value }} />
}

function RegionPreview({ label, src, rect }: { label: string; src: string; rect: Rect }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const img = new Image()
    img.onload = () => {
      const maxW = 150
      const scale = Math.min(1, maxW / Math.max(1, rect.width))
      canvas.width = Math.max(1, Math.round(rect.width * scale))
      canvas.height = Math.max(1, Math.round(rect.height * scale))
      const ctx = canvas.getContext('2d')!
      ctx.imageSmoothingQuality = 'high'
      ctx.drawImage(img, rect.x, rect.y, rect.width, rect.height, 0, 0, canvas.width, canvas.height)
    }
    img.src = src
  }, [src, rect.x, rect.y, rect.width, rect.height])
  return (
    <div className="flex flex-col gap-1">
      <span className="panel-label">{label}</span>
      <div className="grid place-items-center overflow-hidden rounded-md border border-border bg-bg-base p-1">
        <canvas ref={canvasRef} className="max-h-28 w-auto rounded-sm" />
      </div>
    </div>
  )
}

function MeasureRow({ k, value, unit, strong, color }: { k: string; value: string; unit?: string; strong?: boolean; color?: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-content-muted">{k}</span>
      <span className={`flex items-center gap-1.5 font-mono ${strong ? 'font-semibold' : ''}`} style={color ? { color } : undefined}>
        <ColorSwatch value={value} />
        {fmt(value, unit)}
      </span>
    </div>
  )
}

function parseNum(s: string): number {
  const m = s.match(/-?\d+(\.\d+)?/)
  return m ? parseFloat(m[0]) : NaN
}

/** Tiny visual comparison bars so designers don't only read numbers. */
function DiffBars({ design, actual, color }: { design: number; actual: number; color: string }) {
  const max = Math.max(Math.abs(design), Math.abs(actual), 1)
  const wd = `${(Math.abs(design) / max) * 100}%`
  const wa = `${(Math.abs(actual) / max) * 100}%`
  return (
    <div className="mt-2 space-y-1">
      <div className="h-1.5 overflow-hidden rounded-full bg-bg-hover">
        <div className="h-full rounded-full" style={{ width: wd, background: '#3B8CFF', transition: 'width 300ms ease' }} />
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-bg-hover">
        <div className="h-full rounded-full" style={{ width: wa, background: color, transition: 'width 300ms ease' }} />
      </div>
    </div>
  )
}

function IssueCard({ issue, number, selected, onSelect }: { issue: VisualIssue; number: number; selected: boolean; onSelect: () => void }) {
  const sev = severityMeta[issue.severity]
  const num = String(number).padStart(2, '0')
  const dNum = parseNum(issue.designValue)
  const aNum = parseNum(issue.actualValue)
  const showBars =
    (issue.type === 'spacing' || issue.type === 'size' || issue.type === 'position' || issue.type === 'radius') &&
    Number.isFinite(dNum) &&
    Number.isFinite(aNum)
  return (
    <button
      onClick={onSelect}
      data-selected={selected}
      className="issue-card card w-full p-3.5 text-left transition-all hover:-translate-y-0.5 hover:border-border-strong data-[selected=true]:border-brand data-[selected=true]:bg-brand-soft data-[selected=true]:ring-1 data-[selected=true]:ring-brand/40"
    >
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="grid h-5 w-5 place-items-center rounded-full text-[10px] font-bold text-white" style={{ background: sev.hex }}>{num}</span>
          <span className="text-sm font-semibold">{ISSUE_TYPE_LABEL[issue.type]}</span>
        </div>
        <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${sev.badge}`}>{sev.label}</span>
      </div>
      <p className="mb-3 text-xs text-content-secondary">{issue.title}</p>
      <div className="space-y-1.5">
        <MeasureRow k="Design" value={issue.designValue} unit={issue.unit} />
        <MeasureRow k="Actual" value={issue.actualValue} unit={issue.unit} />
        {issue.difference && <MeasureRow k="Difference" value={issue.difference} unit={issue.unit} strong color={sev.hex} />}
      </div>
      {showBars && <DiffBars design={dNum} actual={aNum} color={sev.hex} />}
    </button>
  )
}

export default function VisualIssues({
  issues,
  numberOf,
  selectedId,
  onSelect,
  scope,
  isReal,
  coverage,
  filter,
  onFilter,
  designSrc,
  actualSrc,
  region,
  baseSize,
  designSize,
  actualSize,
  onReselect,
  onRerun,
  onBackToFullPage,
}: Props) {
  const isLocal = scope === 'local'
  const designCrop = region ? baseToImage(region, designSize, baseSize) : null
  const actualCrop = region ? baseToImage(region, actualSize, baseSize) : null

  const countByType = useMemo(() => {
    const map = new Map<IssueType, number>()
    for (const i of issues) map.set(i.type, (map.get(i.type) ?? 0) + 1)
    return map
  }, [issues])

  const visible = filter === 'all' ? issues : issues.filter((i) => i.type === filter)
  const grouped = useMemo(() => {
    const map = new Map<IssueType, VisualIssue[]>()
    for (const t of ISSUE_TYPE_ORDER) {
      const list = visible.filter((i) => i.type === t)
      if (list.length) map.set(t, list)
    }
    return map
  }, [visible])

  return (
    <aside className="flex h-full w-[340px] shrink-0 flex-col border-l border-border bg-bg-surface">
      {/* Header + Issue Overview */}
      <div className="border-b border-border px-4 py-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isLocal ? <IconCrop className="h-4 w-4 text-content-primary" /> : <IconGlobe className="h-4 w-4 text-content-primary" />}
            <h2 className="text-sm font-semibold">{isLocal ? 'Local QA' : 'Full Page'}</h2>
          </div>
          {!isLocal && (
            <span className="flex items-center gap-1.5 text-[11px] text-content-muted">
              <span className="h-1.5 w-14 overflow-hidden rounded-full bg-bg-hover">
                <span className="block h-full rounded-full bg-gradient-to-r from-brand to-accent2" style={{ width: `${coverage}%` }} />
              </span>
              <span className="font-mono font-semibold text-success">{coverage}%</span>
            </span>
          )}
        </div>

        {/* Total */}
        <div className="mt-3 flex items-end gap-2">
          <span className="font-mono text-3xl font-bold leading-none text-content-primary">{issues.length}</span>
          <span className="pb-0.5 text-[11px] uppercase tracking-wider text-content-muted">Total Issues</span>
          <button
            onClick={() => onFilter('all')}
            data-active={filter === 'all'}
            className="ml-auto rounded-md border border-border bg-bg-elevated px-2 py-1 text-[11px] text-content-secondary transition-colors hover:text-content-primary data-[active=true]:border-content-primary data-[active=true]:bg-brand-soft data-[active=true]:text-content-primary"
          >
            All
          </button>
        </div>

        {/* Per-type overview cards (click to filter) */}
        <div className="mt-3 grid grid-cols-2 gap-2">
          {ISSUE_TYPE_ORDER.map((t) => {
            const Icon = issueTypeIcon[t]
            const count = countByType.get(t) ?? 0
            const active = filter === t
            // In Real Image mode radius/typography are not analyzed yet.
            const notAnalyzed = !!isReal && (t === 'radius' || t === 'typography')
            return (
              <button
                key={t}
                onClick={() => onFilter(active ? 'all' : t)}
                data-active={active}
                disabled={count === 0}
                title={notAnalyzed ? 'Not analyzed yet — coming soon' : undefined}
                className="flex items-center gap-2 rounded-lg border border-border bg-bg-elevated px-2.5 py-1.5 text-left transition-all hover:border-border-strong hover:-translate-y-0.5 disabled:opacity-40 disabled:hover:translate-y-0 data-[active=true]:border-brand data-[active=true]:bg-brand-soft"
              >
                <Icon className="h-3.5 w-3.5 text-content-muted" />
                <span className="text-[11px] text-content-secondary">{ISSUE_TYPE_LABEL[t]}</span>
                {notAnalyzed && count === 0 ? (
                  <span className="ml-auto text-[9px] uppercase tracking-wide text-content-muted">soon</span>
                ) : (
                  <span className="ml-auto font-mono text-sm font-semibold text-content-primary">{count}</span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Local region preview + controls */}
      {isLocal && region && designCrop && actualCrop && (
        <div className="border-b border-border px-4 py-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="panel-label">Selected Region</span>
            <span className="font-mono text-[11px] text-content-muted">X {region.x} · Y {region.y} · W {region.width} · H {region.height}</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <RegionPreview label="Design" src={designSrc} rect={designCrop} />
            <RegionPreview label="Actual" src={actualSrc} rect={actualCrop} />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button className="btn-secondary" onClick={onReselect}>重新选择区域</button>
            <button className="btn-secondary" onClick={onRerun}>重新检查</button>
            <button className="btn-ghost col-span-2" onClick={onBackToFullPage}>返回全页面</button>
          </div>
        </div>
      )}

      {/* Issues */}
      <div className="flex-1 overflow-y-auto p-3">
        {Array.from(grouped.entries()).map(([type, list]) => {
          const Icon = issueTypeIcon[type]
          return (
            <section key={type} className="mb-4 last:mb-0">
              <div className="mb-2 flex items-center gap-2 px-0.5">
                <Icon className="h-4 w-4 text-content-muted" />
                <h3 className="text-xs font-semibold text-content-secondary">{ISSUE_TYPE_LABEL[type]}</h3>
                <span className="text-xs text-content-muted">{list.length} {list.length === 1 ? 'issue' : 'issues'}</span>
              </div>
              <div className="space-y-2">
                {list.map((issue) => (
                  <IssueCard key={issue.id} issue={issue} number={numberOf.get(issue.id) ?? 0} selected={selectedId === issue.id} onSelect={() => onSelect(issue.id)} />
                ))}
              </div>
            </section>
          )
        })}
        {visible.length === 0 && <p className="px-1 py-6 text-center text-xs text-content-muted">No issues match this filter.</p>}
      </div>

      <div className="border-t border-border p-3">
        <p className="text-center text-[11px] text-content-muted">
          {isLocal ? 'Local QA · analyzing selected region only' : 'Full Page Scan · mock analysis'}
        </p>
      </div>
    </aside>
  )
}
