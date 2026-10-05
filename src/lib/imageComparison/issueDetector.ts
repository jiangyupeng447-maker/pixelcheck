// Turns raw pixel differences into classified, human-meaningful UI issues.
// Design & Actual are rasterized into the SAME base box (see index.ts), so a
// diff region is the same location in both frames. Output is `VisualIssue`.

import type { IssueType, Measurement, Rect, Severity, VisualIssue } from '../../types'
import { PIXEL_DIFF_THRESHOLD, analysisConfig, severityFromColor, severityFromPx } from '../qaConfig'
import { computeDiffMask } from './pixelDiff'
import { detectRegions, type RegionBox } from './regionDetector'
import { averageColor, colorDistance, contentExtent, contentExtentX, rgbToHex } from './measurement'
import { matchRegion } from './regionMatcher'

export interface Size {
  w: number
  h: number
}

export interface AnalyzeResult {
  issues: VisualIssue[]
  pixelDiffRatio: number
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))

function scaleRect(r: RegionBox | Rect, kx: number, ky: number): Rect {
  return {
    x: Math.round(r.x * kx),
    y: Math.round(r.y * ky),
    width: Math.round(r.width * kx),
    height: Math.round(r.height * ky),
  }
}

function verticalMeasurement(rect: Rect, designValue: string, actualValue: string): Measurement {
  const cx = Math.round(rect.x + rect.width / 2)
  return { type: 'vertical', start: { x: cx, y: rect.y }, end: { x: cx, y: rect.y + rect.height }, designValue, actualValue }
}

const TITLE: Record<IssueType, string> = {
  spacing: '间距',
  size: '尺寸',
  position: '位置',
  color: '颜色',
  radius: '圆角',
  typography: '排版',
}

/**
 * Analyzes two already-rasterized images (same dimensions — Actual resampled to
 * the Design/base coordinate box). `bounds` (analysis coords) optionally
 * restricts analysis to a region (Local QA).
 */
export function analyzeImageData(
  design: ImageData,
  actual: ImageData,
  baseSize: Size,
  scope: 'global' | 'local',
  bounds?: Rect,
): AnalyzeResult {
  const diff = computeDiffMask(design, actual, PIXEL_DIFF_THRESHOLD)
  const kx = baseSize.w / diff.width
  const ky = baseSize.h / diff.height

  let regions = detectRegions(diff.mask, diff.width, diff.height, {
    maxRegions: scope === 'local' ? 8 : 16,
    minDiffPixels: analysisConfig.minDiffPixels,
    minRegionArea: analysisConfig.minRegionArea,
  })

  if (bounds) {
    regions = regions
      .map((r) => {
        const x = Math.max(r.x, bounds.x)
        const y = Math.max(r.y, bounds.y)
        const x2 = Math.min(r.x + r.width, bounds.x + bounds.width)
        const y2 = Math.min(r.y + r.height, bounds.y + bounds.height)
        return { ...r, x, y, width: x2 - x, height: y2 - y }
      })
      .filter((r) => r.width > 4 && r.height > 4)
  }

  const analysisSize = { w: diff.width, h: diff.height }
  const issues: VisualIssue[] = []

  regions.forEach((region, idx) => {
    // ---- stability / kind gate (drop text & photo/banner content) ----
    const heightBasePx = region.height * ky
    const match = matchRegion(design, actual, region, analysisSize, heightBasePx, region.strength)
    if (match.kind !== 'stable') return
    if (match.confidence < analysisConfig.matchConfidence) return

    // A near-full-page diff region is a layout/viewport difference, not a single
    // element's size change → do not emit a bogus whole-page Size issue.
    const coverW = region.width / diff.width
    const coverH = region.height / diff.height
    if (coverW > 0.85 && coverH > 0.85) return

    const dAvg = averageColor(design, region)
    const aAvg = averageColor(actual, region)
    const cd = colorDistance(dAvg, aAvg)

    const dExt = contentExtent(design, region)
    const aExt = contentExtent(actual, region)
    const dExtX = contentExtentX(design, region)
    const aExtX = contentExtentX(actual, region)

    const topDelta = (aExt.top - dExt.top) * ky // base px (Y offset)
    const heightDelta = (aExt.height - dExt.height) * ky // base px
    const leftDelta = (aExtX.left - dExtX.left) * kx // base px (X offset)

    const geoY = Math.abs(topDelta)
    const geoH = Math.abs(heightDelta)
    const geoX = Math.abs(leftDelta)

    let type: IssueType
    let designValue: string
    let actualValue: string
    let difference: string
    let unit: string | undefined
    let severity: Severity
    let withLine = false

    const geomSmall =
      geoY <= analysisConfig.spacingTolerance && geoH <= analysisConfig.sizeTolerance && geoX <= analysisConfig.positionTolerance

    const colorSev = severityFromColor(cd)
    const spacingSev = severityFromPx(topDelta, analysisConfig.spacingTolerance)
    const sizeSev = severityFromPx(heightDelta, analysisConfig.sizeTolerance)
    const posSev = severityFromPx(leftDelta, analysisConfig.positionTolerance)

    if (colorSev && geomSmall) {
      type = 'color'
      designValue = rgbToHex(dAvg)
      actualValue = rgbToHex(aAvg)
      difference = `ΔE ${cd.toFixed(1)}`
      severity = colorSev
    } else if (spacingSev && geoY >= geoH && geoY >= geoX) {
      type = 'spacing'
      const dv = Math.round(dExt.top * ky)
      const av = Math.round(aExt.top * ky)
      designValue = String(dv)
      actualValue = String(av)
      difference = `${topDelta > 0 ? '+' : ''}${Math.round(topDelta)}`
      unit = 'px'
      severity = spacingSev
      withLine = true
    } else if (posSev && geoX >= geoH) {
      type = 'position'
      const dl = Math.round(dExtX.left * kx)
      const al = Math.round(aExtX.left * kx)
      designValue = `X ${dl}`
      actualValue = `X ${al}`
      difference = `${leftDelta > 0 ? '+' : ''}${Math.round(leftDelta)} X`
      unit = 'px'
      severity = posSev
    } else if (sizeSev) {
      type = 'size'
      const dh = Math.round(dExt.height * ky)
      const ah = Math.round(aExt.height * ky)
      const w = Math.round(region.width * kx)
      designValue = `${w} × ${dh}`
      actualValue = `${w} × ${ah}`
      difference = `0 × ${heightDelta > 0 ? '+' : ''}${Math.round(heightDelta)}`
      unit = 'px'
      severity = sizeSev
    } else if (colorSev) {
      type = 'color'
      designValue = rgbToHex(dAvg)
      actualValue = rgbToHex(aAvg)
      difference = `ΔE ${cd.toFixed(1)}`
      severity = colorSev
    } else {
      return // within all tolerances → pass, no issue
    }

    const designRect = scaleRect(region, kx, ky)
    const actualRect: Rect =
      type === 'spacing'
        ? { ...designRect, y: designRect.y + Math.round(topDelta) }
        : type === 'position'
          ? { ...designRect, x: designRect.x + Math.round(leftDelta) }
          : { ...designRect }

    const magNorm =
      type === 'color'
        ? Math.min(1, cd / 24)
        : Math.min(1, (type === 'spacing' ? geoY : type === 'position' ? geoX : geoH) / 12)
    const confidence = clamp01(0.4 * match.confidence + 0.4 * magNorm + 0.2 * region.strength)
    if (confidence < analysisConfig.issueConfidence) return

    const yFrac = designRect.y / Math.max(1, baseSize.h)
    const where = yFrac < 0.33 ? '顶部' : yFrac < 0.66 ? '中部' : '底部'

    issues.push({
      id: `${scope}-${type}-${idx}-${designRect.y}`,
      type,
      severity,
      scope,
      title: `${TITLE[type]} · ${where}区域`,
      description: `Detected from pixel-level comparison (${where}).`,
      designValue,
      actualValue,
      difference,
      unit,
      designRect,
      actualRect,
      measurement: withLine ? verticalMeasurement(designRect, designValue, actualValue) : undefined,
      confidence,
    })
  })

  issues.sort((a, b) => a.designRect.y - b.designRect.y)
  return { issues, pixelDiffRatio: diff.ratio }
}
