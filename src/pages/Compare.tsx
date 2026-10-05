import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ScreenNavigator from '../components/compare/ScreenNavigator'
import ComparisonCanvas from '../components/compare/ComparisonCanvas'
import VisualIssues from '../components/compare/VisualIssues'
import ScanSummary from '../components/compare/ScanSummary'
import { analyzeFullPage, analyzeRegion } from '../lib/analysis'
import { analyzeImagePair, analyzeImageRegion } from '../lib/imageComparison'
import { sampleActual, sampleDesign } from '../lib/placeholders'
import { useApp } from '../context/AppContext'
import { ISSUE_TYPE_ORDER } from '../types'
import type { IssueType, QAScope, Rect, VisualIssue, ViewMode } from '../types'

type Phase = 'analyzing' | 'full' | 'complete' | 'done'
type Size = { w: number; h: number }
type Filter = IssueType | 'all'
type BaseSide = 'design' | 'actual'

const PHASE_TEXT: Record<Exclude<Phase, 'done'>, string> = {
  analyzing: 'Analyzing…',
  full: 'Analyzing full page…',
  complete: 'Analysis complete · 100% coverage',
}

export default function Compare() {
  const navigate = useNavigate()
  const { designImage, actualImage } = useApp()
  const designSrc = designImage?.dataUrl ?? sampleDesign
  const actualSrc = actualImage?.dataUrl ?? sampleActual

  const [mode, setMode] = useState<ViewMode>('side-by-side')
  const [phase, setPhase] = useState<Phase>('analyzing')

  const [designSize, setDesignSize] = useState<Size>({ w: 1, h: 1 })
  const [actualSize, setActualSize] = useState<Size>({ w: 1, h: 1 })
  const [baseSide, setBaseSide] = useState<BaseSide>('design')

  const [globalIssues, setGlobalIssues] = useState<VisualIssue[]>([])
  const [filter, setFilter] = useState<Filter>('all')
  const [pixelDiff, setPixelDiff] = useState<number | null>(null)
  const [scanning, setScanning] = useState(false)
  const [analysisError, setAnalysisError] = useState<string | null>(null)

  // Real image mode: both Design & Actual were uploaded by the user.
  const isReal = !!(designImage && actualImage)

  // Local QA workflow
  const [selecting, setSelecting] = useState(false)
  const [pendingRegion, setPendingRegion] = useState<Rect | null>(null)
  const [localIssues, setLocalIssues] = useState<VisualIssue[] | null>(null)

  const [selectedId, setSelectedId] = useState<string | null>(null)

  const baseSize: Size = baseSide === 'design' ? designSize : actualSize
  const otherSize: Size = baseSide === 'design' ? actualSize : designSize

  const scope: QAScope = localIssues ? 'local' : 'global'
  const issues = localIssues ?? globalIssues
  const visibleIssues = filter === 'all' ? issues : issues.filter((i) => i.type === filter)
  const localActive = !!localIssues
  const selectedIssue = issues.find((i) => i.id === selectedId) ?? null

  const numberOf = useMemo(() => {
    const map = new Map<string, number>()
    ;[...issues].sort((a, b) => a.designRect.y - b.designRect.y).forEach((i, idx) => map.set(i.id, idx + 1))
    return map
  }, [issues])

  // (Re)generate the full-page scan. Real images → run the comparison engine;
  // otherwise fall back to the mock demo scan. Runs whenever the base
  // coordinate system or the uploaded sources change.
  useEffect(() => {
    let cancelled = false
    if (isReal) {
      setScanning(true)
      setAnalysisError(null)
      analyzeImagePair(designSrc, actualSrc, baseSize)
        .then((res) => {
          if (cancelled) return
          setGlobalIssues(res.issues)
          setScanning(false)
        })
        .catch(() => {
          if (cancelled) return
          setGlobalIssues([])
          setAnalysisError('Unable to analyze this image pair.')
          setScanning(false)
        })
    } else {
      setAnalysisError(null)
      setGlobalIssues(analyzeFullPage(baseSize))
    }
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReal, designSrc, actualSrc, baseSize.w, baseSize.h])

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('full'), 500)
    const t2 = setTimeout(() => setPhase('complete'), 1150)
    const t3 = setTimeout(() => setPhase('done'), 1750)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      clearTimeout(t3)
    }
  }, [])

  const backToFullPage = () => {
    setSelecting(false)
    setPendingRegion(null)
    setLocalIssues(null)
    setSelectedId(null)
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') backToFullPage()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const startSelecting = () => {
    setLocalIssues(null)
    setPendingRegion(null)
    setSelectedId(null)
    setSelecting(true)
    setMode('side-by-side')
  }
  const reselect = () => startSelecting()

  const startLocalQA = () => {
    if (!pendingRegion) return
    const region = pendingRegion
    setSelecting(false)
    setSelectedId(null)
    setFilter('all')
    setMode('issues-overlay')
    if (isReal) {
      setScanning(true)
      analyzeImageRegion(designSrc, actualSrc, baseSize, region)
        .then((li) => { setLocalIssues(li); setScanning(false) })
        .catch(() => { setLocalIssues([]); setScanning(false) })
    } else {
      setLocalIssues(analyzeRegion(region))
    }
  }
  const rerunLocalQA = () => {
    if (!pendingRegion) return
    const region = pendingRegion
    setSelectedId(null)
    if (isReal) {
      setScanning(true)
      analyzeImageRegion(designSrc, actualSrc, baseSize, region)
        .then((li) => { setLocalIssues(li); setScanning(false) })
        .catch(() => { setLocalIssues([]); setScanning(false) })
    } else {
      setLocalIssues(analyzeRegion(region))
    }
  }

  const rescan = () => {
    setLocalIssues(null)
    setPendingRegion(null)
    setSelecting(false)
    setSelectedId(null)
    setFilter('all')
    if (isReal) {
      setScanning(true)
      analyzeImagePair(designSrc, actualSrc, baseSize)
        .then((res) => { setGlobalIssues(res.issues); setScanning(false) })
        .catch(() => { setGlobalIssues([]); setScanning(false) })
    } else {
      setGlobalIssues(analyzeFullPage(baseSize, true))
      setPhase('analyzing')
      setTimeout(() => setPhase('full'), 350)
      setTimeout(() => setPhase('complete'), 850)
      setTimeout(() => setPhase('done'), 1350)
    }
  }

  const toggleSelect = (id: string) => setSelectedId((cur) => (cur === id ? null : id))

  // Dynamic counts
  const total = issues.length
  const critical = issues.filter((i) => i.severity === 'high').length
  const warnings = issues.filter((i) => i.severity === 'medium').length
  const low = total - critical - warnings
  const passed = ISSUE_TYPE_ORDER.filter((t) => !issues.some((i) => i.type === t)).length
  const scalePct = Math.round((baseSize.w / Math.max(1, otherSize.w)) * 100)
  const sizesDiffer = designSize.w !== actualSize.w || designSize.h !== actualSize.h
  const health = Math.max(0, Math.min(100, Math.round(100 - critical * 12 - warnings * 5 - low * 1)))
  const scanComplete = phase === 'done' && !scanning

  return (
    <div className="relative flex h-full flex-col">
      <ScanSummary
        scope={scope}
        isReal={isReal}
        designSize={designSize}
        actualSize={actualSize}
        scalePct={scalePct}
        sizesDiffer={sizesDiffer}
        total={total}
        critical={critical}
        warnings={warnings}
        passed={passed}
        typesTotal={ISSUE_TYPE_ORDER.length}
        coverage={100}
        pixelDiff={pixelDiff}
        health={health}
        scanComplete={scanComplete}
        baseSide={baseSide}
        onBaseSide={setBaseSide}
        onRescan={rescan}
        onBackToFullPage={backToFullPage}
      />

      <div className="flex min-h-0 flex-1">
        <ScreenNavigator />

        <ComparisonCanvas
          mode={mode}
          onModeChange={setMode}
          issues={visibleIssues}
          numberOf={numberOf}
          selectedIssue={selectedIssue}
          onSelectIssue={toggleSelect}
          scope={scope}
          baseSide={baseSide}
          onDiffRatio={setPixelDiff}
          selecting={selecting}
          onStartSelecting={startSelecting}
          onCancelLocal={backToFullPage}
          onReselect={reselect}
          pendingRegion={pendingRegion}
          onRegionDrawn={setPendingRegion}
          onStartLocalQA={startLocalQA}
          localActive={localActive}
          onReady={(d, a) => {
            setDesignSize(d)
            setActualSize(a)
          }}
          onResetView={() => setSelectedId(null)}
        />

        <VisualIssues
          issues={issues}
          numberOf={numberOf}
          selectedId={selectedId}
          onSelect={toggleSelect}
          scope={scope}
          isReal={isReal}
          coverage={100}
          filter={filter}
          onFilter={setFilter}
          designSrc={designSrc}
          actualSrc={actualSrc}
          region={pendingRegion}
          baseSize={baseSize}
          designSize={designSize}
          actualSize={actualSize}
          onReselect={reselect}
          onRerun={rerunLocalQA}
          onBackToFullPage={backToFullPage}
        />
      </div>

      {analysisError && !scanning && (
        <div className="absolute inset-0 z-40 grid place-items-center bg-bg-base/85 backdrop-blur-sm">
          <div className="flex max-w-sm flex-col items-center gap-3 rounded-xl border border-border bg-bg-surface p-6 text-center shadow-card">
            <div className="grid h-11 w-11 place-items-center rounded-full bg-danger/10 text-danger">!</div>
            <p className="text-sm font-semibold text-content-primary">{analysisError}</p>
            <p className="text-xs text-content-secondary">The screenshots could not be read or are invalid.</p>
            <button className="btn-primary" onClick={() => navigate('/new')}>Try another image</button>
          </div>
        </div>
      )}

      {(phase !== 'done' || scanning) && (
        <div className="absolute inset-0 z-40 grid place-items-center bg-bg-base/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-border border-t-brand" />
            <p className="text-sm font-medium text-content-primary">
              {scanning ? (isReal ? 'Analyzing real screenshots…' : 'Analyzing…') : PHASE_TEXT[phase as Exclude<Phase, 'done'>]}
            </p>
            <div className="h-1.5 w-56 overflow-hidden rounded-full bg-bg-hover">
              <div
                className="h-full rounded-full bg-brand transition-all duration-500"
                style={{ width: scanning ? '65%' : phase === 'analyzing' ? '35%' : phase === 'full' ? '75%' : '100%' }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
