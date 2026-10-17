import {
  PHOTO_IN,
  HEAD_MIN_IN,
  HEAD_MAX_IN,
  HEAD_TARGET_IN,
  EYE_MIN_IN,
  EYE_MAX_IN,
  EYE_TARGET_IN,
  TOP_MARGIN_MIN_IN,
} from './spec.js'

const DEG = 180 / Math.PI

export function boundingBox(points) {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const p of points) {
    if (p.x < minX) minX = p.x
    if (p.y < minY) minY = p.y
    if (p.x > maxX) maxX = p.x
    if (p.y > maxY) maxY = p.y
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
}

export function pickMainFace(boxes, width, height) {
  if (!boxes.length) return -1
  const largest = Math.max(...boxes.map((b) => b.width * b.height))
  let best = -1
  let bestDistance = Infinity
  boxes.forEach((b, i) => {
    if (b.width * b.height < largest / 1.1) return
    const dx = b.x + b.width / 2 - width / 2
    const dy = b.y + b.height / 2 - height / 2
    const distance = Math.hypot(dx, dy)
    if (distance < bestDistance) {
      best = i
      bestDistance = distance
    }
  })
  return best
}

export function rollAngle(a, b) {
  const [left, right] = a.x <= b.x ? [a, b] : [b, a]
  return Math.atan2(right.y - left.y, right.x - left.x)
}

export function eulerFromMatrix(data) {
  const r00 = data[0]
  const r10 = data[1]
  const r20 = data[2]
  const r21 = data[6]
  const r22 = data[10]
  return {
    pitch: Math.atan2(r21, r22) * DEG,
    yaw: Math.atan2(-r20, Math.hypot(r21, r22)) * DEG,
    roll: Math.atan2(r10, r00) * DEG,
  }
}

export function rotatePoint(p, center, angle) {
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)
  const dx = p.x - center.x
  const dy = p.y - center.y
  return { x: center.x + dx * cos - dy * sin, y: center.y + dx * sin + dy * cos }
}

export function computeCrop({ eyeY, centerX, headTopY, chinY }) {
  const headPx = chinY - headTopY
  const eyeToTopPx = eyeY - headTopY
  if (!(headPx > 0) || !(eyeToTopPx > 0) || !(chinY > eyeY)) return null

  const eyeTopMax = PHOTO_IN - EYE_MIN_IN
  let eyeTop = PHOTO_IN - EYE_TARGET_IN
  let s = HEAD_TARGET_IN / headPx

  if (eyeTop - eyeToTopPx * s < TOP_MARGIN_MIN_IN) {
    eyeTop = Math.min(eyeTopMax, TOP_MARGIN_MIN_IN + eyeToTopPx * s)
    if (eyeTop - eyeToTopPx * s < TOP_MARGIN_MIN_IN) {
      s = (eyeTop - TOP_MARGIN_MIN_IN) / eyeToTopPx
    }
  }

  if (s * headPx < HEAD_MIN_IN - 1e-9) return null
  if (eyeTop + (chinY - eyeY) * s > PHOTO_IN) return null

  return { s, tx: PHOTO_IN / 2 - centerX * s, ty: eyeTop - eyeY * s }
}

export function applyAdjustments(frame, face, { headIn, dx = 0, dy = 0 }) {
  const headPx = face.chinY - face.headTopY
  const target = Math.min(HEAD_MAX_IN, Math.max(HEAD_MIN_IN, headIn ?? frame.s * headPx))
  const s = target / headPx
  const ex = face.centerX * frame.s + frame.tx
  const ey = face.eyeY * frame.s + frame.ty
  return { s, tx: ex - face.centerX * s + dx, ty: ey - face.eyeY * s + dy }
}

export function measure(frame, face) {
  const toY = (y) => y * frame.s + frame.ty
  return {
    headIn: (face.chinY - face.headTopY) * frame.s,
    headTopIn: toY(face.headTopY),
    chinIn: toY(face.chinY),
    eyeFromBottomIn: PHOTO_IN - toY(face.eyeY),
    centerOffsetIn: face.centerX * frame.s + frame.tx - PHOTO_IN / 2,
  }
}

export function frameSourceRect(frame) {
  const size = PHOTO_IN / frame.s
  return { x: -frame.tx / frame.s, y: -frame.ty / frame.s, width: size, height: size }
}

export function bottomMissingIn(frame, imageHeight) {
  const bottom = (PHOTO_IN - frame.ty) / frame.s
  return Math.max(0, bottom - imageHeight) * frame.s
}

export function rectsIntersect(a, b) {
  return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height
}
