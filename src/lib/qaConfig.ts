import type { IssueType, Severity } from '../types'

/**
 * Central QA configuration. Thresholds and zoom presets live here (not scattered
 * across components) so they are easy to tune and, later, share with the real
 * analysis engine.
 */

export const ZOOM_PRESETS = [0.25, 0.33, 0.5, 0.67, 1, 1.5]

export const ZOOM_MIN = 0.1
export const ZOOM_MAX = 5

/**
 * Per-pixel RGB difference threshold (0..255). Below this a pixel counts as
 * "same" — this filters out anti-aliasing / sub-pixel noise so text edges don't
 * light up as issues. Recommended 20–30.
 */
export const PIXEL_DIFF_THRESHOLD = 24

/**
 * Real-analysis tolerances & noise filters. Kept here so they are easy to tune
 * and never hard-coded inside the detector/components.
 */
export const analysisConfig = {
  // --- candidate region filtering ---
  minDiffPixels: 20, // ignore diff clusters smaller than this (analysis px)
  minRegionArea: 32, // ignore regions smaller than this area (analysis px²)
  // --- tolerances (base px / RGB distance) ---
  spacingTolerance: 2,
  positionTolerance: 2,
  sizeTolerance: 2,
  colorTolerance: 5,
  colorCritical: 12, // >= this RGB distance → Critical
  pxCritical: 4, // > this px difference → Critical (else Warning)
  // --- V2 false-positive reduction ---
  matchConfidence: 0.75, // Design↔Actual region match must reach this to classify
  issueConfidence: 0.7, // final issue confidence gate
  textEdgeDensity: 0.18, // >= → text/texture-like region (suppress geometric issues)
  contentAreaFrac: 0.06, // region area fraction of page → "content-heavy"
  contentStrength: 0.5, // diff density → "content-heavy"
  textMaxHeight: 40, // base px; short + high-edge regions are treated as text
}

/** Severity for a pixel-magnitude difference given a tolerance (below → pass). */
export function severityFromPx(diff: number, tolerance: number): Severity | null {
  const m = Math.abs(diff)
  if (m <= tolerance) return null // within tolerance → no issue
  return m > analysisConfig.pxCritical ? 'high' : 'medium'
}

/** Severity for a colour distance (below tolerance → pass). */
export function severityFromColor(dist: number): Severity | null {
  if (dist <= analysisConfig.colorTolerance) return null
  return dist >= analysisConfig.colorCritical ? 'high' : 'medium'
}

/**
 * Magnitude thresholds used to derive severity from a measured difference.
 * Unit depends on the type: px for spacing/size/position/radius, ΔE for color,
 * "steps" (weight / line-height deltas) for typography.
 */
export const severityThresholds: Record<IssueType, { high: number; medium: number }> = {
  spacing: { high: 8, medium: 4 },
  size: { high: 8, medium: 4 },
  position: { high: 6, medium: 3 },
  radius: { high: 8, medium: 4 },
  color: { high: 3, medium: 1.5 },
  typography: { high: 2, medium: 1 },
}

/** Derive High / Medium / Low from a numeric magnitude for the given type. */
export function severityFor(type: IssueType, magnitude: number): Severity {
  const t = severityThresholds[type]
  const m = Math.abs(magnitude)
  if (m >= t.high) return 'high'
  if (m >= t.medium) return 'medium'
  return 'low'
}
