import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, MouseEvent, WheelEvent } from 'react'
import { useApp } from '../../context/AppContext'
import type { QAScope, Rect, VisualIssue, ViewMode } from '../../types'
import { ISSUE_TYPE_LABEL } from '../../types'
import { sampleActual, sampleDesign } from '../../lib/placeholders'
import { severityMeta, issueTypeIcon } from '../../lib/issueMeta'
import { ZOOM_PRESETS, ZOOM_MIN, ZOOM_MAX } from '../../lib/qaConfig'
import {
  IconGrid,
  IconLayers,
  IconDiff,
  IconTarget,
  IconZoomIn,
  IconZoomOut,
  IconFit,
  IconReset,
  IconCrop,
} from '../icons'

interface ImgSize {
  w: number
  h: number
}

interface Props {
  mode: ViewMode
  onModeChange: (m: ViewMode) => void
  issues: VisualIssue[]
  numberOf: Map<string, number>
  selectedIssue: VisualIssue | null
  onSelectIssue: (id: string) => void
  scope: QAScope
  baseSide: 'design' | 'actual'
  onDiffRatio: (ratio: number) => void
  // Local QA
  selecting: boolean
  onStartSelecting: () => void
  onCancelLocal: () => void
  onReselect: () => void
  pendingRegion: Rect | null
  onRegionDrawn: (r: Rect | null) => void
  onStartLocalQA: () => void
  localActive: boolean
  onReady: (design: ImgSize, actual: ImgSize) => void
  onResetView: () => void
}

const MODES: { id: ViewMode; label: string; icon: typeof IconGrid; title?: string }[] = [
  { id: 'side-by-side', label: 'Side by Side', icon: IconGrid },
  { id: 'overlay', label: 'Overlay', icon: IconLayers },
  { id: 'difference', label: 'Difference', icon: IconDiff, title: 'Highlight visual difference areas' },
  { id: 'issues-overlay', label: 'Issues Overlay', icon: IconTarget, title: 'QA issue boxes, guides & values' },
]

const MIN_ZOOM = ZOOM_MIN
const MAX_ZOOM = ZOOM_MAX
const MIDDLE_W = 84

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

function computeDiffRatio(a: HTMLImageElement, b: HTMLImageElement, threshold = 24): number {
  const w = Math.max(a.naturalWidth, b.naturalWidth)
  const h = Math.max(a.naturalHeight, b.naturalHeight)
  const off = document.createElement('canvas')
  off.width = w
  off.height = h
  const ctx = off.getContext('2d', { willReadFrequently: true })!
  ctx.drawImage(a, 0, 0)
  const da = ctx.getImageData(0, 0, w, h).data
  ctx.clearRect(0, 0, w, h)
  ctx.drawImage(b, 0, 0)
  const db = ctx.getImageData(0, 0, w, h).data
  let diff = 0
  for (let i = 0; i < da.length; i += 4) {
    const delta = (Math.abs(da[i] - db[i]) + Math.abs(da[i + 1] - db[i + 1]) + Math.abs(da[i + 2] - db[i + 2])) / 3
    if (delta > threshold) diff++
  }
  return diff / (w * h)
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

export default function ComparisonCanvas({
  mode,
  onModeChange,
  issues,
  numberOf,
  selectedIssue,
  onSelectIssue,
  baseSide,
  onDiffRatio,
  selecting,
  onStartSelecting,
  onCancelLocal,
  onReselect,
  pendingRegion,
  onRegionDrawn,
  onStartLocalQA,
  localActive,
  onReady,
  onResetView,
}: Props) {
  const { designImage, actualImage } = useApp()
  const designSrc = designImage?.dataUrl ?? sampleDesign
  const actualSrc = actualImage?.dataUrl ?? sampleActual
  const usingSample = !designImage || !actualImage

  const [zoom, setZoom] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [opacity, setOpacity] = useState(0.5)

  const [imgs, setImgs] = useState<{ a: HTMLImageElement; b: HTMLImageElement } | null>(null)
  const [ready, setReady] = useState(false)
  const [diffRatio, setDiffRatio] = useState<number | null>(null)

  const viewportRef = useRef<HTMLDivElement>(null)
  const designBoxRef = useRef<HTMLDivElement>(null)
  const dragState = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null)
  const manualRef = useRef(false)

  // live selection (page coords, design space)
  const [draft, setDraft] = useState<Rect | null>(null)
  const selRef = useRef<{ sx: number; sy: number } | null>(null)

  // ---- Unified comparison coordinate system -------------------------------
  // Base = the chosen side's pixel space. Both images are displayed at the base
  // width (uniform scale each → no distortion), top-aligned, sharing one zoom.
  // Issue rects are authored in this base space so one number positions a box on
  // both frames. Long pages are never cropped (box height = tallest content).
  const designSize: ImgSize = imgs ? { w: imgs.a.naturalWidth, h: imgs.a.naturalHeight } : { w: 1, h: 1 }
  const actualSize: ImgSize = imgs ? { w: imgs.b.naturalWidth, h: imgs.b.naturalHeight } : { w: 1, h: 1 }
  const baseSize = baseSide === 'design' ? designSize : actualSize
  const designDisplayH = designSize.h * (baseSize.w / designSize.w)
  const actualDisplayH = actualSize.h * (baseSize.w / actualSize.w)
  const base: ImgSize = useMemo(
    () => ({ w: baseSize.w, h: Math.max(designDisplayH, actualDisplayH) }),
    [baseSize.w, designDisplayH, actualDisplayH],
  )

  const contentSize = useCallback(
    (m: ViewMode) => {
      if (m === 'overlay') return { w: base.w, h: base.h }
      return { w: base.w * 2 + MIDDLE_W, h: base.h }
    },
    [base],
  )

  // ---- Image loading ------------------------------------------------------
  useEffect(() => {
    let cancelled = false
    setReady(false)
    Promise.all([loadImage(designSrc), loadImage(actualSrc)])
      .then(([a, b]) => {
        if (cancelled) return
        setImgs({ a, b })
        setReady(true)
        onReady({ w: a.naturalWidth, h: a.naturalHeight }, { w: b.naturalWidth, h: b.naturalHeight })
        // Guarantee an initial fit once the images (and their natural sizes) are
        // in — this is what makes the first paint correct WITHOUT pressing Reset.
        requestAnimationFrame(() => {
          if (!cancelled) fitRef.current()
        })
      })
      .catch(() => !cancelled && setReady(false))
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [designSrc, actualSrc])

  // ---- View transforms ----------------------------------------------------
  // Transform model: the content block is positioned at the viewport's top-left
  // (transform-origin 0 0) and moved with an absolute-pixel `offset`. This makes
  // "fit + center" a simple, unambiguous calculation from viewport + content size.
  const PAD = 48

  const fit = useCallback(() => {
    const vp = viewportRef.current
    if (!vp || !imgs) return
    const { w, h } = contentSize(mode)
    if (!(w > 0) || !(h > 0)) return // guard against divide-by-zero / NaN
    const availW = vp.clientWidth
    const availH = vp.clientHeight
    const raw = Math.min((availW - PAD) / w, (availH - PAD) / h, 1)
    const z = Math.max(MIN_ZOOM, Number.isFinite(raw) ? raw : 1)
    setZoom(z)
    // center the whole (scaled) content block inside the viewport
    setOffset({ x: (availW - w * z) / 2, y: (availH - h * z) / 2 })
    manualRef.current = false
  }, [imgs, mode, contentSize])

  // Always-current fit, so async image-load can trigger an initial fit safely.
  const fitRef = useRef(fit)
  useEffect(() => {
    fitRef.current = fit
  })

  const reset = useCallback(() => {
    setOpacity(0.5)
    onResetView()
    // Reset restores the default Fit + Center state (not a raw top-left origin).
    fitRef.current()
  }, [onResetView])

  const centerOn = useCallback(
    (midX: number, midY: number, tz: number) => {
      const vp = viewportRef.current
      if (!vp) return
      setZoom(tz)
      // place the content point (midX,midY, content coords) at the viewport centre
      setOffset({ x: vp.clientWidth / 2 - midX * tz, y: vp.clientHeight / 2 - midY * tz })
      manualRef.current = true
    },
    [],
  )

  // Auto-fit as soon as images are ready or the mode changes. Runs in a layout
  // effect (before paint, after layout) so viewport size is valid; any "locate"
  // passive effect runs afterwards and intentionally overrides this.
  useLayoutEffect(() => {
    if (!ready) return
    fit()
  }, [ready, mode, fit])

  useEffect(() => {
    const vp = viewportRef.current
    if (!vp) return
    const ro = new ResizeObserver(() => {
      if (!manualRef.current) fit()
    })
    ro.observe(vp)
    return () => ro.disconnect()
  }, [fit])

  useEffect(() => {
    if (!imgs) return
    const ratio = computeDiffRatio(imgs.a, imgs.b)
    setDiffRatio(ratio)
    onDiffRatio(ratio)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imgs])

  // ---- Locate to selected issue (both frames) -----------------------------
  useEffect(() => {
    if (!selectedIssue || !imgs) return
    // Reveal the markers only when the current mode has none (Side by Side /
    // Overlay). Difference & Issues Overlay already draw boxes → keep the mode
    // so we don't disrupt what the user is looking at.
    if (mode === 'side-by-side' || mode === 'overlay') onModeChange('issues-overlay')
    const vp = viewportRef.current
    if (!vp) return
    const dR = selectedIssue.designRect
    const aR = selectedIssue.actualRect
    const designCX = dR.x + dR.width / 2
    const actualCX = base.w + MIDDLE_W + aR.x + aR.width / 2
    const midX = (designCX + actualCX) / 2
    const midY = ((dR.y + dR.height / 2) + (aR.y + aR.height / 2)) / 2
    const rectH = Math.max(dR.height, aR.height, 24)
    const { w, h } = contentSize(mode === 'overlay' ? 'issues-overlay' : mode)
    const fitZoom = Math.min((vp.clientWidth - 64) / w, (vp.clientHeight - 64) / h, 1)
    const tz = clamp((vp.clientHeight * 0.35) / rectH, Math.max(fitZoom, 0.6), 2.2)
    centerOn(midX, midY, tz)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIssue?.id, imgs])

  // ---- Locate to region when Local QA starts ------------------------------
  useEffect(() => {
    if (!localActive || !pendingRegion || !imgs) return
    const vp = viewportRef.current
    if (!vp) return
    // region is already in base (Design) coords → same box on both frames
    const designCX = pendingRegion.x + pendingRegion.width / 2
    const actualCX = base.w + MIDDLE_W + designCX
    const midX = (designCX + actualCX) / 2
    const midY = pendingRegion.y + pendingRegion.height / 2
    const { w, h } = contentSize(mode)
    const fitZoom = Math.min((vp.clientWidth - 64) / w, (vp.clientHeight - 64) / h, 1)
    const tz = clamp((vp.clientHeight * 0.6) / Math.max(pendingRegion.height, 40), Math.max(fitZoom, 0.6), 2.4)
    centerOn(midX, midY, tz)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localActive, imgs])

  // ---- Zoom / pan ---------------------------------------------------------
  const setZoomManual = (z: number) => {
    manualRef.current = true
    setZoom(clamp(z, MIN_ZOOM, MAX_ZOOM))
  }
  const zoomBy = (f: number) => setZoomManual(zoom * f)
  const cyclePreset = () => {
    const next = ZOOM_PRESETS.find((p) => p > zoom + 0.001) ?? ZOOM_PRESETS[0]
    setZoomManual(next)
  }
  const onWheel = (e: WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault()
      zoomBy(e.deltaY < 0 ? 1.1 : 0.9)
      return
    }
    // plain wheel = scroll the long page (vertical, shift = horizontal)
    if (selecting) return
    e.preventDefault()
    manualRef.current = true
    setOffset((o) =>
      e.shiftKey ? { x: o.x - e.deltaY, y: o.y } : { x: o.x - e.deltaX, y: o.y - e.deltaY },
    )
  }
  const onViewportMouseDown = (e: MouseEvent) => {
    if (selecting) return // selection handled on the design frame
    dragState.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y }
  }
  const onViewportMouseMove = (e: MouseEvent) => {
    const d = dragState.current
    if (!d) return
    manualRef.current = true
    setOffset({ x: d.ox + (e.clientX - d.x), y: d.oy + (e.clientY - d.y) })
  }
  const endDrag = () => {
    dragState.current = null
  }

  // ---- Region selection on the Design frame -------------------------------
  const pageCoords = (clientX: number, clientY: number): { x: number; y: number } => {
    const box = designBoxRef.current
    if (!box) return { x: 0, y: 0 }
    const r = box.getBoundingClientRect()
    return {
      x: clamp((clientX - r.left) / zoom, 0, base.w),
      y: clamp((clientY - r.top) / zoom, 0, base.h),
    }
  }

  const beginSelection = (e: MouseEvent) => {
    if (!selecting) return
    e.stopPropagation()
    const p = pageCoords(e.clientX, e.clientY)
    selRef.current = { sx: p.x, sy: p.y }
    setDraft({ x: p.x, y: p.y, width: 0, height: 0 })
  }

  useEffect(() => {
    if (!selecting) return
    const onMove = (e: globalThis.MouseEvent) => {
      const s = selRef.current
      if (!s) return
      const p = pageCoords(e.clientX, e.clientY)
      setDraft({
        x: Math.min(s.sx, p.x),
        y: Math.min(s.sy, p.y),
        width: Math.abs(p.x - s.sx),
        height: Math.abs(p.y - s.sy),
      })
    }
    const onUp = () => {
      const s = selRef.current
      selRef.current = null
      setDraft((d) => {
        if (s && d && d.width > 8 && d.height > 8) {
          onRegionDrawn({
            x: Math.round(d.x),
            y: Math.round(d.y),
            width: Math.round(d.width),
            height: Math.round(d.height),
          })
        }
        return null
      })
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selecting, zoom, base.w, base.h])

  const transform = useMemo(() => `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`, [offset, zoom])
  const showBoxes = mode === 'difference' || mode === 'issues-overlay' || localActive

  // region to render (draft while dragging, else locked pending region) — base coords
  const liveRegion = draft ?? pendingRegion

  return (
    <section className="flex min-w-0 flex-1 flex-col bg-bg-base">
      {/* Toolbar */}
      <div className="flex items-center gap-3 border-b border-border bg-bg-surface px-4 py-2.5">
        <div className="segmented">
          {MODES.map((m) => {
            const Icon = m.icon
            return (
              <button
                key={m.id}
                data-active={mode === m.id && !selecting}
                className="segmented-item"
                onClick={() => onModeChange(m.id)}
                title={m.title ?? m.label}
              >
                <Icon className="h-4 w-4" />
                {m.label}
              </button>
            )
          })}
        </div>

        {/* Local QA entry */}
        {selecting ? (
          <button className="btn-secondary border-content-primary text-content-primary" onClick={onCancelLocal}>
            <IconCrop className="h-4 w-4" />
            取消选择
          </button>
        ) : (
          <button
            className="btn-secondary"
            data-active={localActive}
            onClick={localActive ? onReselect : onStartSelecting}
            title="Select a region to run Local QA"
          >
            <IconCrop className="h-4 w-4" />
            局部走查
          </button>
        )}

        {mode === 'overlay' && !selecting && (
          <div className="flex items-center gap-2 rounded-lg border border-border bg-bg-elevated px-3 py-1.5">
            <span className="text-xs text-content-muted">Opacity</span>
            <input type="range" min={0} max={1} step={0.01} value={opacity} onChange={(e) => setOpacity(Number(e.target.value))} className="w-24 accent-brand" />
            <span className="w-9 text-right font-mono text-xs text-content-secondary">{Math.round(opacity * 100)}%</span>
          </div>
        )}

        <div className="ml-auto flex items-center gap-2">
          {mode === 'difference' && diffRatio !== null && (
            <span className="mr-1 rounded-md bg-bg-elevated px-2 py-1 text-xs font-medium text-content-secondary">
              {issues.length} diff areas · {(diffRatio * 100).toFixed(1)}% pixels vary
            </span>
          )}
          <div className="segmented">
            <button className="segmented-item" onClick={() => zoomBy(0.9)} title="Zoom out">
              <IconZoomOut className="h-4 w-4" />
            </button>
            <button
              className="min-w-[3.25rem] text-center font-mono text-xs text-content-secondary hover:text-content-primary"
              onClick={cyclePreset}
              title="Click to cycle 50 / 75 / 100 / 125 / 150%"
            >
              {Math.round(zoom * 100)}%
            </button>
            <button className="segmented-item" onClick={() => zoomBy(1.1)} title="Zoom in">
              <IconZoomIn className="h-4 w-4" />
            </button>
          </div>
          <button className="btn-secondary" onClick={fit} title="Fit both frames with one shared scale">
            <IconFit className="h-4 w-4" />
            Fit
          </button>
          <button className="btn-ghost" onClick={reset} title="Reset zoom & pan (keeps images & issues)">
            <IconReset className="h-4 w-4" />
            Reset
          </button>
        </div>
      </div>

      {usingSample && (
        <div className="border-b border-border bg-bg-elevated px-4 py-1.5 text-center text-xs text-content-secondary">
          Showing a sample long page — upload your own in “New Review” to run QA on real screenshots.
        </div>
      )}

      {selecting && (
        <div className="border-b border-border bg-bg-elevated px-4 py-1.5 text-center text-xs text-content-secondary">
          在设计稿（Design）上拖动选择需要走查的区域 · 按 Esc 取消
        </div>
      )}

      {/* Viewport */}
      <div
        ref={viewportRef}
        onWheel={onWheel}
        onMouseDown={onViewportMouseDown}
        onMouseMove={onViewportMouseMove}
        onMouseUp={endDrag}
        onMouseLeave={endDrag}
        className={`relative flex-1 overflow-hidden bg-bg-base ${
          selecting ? 'cursor-crosshair' : 'cursor-grab active:cursor-grabbing'
        }`}
      >
        {!ready && (
          <div className="absolute inset-0 grid place-items-center text-sm text-content-muted">Loading screenshots…</div>
        )}

        {ready && imgs && (
          <div className="absolute left-0 top-0" style={{ transform, transformOrigin: '0 0' }}>
            {mode === 'overlay' ? (
              <PageFrame label="Overlay" common={base} src={designSrc} imgWidth={base.w}>
                <img src={actualSrc} alt="Actual overlay" draggable={false} className="pointer-events-none absolute left-0 top-0" style={{ opacity, width: base.w }} />
              </PageFrame>
            ) : (
              <div className="relative flex items-start">
                {/* DESIGN */}
                <PageFrame
                  label="Design"
                  common={base}
                  src={designSrc}
                  imgWidth={base.w}
                  boxRef={designBoxRef}
                  onMouseDownCapture={selecting ? beginSelection : undefined}
                  crosshair={selecting}
                >
                  {showBoxes &&
                    issues.map((issue) => (
                      <IssueBox
                        key={issue.id}
                        issue={issue}
                        number={numberOf.get(issue.id) ?? 0}
                        rect={issue.designRect}
                        value={issue.designValue}
                        common={base}
                        selected={selectedIssue?.id === issue.id}
                        dimmed={!!selectedIssue && selectedIssue.id !== issue.id}
                        mode={mode}
                        zoom={zoom}
                        onSelect={() => onSelectIssue(issue.id)}
                      />
                    ))}
                  {liveRegion && (
                    <RegionMarker region={liveRegion} common={base} zoom={zoom} dashed dim label={draft ? `W ${Math.round(liveRegion.width)}  H ${Math.round(liveRegion.height)}` : 'Design region'} />
                  )}
                </PageFrame>

                {/* Connector */}
                <div className="relative self-stretch shrink-0" style={{ width: MIDDLE_W }}>
                  {showBoxes && selectedIssue && <MiddleConnector issue={selectedIssue} contentH={base.h} zoom={zoom} />}
                </div>

                {/* ACTUAL */}
                <PageFrame label="Actual" common={base} src={actualSrc} imgWidth={base.w}>
                  {showBoxes &&
                    issues.map((issue) => (
                      <IssueBox
                        key={issue.id}
                        issue={issue}
                        number={numberOf.get(issue.id) ?? 0}
                        rect={issue.actualRect}
                        value={issue.actualValue}
                        common={base}
                        selected={selectedIssue?.id === issue.id}
                        dimmed={!!selectedIssue && selectedIssue.id !== issue.id}
                        mode={mode}
                        zoom={zoom}
                        onSelect={() => onSelectIssue(issue.id)}
                      />
                    ))}
                  {liveRegion && <RegionMarker region={liveRegion} common={base} zoom={zoom} dashed label="Actual region" />}
                </PageFrame>
              </div>
            )}
          </div>
        )}

        {/* Start Local QA bar */}
        {selecting && pendingRegion && ready && (
          <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-4 rounded-xl border border-border bg-bg-surface/95 px-4 py-2.5 shadow-2xl backdrop-blur">
            <div className="flex items-center gap-3 font-mono text-xs text-content-secondary">
              <span>X {pendingRegion.x}</span>
              <span>Y {pendingRegion.y}</span>
              <span>W {pendingRegion.width}</span>
              <span>H {pendingRegion.height}</span>
            </div>
            <button className="btn-secondary" onClick={onReselect}>重新选择</button>
            <button className="btn-primary" onClick={onStartLocalQA}>开始局部走查</button>
          </div>
        )}

        {mode === 'issues-overlay' && !selectedIssue && ready && !selecting && (
          <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 rounded-lg border border-border bg-bg-surface/90 px-3 py-1.5 text-xs text-content-secondary backdrop-blur">
            点击右侧任意 Issue — Design 与 Actual 会同时定位并测量
          </div>
        )}
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------------- */

function PageFrame({
  label,
  common,
  src,
  children,
  boxRef,
  onMouseDownCapture,
  crosshair,
  imgWidth,
}: {
  label: string
  common: ImgSize
  src: string
  children?: React.ReactNode
  boxRef?: React.Ref<HTMLDivElement>
  onMouseDownCapture?: (e: MouseEvent) => void
  crosshair?: boolean
  imgWidth?: number
}) {
  return (
    <div className="relative shrink-0 rounded-lg border border-border bg-bg-surface p-1 shadow-2xl">
      <FrameLabel>{label}</FrameLabel>
      {/* fixed base-size box → identical display size + top alignment for both frames */}
      <div
        ref={boxRef}
        onMouseDown={onMouseDownCapture}
        className={`relative overflow-hidden rounded bg-bg-base ${crosshair ? 'cursor-crosshair' : ''}`}
        style={{ width: common.w, height: common.h }}
      >
        <img
          src={src}
          alt={label}
          draggable={false}
          className="absolute left-0 top-0 block max-w-none select-none"
          style={imgWidth ? { width: imgWidth } : undefined}
        />
        <div className="absolute inset-0">{children}</div>
      </div>
    </div>
  )
}

function isHex(v: string) {
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v.trim())
}

function IssueBox({
  issue,
  number,
  rect,
  value,
  common,
  selected,
  dimmed,
  mode,
  zoom,
  onSelect,
}: {
  issue: VisualIssue
  number: number
  rect: Rect
  value: string
  common: ImgSize
  selected: boolean
  dimmed: boolean
  mode: ViewMode
  zoom: number
  onSelect: () => void
}) {
  const sev = severityMeta[issue.severity]
  const Icon = issueTypeIcon[issue.type]
  const inv = 1 / zoom
  const fullDetail = (mode === 'issues-overlay' || issue.scope === 'local') && selected
  const num = String(number).padStart(2, '0')
  const diff = issue.difference
  const hasLine = !!issue.measurement
  const isPoint = !hasLine && issue.type === 'position'

  // Subtle, precise overlay: always a 1px on-screen border (÷zoom keeps it 1px
  // regardless of zoom and never thickens when issues overlap), semi-transparent
  // so the underlying UI stays the visual subject; no big colour fill.
  const borderAlpha = issue.severity === 'high' ? 'CC' : issue.severity === 'medium' ? '99' : '66'
  const borderColor = `${sev.hex}${selected ? 'FF' : borderAlpha}`

  // Compact severity-graded label: Critical = filled, Warning = outlined,
  // Low = muted. ~11px text, ~20–22px tall, 5px radius.
  const labelStyle: CSSProperties =
    issue.severity === 'high'
      ? { background: sev.hex, color: '#FFFFFF' }
      : issue.severity === 'medium'
        ? { background: 'rgba(255,255,255,0.96)', color: sev.hex, border: `1px solid ${sev.hex}` }
        : { background: 'rgba(255,255,255,0.94)', color: '#70736F', border: '1px solid #E6E8E3' }

  const style: CSSProperties = {
    left: `${(rect.x / common.w) * 100}%`,
    top: `${(rect.y / common.h) * 100}%`,
    width: `${(rect.width / common.w) * 100}%`,
    height: `${(rect.height / common.h) * 100}%`,
    opacity: dimmed ? 0.3 : 1,
  }

  return (
    <div className="absolute cursor-pointer" style={style} onClick={(e) => { e.stopPropagation(); onSelect() }}>
      <div
        className="absolute inset-0 rounded-[4px]"
        style={{
          border: `${inv}px solid ${borderColor}`,
          background: selected ? `${sev.hex}12` : 'transparent',
          boxShadow: selected ? `0 0 0 ${inv}px ${sev.hex}55` : undefined,
        }}
      />

      {fullDetail && hasLine && (
        <MeasureLine axis={issue.measurement!.type} color={sev.hex} inv={inv} label={value + (issue.unit === 'px' ? 'px' : '')} />
      )}
      {fullDetail && isPoint && (
        <div className="absolute left-1/2 top-1/2" style={{ transform: `translate(-50%,-50%) scale(${inv})` }}>
          <div className="rounded-full" style={{ width: 8, height: 8, background: sev.hex, boxShadow: `0 0 0 3px ${sev.hex}33` }} />
        </div>
      )}

      {/* compact label (hidden when the full callout is shown for the selected issue) */}
      {!fullDetail && (mode === 'difference' || ((mode === 'issues-overlay' || issue.scope === 'local') && !selected)) && (
        <div className="absolute left-0 top-0 origin-bottom-left" style={{ transform: `translate(0, calc(-100% - ${2 * inv}px)) scale(${inv})` }}>
          <span
            className="inline-flex items-center whitespace-nowrap rounded-[5px] px-1.5 py-1 text-[11px] font-medium leading-none shadow-sm"
            style={labelStyle}
          >
            {num} {ISSUE_TYPE_LABEL[issue.type]}{diff ? ` ${diff}` : ''}
          </span>
        </div>
      )}

      {fullDetail && (
        <div className="absolute left-0 top-0 z-10 origin-top-left" style={{ transform: `translate(0, calc(-100% - ${4 * inv}px)) scale(${inv})` }}>
          <div className="min-w-[144px] rounded-lg border border-border bg-bg-surface/95 p-2.5 shadow-card backdrop-blur">
            <div className="mb-1.5 flex items-center gap-1.5">
              <span className="rounded-[4px] px-1.5 py-0.5 text-[10px] font-semibold" style={labelStyle}>{num}</span>
              <Icon className="h-3.5 w-3.5" style={{ color: sev.hex }} />
              <span className="text-xs font-semibold">{ISSUE_TYPE_LABEL[issue.type]}</span>
              <span className="ml-auto text-[10px] font-medium" style={{ color: sev.hex }}>{sev.label}</span>
            </div>
            <p className="mb-1.5 text-[11px] text-content-secondary">{issue.title}</p>
            <div className="flex items-center gap-1.5 text-[12px]">
              {isHex(value) && <span className="inline-block h-3.5 w-3.5 shrink-0 rounded-sm border border-border-strong" style={{ backgroundColor: value }} />}
              <span className="font-mono font-semibold text-content-primary">{value}{issue.unit === 'px' && !isHex(value) ? 'px' : ''}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/** Dashed region marker with optional dimmed exterior + W/H label. */
function RegionMarker({
  region,
  common,
  zoom,
  dashed,
  dim,
  label,
}: {
  region: Rect
  common: ImgSize
  zoom: number
  dashed?: boolean
  dim?: boolean
  label?: string
}) {
  const inv = 1 / zoom
  const style: CSSProperties = {
    left: `${(region.x / common.w) * 100}%`,
    top: `${(region.y / common.h) * 100}%`,
    width: `${(region.width / common.w) * 100}%`,
    height: `${(region.height / common.h) * 100}%`,
  }
  return (
    <div className="absolute" style={style}>
      <div
        className="absolute inset-0 rounded-[3px]"
        style={{
          border: `${Math.max(1, 2 * inv)}px ${dashed ? 'dashed' : 'solid'} #171817`,
          background: dashed ? 'rgba(221,244,90,0.10)' : undefined,
          boxShadow: dim ? `0 0 0 100000px rgba(23,24,23,0.32)` : undefined,
        }}
      />
      {label && (
        <div className="absolute left-0 top-0 origin-bottom-left" style={{ transform: `translate(0, calc(-100% - ${4 * inv}px)) scale(${inv})` }}>
          <span className="whitespace-nowrap rounded bg-[#171817] px-1.5 py-0.5 text-[10px] font-semibold text-white shadow">{label}</span>
        </div>
      )}
    </div>
  )
}

function MeasureLine({ axis, color, inv, label }: { axis: 'vertical' | 'horizontal'; color: string; inv: number; label: string }) {
  const isV = axis === 'vertical'
  return (
    <div className="pointer-events-none absolute inset-0">
      <div
        className="absolute"
        style={
          isV
            ? { left: '50%', top: 0, bottom: 0, borderLeft: `${inv}px dashed ${color}` }
            : { top: '50%', left: 0, right: 0, borderTop: `${inv}px dashed ${color}` }
        }
      />
      {isV ? (
        <>
          <Cap style={{ left: '50%', top: 0 }} color={color} inv={inv} horizontal />
          <Cap style={{ left: '50%', bottom: 0 }} color={color} inv={inv} horizontal />
        </>
      ) : (
        <>
          <Cap style={{ top: '50%', left: 0 }} color={color} inv={inv} />
          <Cap style={{ top: '50%', right: 0 }} color={color} inv={inv} />
        </>
      )}
      {label && (
        <div className="absolute left-1/2 top-1/2 origin-center" style={{ transform: `translate(-50%,-50%) scale(${inv})` }}>
          <span className="whitespace-nowrap rounded px-1.5 py-0.5 text-[11px] font-semibold text-white" style={{ background: color }}>{label}</span>
        </div>
      )}
    </div>
  )
}

function Cap({ style, color, inv, horizontal }: { style: CSSProperties; color: string; inv: number; horizontal?: boolean }) {
  return <div className="absolute" style={{ ...style, transform: `translate(-50%,-50%) scale(${inv})`, width: horizontal ? 12 : 2, height: horizontal ? 2 : 12, background: color }} />
}

function MiddleConnector({ issue, contentH, zoom }: { issue: VisualIssue; contentH: number; zoom: number }) {
  const sev = severityMeta[issue.severity]
  const inv = 1 / zoom
  const centerY = issue.designRect.y + issue.designRect.height / 2
  const topPct = (centerY / contentH) * 100
  const unit = issue.unit === 'px' ? 'px' : ''
  return (
    <div className="absolute left-0 right-0" style={{ top: `${topPct}%` }}>
      <div className="absolute left-0 right-0 top-1/2" style={{ borderTop: `${inv}px dashed ${sev.hex}` }} />
      <div className="absolute left-1/2 top-1/2 origin-center" style={{ transform: `translate(-50%,-50%) scale(${inv})` }}>
        <div className="flex flex-col items-center gap-1 rounded-lg border border-border bg-bg-elevated/95 px-2 py-1.5 shadow-xl backdrop-blur">
          <span className="text-[9px] font-semibold uppercase tracking-wide text-content-muted">Diff</span>
          <span className="whitespace-nowrap text-sm font-bold" style={{ color: sev.hex }}>{issue.difference ?? '—'}</span>
          <div className="flex flex-col items-center text-[10px] leading-tight text-content-secondary">
            <span className="font-mono">D {issue.designValue}{unit}</span>
            <span className="font-mono">A {issue.actualValue}{unit}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function FrameLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="absolute left-2 top-2 z-10 rounded-md bg-bg-base/80 px-2 py-0.5 text-[11px] font-medium text-content-secondary backdrop-blur">
      {children}
    </span>
  )
}
