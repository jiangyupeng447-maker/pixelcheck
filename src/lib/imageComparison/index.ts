// High-level entry points for the real image comparison engine.
//
//   Design Image ─┐
//                 ├─► unified coordinate box ─► pixel diff ─► regions
//   Actual Image ─┘        ─► matching ─► classified issues (few & accurate)
//
// Everything runs locally in the browser. No AI / network calls.

import type { Rect, VisualIssue } from '../../types'
import { loadImageElement, toImageData, type Size } from './imageLoader'
import { analyzeImageData, type AnalyzeResult } from './issueDetector'

export type { Size } from './imageLoader'
export type { AnalyzeResult } from './issueDetector'
export { computeDiffMask } from './pixelDiff'
export { detectRegions } from './regionDetector'
export { matchRegion } from './regionMatcher'

const MAX_ANALYSIS_WIDTH = 480

function analysisSize(baseSize: Size): Size {
  const w = Math.min(baseSize.w, MAX_ANALYSIS_WIDTH)
  const h = Math.max(1, Math.round((w * baseSize.h) / baseSize.w))
  return { w, h }
}

/** Full-page analysis of a real Design + Actual pair (base = Design coords). */
export async function analyzeImagePair(designSrc: string, actualSrc: string, baseSize: Size): Promise<AnalyzeResult> {
  const [designImg, actualImg] = await Promise.all([loadImageElement(designSrc), loadImageElement(actualSrc)])
  const a = analysisSize(baseSize)
  // Both rasterized into the SAME box → Actual mapped into Design's coordinate box.
  const design = toImageData(designImg, a.w, a.h)
  const actual = toImageData(actualImg, a.w, a.h)
  return analyzeImageData(design, actual, baseSize, 'global')
}

/** Local analysis restricted to a user-selected region (base coordinates). */
export async function analyzeImageRegion(
  designSrc: string,
  actualSrc: string,
  baseSize: Size,
  region: Rect,
): Promise<VisualIssue[]> {
  const [designImg, actualImg] = await Promise.all([loadImageElement(designSrc), loadImageElement(actualSrc)])
  const a = analysisSize(baseSize)
  const design = toImageData(designImg, a.w, a.h)
  const actual = toImageData(actualImg, a.w, a.h)
  const k = a.w / baseSize.w
  const bounds: Rect = {
    x: Math.round(region.x * k),
    y: Math.round(region.y * k),
    width: Math.round(region.width * k),
    height: Math.round(region.height * k),
  }
  return analyzeImageData(design, actual, baseSize, 'local', bounds).issues
}
