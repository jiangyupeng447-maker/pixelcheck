// Low-level per-pixel difference. This is the auxiliary detection layer — its
// output feeds region detection; it is NOT presented as the QA result itself.

export interface DiffResult {
  mask: Uint8Array // 1 where pixels differ beyond threshold
  width: number
  height: number
  ratio: number // fraction of differing pixels (auxiliary indicator)
}

/** Both ImageData are expected to share the same dimensions (Actual resampled to base). */
export function computeDiffMask(a: ImageData, b: ImageData, threshold = 28): DiffResult {
  const width = Math.min(a.width, b.width)
  const height = Math.min(a.height, b.height)
  const mask = new Uint8Array(width * height)
  const da = a.data
  const db = b.data
  let diff = 0
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const ia = (y * a.width + x) * 4
      const ib = (y * b.width + x) * 4
      const d = (Math.abs(da[ia] - db[ib]) + Math.abs(da[ia + 1] - db[ib + 1]) + Math.abs(da[ia + 2] - db[ib + 2])) / 3
      if (d > threshold) {
        mask[y * width + x] = 1
        diff++
      }
    }
  }
  return { mask, width, height, ratio: width && height ? diff / (width * height) : 0 }
}
