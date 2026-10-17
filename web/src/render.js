import { EYE_MAX_IN, EYE_MIN_IN, HEAD_MAX_IN, HEAD_MIN_IN, PHOTO_IN } from './spec.js'

export function createCanvas(width, height) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  return canvas
}

export function renderPassport(scene, frame, sizePx, replaceBackground, subject) {
  const canvas = createCanvas(sizePx, sizePx)
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, sizePx, sizePx)
  const ppi = sizePx / PHOTO_IN
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.setTransform(ppi * frame.s, 0, 0, ppi * frame.s, ppi * frame.tx, ppi * frame.ty)
  if (!replaceBackground) ctx.drawImage(scene.work, 0, 0)
  ctx.drawImage(subject, scene.region.x, scene.region.y)
  return canvas
}

export function drawGuides(ctx, sizePx, m) {
  const ppi = sizePx / PHOTO_IN
  const y = (inches) => inches * ppi
  ctx.save()

  ctx.fillStyle = 'rgba(30, 110, 230, 0.12)'
  ctx.fillRect(0, y(PHOTO_IN - EYE_MAX_IN), sizePx, y(EYE_MAX_IN - EYE_MIN_IN))

  ctx.setLineDash([6, 6])
  ctx.strokeStyle = 'rgba(30, 110, 230, 0.6)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(sizePx / 2, 0)
  ctx.lineTo(sizePx / 2, sizePx)
  ctx.stroke()
  ctx.setLineDash([])

  const ok = m.headIn >= HEAD_MIN_IN - 1e-6 && m.headIn <= HEAD_MAX_IN + 1e-6
  const color = ok ? '#1a8f3c' : '#c62828'
  ctx.strokeStyle = color
  ctx.lineWidth = 2
  for (const line of [m.headTopIn, m.chinIn]) {
    ctx.beginPath()
    ctx.moveTo(sizePx * 0.2, y(line))
    ctx.lineTo(sizePx * 0.8, y(line))
    ctx.stroke()
  }

  const bx = sizePx * 0.86
  ctx.beginPath()
  ctx.moveTo(bx, y(m.headTopIn))
  ctx.lineTo(bx, y(m.chinIn))
  ctx.stroke()

  ctx.fillStyle = color
  ctx.font = `${Math.round(sizePx * 0.035)}px sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  const label = `${m.headIn.toFixed(2)} in`
  const ly = y((m.headTopIn + m.chinIn) / 2)
  const lw = ctx.measureText(label).width + 8
  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)'
  ctx.fillRect(bx - lw / 2, ly - sizePx * 0.025, lw, sizePx * 0.05)
  ctx.fillStyle = color
  ctx.fillText(label, bx, ly)
  ctx.restore()
}
