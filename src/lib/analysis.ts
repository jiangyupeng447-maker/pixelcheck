import type { IssueType, Measurement, Rect, VisualIssue } from '../types'
import { severityFor } from './qaConfig'

/**
 * Visual-analysis interface.
 *
 * PHASE 1: everything here returns *mock* data, but the function shapes are the
 * real contract. When a genuine image-analysis engine is added later, only the
 * bodies of `analyzeFullPage` / `analyzeRegion` / the `detect*Issues` helpers
 * change — the rest of the app already consumes `VisualIssue` unchanged.
 *
 * All rects/points are in the shared **base** coordinate system (see
 * ComparisonCanvas), so a single number positions a box on both frames.
 */

export interface ImagePair {
  design: HTMLImageElement
  actual: HTMLImageElement
}

export interface Size {
  w: number
  h: number
}

const MOCK_CONFIDENCE = 0.9

// --- Per-dimension detector stubs (mock) ---------------------------------
export const detectSpacingIssues = (_p: ImagePair, _r: Rect): VisualIssue[] => []
export const detectSizeIssues = (_p: ImagePair, _r: Rect): VisualIssue[] => []
export const detectPositionIssues = (_p: ImagePair, _r: Rect): VisualIssue[] => []
export const detectColorIssues = (_p: ImagePair, _r: Rect): VisualIssue[] => []
export const detectRadiusIssues = (_p: ImagePair, _r: Rect): VisualIssue[] => []
export const detectTypographyIssues = (_p: ImagePair, _r: Rect): VisualIssue[] => []

/** Converts a base-coordinate rect into a specific image's own pixel space. */
export function baseToImage(r: Rect, imageSize: Size, baseSize: Size): Rect {
  const k = imageSize.w / baseSize.w
  return {
    x: Math.round(r.x * k),
    y: Math.round(r.y * k),
    width: Math.round(r.width * k),
    height: Math.round(r.height * k),
  }
}

/** Builds a vertical measurement guide spanning a rect (base coords). */
function verticalMeasurement(rect: Rect, designValue: string, actualValue: string): Measurement {
  const cx = Math.round(rect.x + rect.width / 2)
  return {
    type: 'vertical',
    start: { x: cx, y: rect.y },
    end: { x: cx, y: rect.y + rect.height },
    designValue,
    actualValue,
  }
}

// -------------------------------------------------------------------------
// Full-page mock analysis
// -------------------------------------------------------------------------

interface Template {
  id: string
  type: IssueType
  title: string
  designValue: string
  actualValue: string
  difference?: string
  unit?: string
  /** numeric magnitude that drives severity (px, ΔE, or typography steps) */
  mag: number
  /** whether to attach a spacing-style measurement guide */
  line?: boolean
  /** fractions of the page: [x, y, w, h] */
  frac: [number, number, number, number]
  /** small actual-vs-design offset fractions: [dx, dy] */
  off?: [number, number]
}

const FULL_PAGE_TEMPLATE: Template[] = [
  { id: 'typography-title', type: 'typography', title: 'Header · Title', designValue: '16 / 24 / 600', actualValue: '16 / 20 / 500', difference: 'line-height & weight', unit: 'px', mag: 2, frac: [0.04, 0.018, 0.32, 0.02] },
  { id: 'position-search-bar', type: 'position', title: 'Search Bar', designValue: 'X 16 · Y 100', actualValue: 'X 20 · Y 98', difference: 'X +4 · Y -2', unit: 'px', mag: 4, frac: [0.04, 0.052, 0.9, 0.024], off: [0.01, -0.001] },
  { id: 'spacing-search-filter', type: 'spacing', title: 'Search → Filter', designValue: '24', actualValue: '16', difference: '-8', unit: 'px', mag: 8, line: true, frac: [0.04, 0.08, 0.9, 0.02], off: [0, -0.001] },
  { id: 'size-card-1', type: 'size', title: 'Card 1', designValue: '358 × 200', actualValue: '358 × 196', difference: '0 × -4', unit: 'px', mag: 4, frac: [0.04, 0.133, 0.9, 0.11] },
  { id: 'spacing-card-gap', type: 'spacing', title: 'Card 1 → Card 2', designValue: '16', actualValue: '12', difference: '-4', unit: 'px', mag: 4, line: true, frac: [0.04, 0.248, 0.9, 0.018], off: [0, -0.002] },
  { id: 'radius-card-3', type: 'radius', title: 'Card 3', designValue: '12', actualValue: '8', difference: '-4', unit: 'px', mag: 4, frac: [0.04, 0.39, 0.25, 0.05] },
  { id: 'color-card-4-button', type: 'color', title: 'Card 4 · Primary Button', designValue: '#1677FF', actualValue: '#1677F2', difference: 'ΔE 1.4', mag: 1.4, frac: [0.64, 0.6, 0.28, 0.02], off: [0, -0.002] },
  { id: 'spacing-footer', type: 'spacing', title: 'Footer · Section spacing', designValue: '32', actualValue: '24', difference: '-8', unit: 'px', mag: 8, line: true, frac: [0.04, 0.9, 0.9, 0.03], off: [0, -0.002] },
]

function rectFrom(frac: [number, number, number, number], size: Size): Rect {
  return {
    x: Math.round(frac[0] * size.w),
    y: Math.round(frac[1] * size.h),
    width: Math.round(frac[2] * size.w),
    height: Math.round(frac[3] * size.h),
  }
}

/**
 * Whole-page acceptance. Produces issues whose Y coordinates span the entire
 * page height (top → middle → bottom). `rescan` adds light positional jitter.
 */
export function analyzeFullPage(baseSize: Size, rescan = false): VisualIssue[] {
  return FULL_PAGE_TEMPLATE.map((t) => {
    const jitterY = rescan ? (Math.random() - 0.5) * 0.02 : 0
    const dFrac: [number, number, number, number] = [t.frac[0], Math.max(0, t.frac[1] + jitterY), t.frac[2], t.frac[3]]
    const off = t.off ?? [0, 0]
    const aFrac: [number, number, number, number] = [dFrac[0] + off[0], dFrac[1] + off[1], t.frac[2], t.frac[3]]
    const designRect = rectFrom(dFrac, baseSize)
    const actualRect = rectFrom(aFrac, baseSize)
    return {
      id: t.id,
      type: t.type,
      severity: severityFor(t.type, t.mag),
      scope: 'global' as const,
      title: t.title,
      designValue: t.designValue,
      actualValue: t.actualValue,
      difference: t.difference,
      unit: t.unit,
      designRect,
      actualRect,
      measurement: t.line ? verticalMeasurement(designRect, t.designValue, t.actualValue) : undefined,
      confidence: MOCK_CONFIDENCE,
    }
  })
}

/**
 * Local acceptance of a single user-selected region (base coordinates).
 * Only issues *inside* the region are produced — global issues are excluded.
 */
export function analyzeRegion(region: Rect): VisualIssue[] {
  const sub = (fx: number, fy: number, fw: number, fh: number): Rect => ({
    x: Math.round(region.x + region.width * fx),
    y: Math.round(region.y + region.height * fy),
    width: Math.round(region.width * fw),
    height: Math.round(region.height * fh),
  })

  const make = (
    id: string,
    type: IssueType,
    title: string,
    designValue: string,
    actualValue: string,
    difference: string | undefined,
    unit: string | undefined,
    mag: number,
    line: boolean,
    df: [number, number, number, number],
    af: [number, number, number, number],
  ): VisualIssue => {
    const designRect = sub(...df)
    const actualRect = sub(...af)
    return {
      id,
      type,
      severity: severityFor(type, mag),
      scope: 'local',
      title,
      designValue,
      actualValue,
      difference,
      unit,
      designRect,
      actualRect,
      measurement: line ? verticalMeasurement(designRect, designValue, actualValue) : undefined,
      confidence: MOCK_CONFIDENCE,
    }
  }

  return [
    make('local-padding', 'spacing', 'Card padding', '20', '16', '-4', 'px', 4, true, [0.08, 0.08, 0.14, 0.84], [0.08, 0.08, 0.14, 0.84]),
    make('local-title-gap', 'spacing', 'Title → Content', '16', '12', '-4', 'px', 4, true, [0.28, 0.2, 0.5, 0.12], [0.28, 0.22, 0.5, 0.1]),
    make('local-radius', 'radius', 'Corner radius', '12', '8', '-4', 'px', 4, false, [0.06, 0.06, 0.24, 0.2], [0.06, 0.06, 0.24, 0.2]),
    make('local-position', 'position', 'Block offset', 'X 0 · Y 0', 'X +4 · Y -2', 'X +4 · Y -2', 'px', 4, false, [0.3, 0.55, 0.5, 0.28], [0.32, 0.56, 0.5, 0.28]),
  ]
}
