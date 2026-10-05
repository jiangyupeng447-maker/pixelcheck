// Region matching / stability classification (V2 false-positive reduction).
//
// A diff region only becomes a real QA issue if it corresponds to a STABLE UI
// element in both Design and Actual — not anti-aliased text, not busy photo /
// banner content. This module inspects the Design & Actual pixels inside a
// candidate region and reports the region "kind" plus a match confidence.

import type { Rect } from '../../types'
import { analysisConfig } from '../qaConfig'
import { averageColor, colorDistance, edgeDensity } from './measurement'

export type RegionKind = 'stable' | 'text' | 'content'

export interface RegionMatch {
  region: Rect // analysis-coord rect
  kind: RegionKind
  confidence: number // 0..1 — how confident this is the SAME UI element in both
}

interface Size {
  w: number
  h: number
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))

/**
 * Classify a candidate region and estimate Design↔Actual match confidence.
 * `heightBasePx` is the region height in base coordinates (for the text test).
 */
export function matchRegion(
  design: ImageData,
  actual: ImageData,
  region: Rect,
  analysisSize: Size,
  heightBasePx: number,
  strength: number,
): RegionMatch {
  const dEdge = edgeDensity(design, region)
  const aEdge = edgeDensity(actual, region)
  const edge = Math.max(dEdge, aEdge)

  const areaFrac = (region.width * region.height) / Math.max(1, analysisSize.w * analysisSize.h)

  // texture-like (text / icon strokes): short + high edge density
  const isText = edge >= analysisConfig.textEdgeDensity && heightBasePx <= analysisConfig.textMaxHeight
  // content-heavy (photo / banner / map): large area + dense diff + textured
  const isContent =
    areaFrac >= analysisConfig.contentAreaFrac &&
    strength >= analysisConfig.contentStrength &&
    edge >= analysisConfig.textEdgeDensity * 0.7

  const kind: RegionKind = isText ? 'text' : isContent ? 'content' : 'stable'

  // Base confidence by kind — stable UI regions are trustworthy; text/content
  // are noisy and should rarely produce geometric issues.
  let confidence = kind === 'stable' ? 0.9 : kind === 'text' ? 0.45 : 0.4

  // Aspect-ratio sanity: extreme slivers are usually noise → lower confidence.
  const ar = region.width / Math.max(1, region.height)
  if (ar > 25 || ar < 0.04) confidence -= 0.25

  // If Design & Actual average colours are wildly different across a large
  // region, it is content replacement rather than a UI token change.
  const cd = colorDistance(averageColor(design, region), averageColor(actual, region))
  if (kind === 'content' && cd > 40) confidence -= 0.15

  return { region, kind, confidence: clamp01(confidence) }
}
