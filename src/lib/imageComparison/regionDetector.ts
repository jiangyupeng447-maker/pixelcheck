// Clusters a difference mask into bounding boxes of changed regions using a
// coarse cell grid + connected-components (4-neighbour flood fill).

export interface RegionBox {
  x: number
  y: number
  width: number
  height: number
  /** 0..1 average diff density inside the region — a confidence proxy. */
  strength: number
  /** total differing pixels inside the region (analysis px) */
  pixelCount: number
}

export interface DetectOptions {
  cell?: number // grid cell size in px
  cellFillRatio?: number // min diff density for a cell to be "active"
  minCells?: number // min connected cells to keep a region
  maxRegions?: number
  minDiffPixels?: number // drop regions with fewer differing pixels
  minRegionArea?: number // drop regions smaller than this area (px²)
}

export function detectRegions(
  mask: Uint8Array,
  width: number,
  height: number,
  opts: DetectOptions = {},
): RegionBox[] {
  const cell = opts.cell ?? 8
  const cellFillRatio = opts.cellFillRatio ?? 0.14
  const minCells = opts.minCells ?? 4
  const maxRegions = opts.maxRegions ?? 14
  const minDiffPixels = opts.minDiffPixels ?? 0
  const minRegionArea = opts.minRegionArea ?? 0

  const cw = Math.ceil(width / cell)
  const ch = Math.ceil(height / cell)
  const cellHit = new Float32Array(cw * ch)

  for (let y = 0; y < height; y++) {
    const cy = (y / cell) | 0
    for (let x = 0; x < width; x++) {
      if (mask[y * width + x]) cellHit[cy * cw + ((x / cell) | 0)]++
    }
  }

  const cellArea = cell * cell
  const active = new Uint8Array(cw * ch)
  for (let i = 0; i < cellHit.length; i++) active[i] = cellHit[i] > cellArea * cellFillRatio ? 1 : 0

  const seen = new Uint8Array(cw * ch)
  const regions: RegionBox[] = []
  const stack: number[] = []

  for (let start = 0; start < active.length; start++) {
    if (!active[start] || seen[start]) continue
    let minx = cw
    let miny = ch
    let maxx = 0
    let maxy = 0
    let count = 0
    let strength = 0
    let pixels = 0
    stack.length = 0
    stack.push(start)
    seen[start] = 1
    while (stack.length) {
      const c = stack.pop() as number
      const cx = c % cw
      const cy = (c - cx) / cw
      if (cx < minx) minx = cx
      if (cy < miny) miny = cy
      if (cx > maxx) maxx = cx
      if (cy > maxy) maxy = cy
      count++
      strength += cellHit[c] / cellArea
      pixels += cellHit[c]
      if (cx > 0 && active[c - 1] && !seen[c - 1]) { seen[c - 1] = 1; stack.push(c - 1) }
      if (cx < cw - 1 && active[c + 1] && !seen[c + 1]) { seen[c + 1] = 1; stack.push(c + 1) }
      if (cy > 0 && active[c - cw] && !seen[c - cw]) { seen[c - cw] = 1; stack.push(c - cw) }
      if (cy < ch - 1 && active[c + cw] && !seen[c + cw]) { seen[c + cw] = 1; stack.push(c + cw) }
    }
    if (count < minCells) continue
    const w = Math.min(width, (maxx - minx + 1) * cell)
    const h = Math.min(height, (maxy - miny + 1) * cell)
    if (pixels < minDiffPixels) continue
    if (w * h < minRegionArea) continue
    regions.push({
      x: minx * cell,
      y: miny * cell,
      width: w,
      height: h,
      strength: Math.min(1, strength / count),
      pixelCount: pixels,
    })
  }

  regions.sort((a, b) => b.width * b.height - a.width * a.height)
  return regions.slice(0, maxRegions)
}
