import { DPI, PHOTO_IN, SHEET } from './spec.js'

export function layoutSheet(dpi = DPI) {
  const width = Math.round(SHEET.widthIn * dpi)
  const height = Math.round(SHEET.heightIn * dpi)
  const size = Math.round(PHOTO_IN * dpi)
  const left = Math.round(SHEET.marginIn * dpi)
  const gap = Math.round(SHEET.gapIn * dpi)

  const photos = []
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 2; col++) {
      photos.push({ x: left + col * (size + gap), y: row * size, size })
    }
  }

  const photosRight = left + 2 * size + gap
  const panel = { x: photosRight, y: 0, width: width - photosRight, height }
  const ruler = { x: Math.round(panel.x + (panel.width - dpi) / 2), y: Math.round(height / 2), length: dpi }

  return { width, height, dpi, size, left, gap, photos, panel, ruler }
}

export function drawSheet(ctx, layout, photo) {
  const { width, height, dpi, size, left, gap, photos, panel, ruler } = layout
  ctx.save()
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, width, height)
  ctx.imageSmoothingQuality = 'high'
  for (const p of photos) ctx.drawImage(photo, p.x, p.y, p.size, p.size)

  const mark = Math.max(2, Math.round(dpi / 150))
  ctx.fillStyle = '#9a9a9a'
  const columns = [left, left + size, left + size + gap, left + 2 * size + gap]
  columns.forEach((x, i) => {
    const outside = i % 2 === 0 ? x - mark : x
    ctx.fillRect(outside, 0, mark, height)
  })

  const tick = Math.round(dpi * 0.12)
  const pad = Math.round(dpi * 0.02)
  ctx.fillRect(Math.max(0, left - pad - tick), size - mark / 2, tick, mark)
  ctx.fillRect(left + size + pad, size - mark / 2, gap - 2 * pad, mark)
  ctx.fillRect(panel.x + pad, size - mark / 2, tick, mark)

  const rulerHeight = Math.round(dpi * 0.1)
  ctx.fillStyle = '#000000'
  ctx.fillRect(ruler.x, ruler.y - mark / 2, ruler.length, mark)
  for (let i = 0; i <= 8; i++) {
    const x = Math.round(ruler.x + (ruler.length * i) / 8) - (i === 8 ? mark : 0)
    const h = i % 8 === 0 ? rulerHeight : i % 4 === 0 ? rulerHeight * 0.7 : rulerHeight * 0.4
    ctx.fillRect(x, ruler.y - h, mark, h)
  }

  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  ctx.font = `${Math.round(dpi * 0.09)}px sans-serif`
  const center = ruler.x + ruler.length / 2
  ctx.fillText('1 in (25.4 mm)', center, ruler.y + Math.round(dpi * 0.06))
  ctx.font = `${Math.round(dpi * 0.08)}px sans-serif`
  ctx.fillStyle = '#555555'
  ctx.textBaseline = 'bottom'
  ctx.fillText('2 x 2 in', center, ruler.y - rulerHeight - Math.round(dpi * 0.12))
  ctx.restore()
}
