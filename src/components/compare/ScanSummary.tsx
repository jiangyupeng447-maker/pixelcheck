import MetricCard from './MetricCard'
import QAHealth from './QAHealth'
import { IconReset, IconGlobe, IconCrop, IconCheck } from '../icons'

interface Size {
  w: number
  h: number
}

interface Props {
  scope: 'global' | 'local'
  isReal: boolean
  designSize: Size
  actualSize: Size
  scalePct: number
  sizesDiffer: boolean
  total: number
  critical: number
  warnings: number
  passed: number
  typesTotal: number
  coverage: number
  pixelDiff: number | null
  health: number
  scanComplete: boolean
  baseSide: 'design' | 'actual'
  onBaseSide: (s: 'design' | 'actual') => void
  onRescan: () => void
  onBackToFullPage: () => void
}

export default function ScanSummary({
  scope,
  isReal,
  designSize,
  actualSize,
  scalePct,
  sizesDiffer,
  total,
  critical,
  warnings,
  passed,
  typesTotal,
  coverage,
  pixelDiff,
  health,
  scanComplete,
  baseSide,
  onBaseSide,
  onRescan,
  onBackToFullPage,
}: Props) {
  const isLocal = scope === 'local'

  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-3 border-b border-border bg-bg-surface px-5 py-3">
      {/* Scope toggle + mode */}
      <div className="flex items-center gap-3">
        <div className="segmented">
          <button
            className="segmented-item !py-1.5"
            data-active={!isLocal}
            onClick={onBackToFullPage}
          >
            <IconGlobe className="h-3.5 w-3.5" />
            FULL PAGE
          </button>
          <button className="segmented-item !py-1.5" data-active={isLocal} disabled={!isLocal}>
            <IconCrop className="h-3.5 w-3.5" />
            LOCAL REGION
          </button>
        </div>
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
            isReal ? 'bg-brand-soft text-content-primary' : 'bg-bg-elevated text-content-muted'
          }`}
        >
          {isReal ? 'Real Image' : 'Demo'}
        </span>
      </div>

      {/* Coverage card with progress + scan-complete */}
      <div className="min-w-[190px] rounded-xl border border-border bg-bg-elevated px-3.5 py-2 shadow-card">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-content-primary">
            {isLocal ? 'Local QA' : 'Full Page Scan'}
          </span>
          {scanComplete && (
            <span className="flex items-center gap-1 text-[10px] font-medium text-success">
              <IconCheck className="h-3 w-3" />
              Complete
            </span>
          )}
        </div>
        <div className="mt-1.5 flex items-center gap-2">
          <span className="font-mono text-lg font-semibold leading-none text-content-primary">{coverage}%</span>
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-bg-hover">
            <div
              className="h-full rounded-full bg-gradient-to-r from-brand to-accent2"
              style={{ width: `${coverage}%`, transition: 'width 500ms ease' }}
            />
          </div>
        </div>
        <div className="mt-1 text-[10px] uppercase tracking-wider text-content-muted">Analysis Coverage</div>
      </div>

      {/* Metric cards */}
      <div className="flex flex-wrap items-stretch gap-2">
        <MetricCard label="Design" value={`${designSize.w}×${designSize.h}`} />
        <MetricCard
          label="Actual"
          value={`${actualSize.w}×${actualSize.h}`}
          tone={sizesDiffer ? 'warning' : 'default'}
          hint={sizesDiffer ? `${scalePct}%` : undefined}
        />
        <MetricCard label="Issues" value={total} tone="brand" />
        <MetricCard label="Critical" value={critical} tone="danger" />
        <MetricCard label="Warning" value={warnings} tone="warning" />
        <MetricCard label="Passed" value={`${passed}/${typesTotal}`} tone="success" />
        {pixelDiff !== null && (
          <MetricCard label="Pixel Diff" value={`${(pixelDiff * 100).toFixed(1)}%`} hint="ref" />
        )}
      </div>

      <div className="ml-auto flex items-center gap-4">
        <QAHealth score={health} />
        {/* base coordinate system */}
        <div className="segmented">
          <button className="segmented-item !py-1 !text-[11px]" data-active={baseSide === 'design'} onClick={() => onBaseSide('design')}>
            以设计稿为基准
          </button>
          <button className="segmented-item !py-1 !text-[11px]" data-active={baseSide === 'actual'} onClick={() => onBaseSide('actual')}>
            以开发稿为基准
          </button>
        </div>
        <button className="btn-secondary" onClick={onRescan} title="Re-run analysis">
          <IconReset className="h-4 w-4" />
          Rescan
        </button>
      </div>
    </div>
  )
}
