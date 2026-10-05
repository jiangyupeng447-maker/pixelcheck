// Measurement helpers: colour sampling and vertical content extent, used to
// translate raw pixel differences into meaningful UI measurements.

import type { Rect } from '../../types'

export interface RGB {
  r: number
  g: number
  b: number
}

/** Average colour inside a rect (sub-sampled for speed). */
export function averageColor(data: ImageData, rect: Rect): RGB {
  const x0 = Math.max(0, Math.floor(rect.x))
  const y0 = Math.max(0, Math.floor(rect.y))
  const x1 = Math.min(data.width, Math.floor(rect.x + rect.width))
  const y1 = Math.min(data.height, Math.floor(rect.y + rect.height))
  const stepX = Math.max(1, Math.floor((x1 - x0) / 24))
  const stepY = Math.max(1, Math.floor((y1 - y0) / 24))
  let r = 0
  let g = 0
  let b = 0
  let n = 0
  for (let y = y0; y < y1; y += stepY) {
    for (let x = x0; x < x1; x += stepX) {
      const i = (y * data.width + x) * 4
      r += data.data[i]
      g += data.data[i + 1]
      b += data.data[i + 2]
      n++
    }
  }
  if (!n) return { r: 0, g: 0, b: 0 }
  return { r: Math.round(r / n), g: Math.round(g / n), b: Math.round(b / n) }
}

export function rgbToHex({ r, g, b }: RGB): string {
  const h = (v: number) => v.toString(16).padStart(2, '0')
  return `#${h(r)}${h(g)}${h(b)}`.toUpperCase()
}

/** Perceptual-ish colour distance (0..~120 typical). */
export function colorDistance(a: RGB, b: RGB): number {
  const dr = a.r - b.r
  const dg = a.g - b.g
  const db = a.b - b.b
  // luminance-weighted euclidean
  return Math.sqrt(0.3 * dr * dr + 0.59 * dg * dg + 0.11 * db * db)
}

function luma(r: number, g: number, b: number): number {
  return 0.299 * r + 0.587 * g + 0.114 * b
}

/**
 * Vertical extent of "ink" (content) inside a rect, relative to the rect top.
 * Background is estimated from the rect's first row. Returns top offset & height
 * of the content band — used to derive position / size differences.
 */
export function contentExtent(data: ImageData, rect: Rect): { top: number; height: number } {
  const x0 = Math.max(0, Math.floor(rect.x))
  const y0 = Math.max(0, Math.floor(rect.y))
  const x1 = Math.min(data.width, Math.floor(rect.x + rect.width))
  const y1 = Math.min(data.height, Math.floor(rect.y + rect.height))
  const w = x1 - x0
  const h = y1 - y0
  if (w <= 0 || h <= 0) return { top: 0, height: 0 }

  // background luma = average of the top row
  let bg = 0
  let bn = 0
  for (let x = x0; x < x1; x += Math.max(1, (w / 24) | 0)) {
    const i = (y0 * data.width + x) * 4
    bg += luma(data.data[i], data.data[i + 1], data.data[i + 2])
    bn++
  }
  bg = bn ? bg / bn : 0

  const stepX = Math.max(1, (w / 32) | 0)
  let top = -1
  let bottom = -1
  for (let y = y0; y < y1; y++) {
    let ink = 0
    let cnt = 0
    for (let x = x0; x < x1; x += stepX) {
      const i = (y * data.width + x) * 4
      if (Math.abs(luma(data.data[i], data.data[i + 1], data.data[i + 2]) - bg) > 14) ink++
      cnt++
    }
    if (cnt && ink / cnt > 0.06) {
      if (top < 0) top = y - y0
      bottom = y - y0
    }
  }
  if (top < 0) return { top: 0, height: 0 }
  return { top, height: bottom - top + 1 }
}

/**
 * Horizontal extent of "ink" inside a rect, relative to the rect left.
 * Used to derive X position differences.
 */
export function contentExtentX(data: ImageData, rect: Rect): { left: number; width: number } {
  const x0 = Math.max(0, Math.floor(rect.x))
  const y0 = Math.max(0, Math.floor(rect.y))
  const x1 = Math.min(data.width, Math.floor(rect.x + rect.width))
  const y1 = Math.min(data.height, Math.floor(rect.y + rect.height))
  const w = x1 - x0
  const h = y1 - y0
  if (w <= 0 || h <= 0) return { left: 0, width: 0 }

  // background luma = average of the left column
  let bg = 0
  let bn = 0
  for (let y = y0; y < y1; y += Math.max(1, (h / 24) | 0)) {
    const i = (y * data.width + x0) * 4
    bg += luma(data.data[i], data.data[i + 1], data.data[i + 2])
    bn++
  }
  bg = bn ? bg / bn : 0

  const stepY = Math.max(1, (h / 32) | 0)
  let left = -1
  let right = -1
  for (let x = x0; x < x1; x++) {
    let ink = 0
    let cnt = 0
    for (let y = y0; y < y1; y += stepY) {
      const i = (y * data.width + x) * 4
      if (Math.abs(luma(data.data[i], data.data[i + 1], data.data[i + 2]) - bg) > 14) ink++
      cnt++
    }
    if (cnt && ink / cnt > 0.06) {
      if (left < 0) left = x - x0
      right = x - x0
    }
  }
  if (left < 0) return { left: 0, width: 0 }
  return { left, width: right - left + 1 }
}

/**
 * Edge/texture density inside a rect (0..1): fraction of sampled pixels whose
 * horizontal luma gradient exceeds a threshold. Text and busy photo content
 * have high edge density; solid UI surfaces are low. Used to down-weight
 * anti-aliased text and content-heavy regions.
 */
export function edgeDensity(data: ImageData, rect: Rect): number {
  const x0 = Math.max(0, Math.floor(rect.x))
  const y0 = Math.max(0, Math.floor(rect.y))
  const x1 = Math.min(data.width, Math.floor(rect.x + rect.width))
  const y1 = Math.min(data.height, Math.floor(rect.y + rect.height))
  if (x1 - x0 < 2 || y1 - y0 < 1) return 0
  const stepX = Math.max(1, ((x1 - x0) / 48) | 0)
  const stepY = Math.max(1, ((y1 - y0) / 48) | 0)
  let edges = 0
  let n = 0
  for (let y = y0; y < y1; y += stepY) {
    for (let x = x0; x < x1 - 1; x += stepX) {
      const i = (y * data.width + x) * 4
      const j = (y * data.width + x + 1) * 4
      const l1 = luma(data.data[i], data.data[i + 1], data.data[i + 2])
      const l2 = luma(data.data[j], data.data[j + 1], data.data[j + 2])
      if (Math.abs(l1 - l2) > 24) edges++
      n++
    }
  }
  return n ? edges / n : 0
}
