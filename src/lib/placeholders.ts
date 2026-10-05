// Generates two long "full page" sample screenshots (Design vs Actual) on a
// canvas, so the whole-page QA experience is explorable before any real upload.
// The page is intentionally tall to demonstrate top → middle → bottom analysis.

export const SAMPLE_W = 390
export const SAMPLE_H = 1800

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

function drawPage(ctx: CanvasRenderingContext2D, variant: 'design' | 'actual') {
  const w = SAMPLE_W
  const h = SAMPLE_H
  // small deltas so Actual differs subtly from Design
  const gapShift = variant === 'actual' ? -4 : 0
  const accent = variant === 'actual' ? '#1677F2' : '#1677FF'
  const surface = '#171A20'
  const line = '#2B2F37'

  ctx.fillStyle = '#0F1115'
  ctx.fillRect(0, 0, w, h)

  // Header
  ctx.fillStyle = surface
  ctx.fillRect(0, 0, w, 72)
  ctx.fillStyle = accent
  roundRect(ctx, 16, variant === 'actual' ? 22 : 24, 120, 24, 6) // title (typography/position issue)
  ctx.fill()
  ctx.fillStyle = line
  roundRect(ctx, w - 60, 24, 44, 24, 12)
  ctx.fill()

  // Search bar
  ctx.fillStyle = surface
  roundRect(ctx, variant === 'actual' ? 20 : 16, variant === 'actual' ? 98 : 100, 358, 44, 12)
  ctx.fill()

  // Filter row
  for (let i = 0; i < 4; i++) {
    ctx.fillStyle = i === 0 ? accent : line
    roundRect(ctx, 16 + i * 92, 176, 84, 32, 16)
    ctx.fill()
  }

  // Cards 1..5
  const cardTops = [240, 470, 700, 930, 1160]
  cardTops.forEach((top, idx) => {
    const t = top + (idx > 0 ? gapShift : 0)
    const cardH = idx === 0 && variant === 'actual' ? 196 : 200
    ctx.fillStyle = surface
    roundRect(ctx, 16, t, 358, cardH, variant === 'actual' ? 8 : 12)
    ctx.fill()
    // image block
    ctx.fillStyle = '#20242B'
    roundRect(ctx, 32, t + 16, 120, cardH - 32, 8)
    ctx.fill()
    // title / text lines
    ctx.fillStyle = '#333944'
    roundRect(ctx, 168, t + 24, 180, 18, 5)
    ctx.fill()
    roundRect(ctx, 168, t + 52, 150, 14, 5)
    ctx.fill()
    // button (card 4 → color issue)
    ctx.fillStyle = accent
    roundRect(ctx, 250, t + cardH - 52, 110, 36, 10)
    ctx.fill()
  })

  // Footer
  ctx.fillStyle = surface
  ctx.fillRect(0, 1600, w, h - 1600)
  ctx.fillStyle = line
  roundRect(ctx, 16, 1620 + (variant === 'actual' ? 0 : 4), 358, variant === 'actual' ? 32 : 40, 8)
  ctx.fill()
  ctx.fillStyle = '#333944'
  roundRect(ctx, 16, 1700, 200, 16, 5)
  ctx.fill()
}

function makeSample(variant: 'design' | 'actual'): string {
  const canvas = document.createElement('canvas')
  canvas.width = SAMPLE_W
  canvas.height = SAMPLE_H
  const ctx = canvas.getContext('2d')!
  drawPage(ctx, variant)
  return canvas.toDataURL('image/png')
}

export const sampleDesign = makeSample('design')
export const sampleActual = makeSample('actual')
