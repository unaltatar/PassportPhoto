import { describe, expect, it } from 'vitest'
import {
  applyAdjustments,
  bottomMissingIn,
  boundingBox,
  clampRect,
  computeCrop,
  eulerFromMatrix,
  expandFaceBox,
  frameSourceRect,
  iou,
  measure,
  mergeDetections,
  pickMainFace,
  rectsIntersect,
  rollAngle,
  rotatePoint,
  tileOrigins,
} from './geometry.js'
import { HEAD_MAX_IN, HEAD_MIN_IN, HEAD_TARGET_IN, EYE_MIN_IN, EYE_MAX_IN, TOP_MARGIN_MIN_IN } from './spec.js'

const face = { eyeY: 500, centerX: 400, headTopY: 300, chinY: 720 }

function columnMajor(r) {
  return [r[0][0], r[1][0], r[2][0], 0, r[0][1], r[1][1], r[2][1], 0, r[0][2], r[1][2], r[2][2], 0, 0, 0, 0, 1]
}

function rotY(deg) {
  const a = (deg * Math.PI) / 180
  return [
    [Math.cos(a), 0, Math.sin(a)],
    [0, 1, 0],
    [-Math.sin(a), 0, Math.cos(a)],
  ]
}

function rotX(deg) {
  const a = (deg * Math.PI) / 180
  return [
    [1, 0, 0],
    [0, Math.cos(a), -Math.sin(a)],
    [0, Math.sin(a), Math.cos(a)],
  ]
}

describe('boundingBox', () => {
  it('spans all points', () => {
    expect(boundingBox([{ x: 3, y: 4 }, { x: 10, y: 1 }, { x: 5, y: 9 }])).toEqual({ x: 3, y: 1, width: 7, height: 8 })
  })
})

describe('pickMainFace', () => {
  it('returns -1 with no faces', () => {
    expect(pickMainFace([], 100, 100)).toBe(-1)
  })

  it('picks the largest face', () => {
    const boxes = [
      { x: 0, y: 0, width: 50, height: 50 },
      { x: 300, y: 300, width: 120, height: 120 },
      { x: 500, y: 0, width: 80, height: 80 },
    ]
    expect(pickMainFace(boxes, 1000, 1000)).toBe(1)
  })

  it('breaks near ties by distance to the centre', () => {
    const boxes = [
      { x: 0, y: 0, width: 100, height: 100 },
      { x: 450, y: 450, width: 98, height: 98 },
    ]
    expect(pickMainFace(boxes, 1000, 1000)).toBe(1)
  })
})

describe('rollAngle', () => {
  it('is zero for level eyes in either order', () => {
    expect(rollAngle({ x: 10, y: 50 }, { x: 90, y: 50 })).toBe(0)
    expect(rollAngle({ x: 90, y: 50 }, { x: 10, y: 50 })).toBe(0)
  })

  it('is positive when the right eye is lower', () => {
    expect(rollAngle({ x: 0, y: 0 }, { x: 100, y: 100 })).toBeCloseTo(Math.PI / 4)
  })
})

describe('rotatePoint', () => {
  it('levels the eyes when rotating by minus the roll', () => {
    const a = { x: 100, y: 100 }
    const b = { x: 200, y: 120 }
    const center = { x: 150, y: 110 }
    const angle = -rollAngle(a, b)
    const ra = rotatePoint(a, center, angle)
    const rb = rotatePoint(b, center, angle)
    expect(ra.y).toBeCloseTo(rb.y)
  })
})

describe('eulerFromMatrix', () => {
  it('reads zero angles from the identity', () => {
    const e = eulerFromMatrix(columnMajor(rotY(0)))
    expect(Math.abs(e.yaw)).toBeCloseTo(0)
    expect(Math.abs(e.pitch)).toBeCloseTo(0)
    expect(Math.abs(e.roll)).toBeCloseTo(0)
  })

  it('reads a turned head as yaw', () => {
    const e = eulerFromMatrix(columnMajor(rotY(12)))
    expect(Math.abs(e.yaw)).toBeCloseTo(12)
    expect(Math.abs(e.pitch)).toBeCloseTo(0)
  })

  it('reads a nodding head as pitch', () => {
    const e = eulerFromMatrix(columnMajor(rotX(15)))
    expect(Math.abs(e.pitch)).toBeCloseTo(15)
    expect(Math.abs(e.yaw)).toBeCloseTo(0)
  })

  it('gives the same magnitude for a transposed matrix', () => {
    const r = rotY(9)
    const transposed = r[0].map((_, i) => r.map((row) => row[i]))
    expect(Math.abs(eulerFromMatrix(columnMajor(transposed)).yaw)).toBeCloseTo(9)
  })
})

describe('computeCrop', () => {
  it('sizes the head to the target and keeps it inside the spec', () => {
    const frame = computeCrop(face)
    const m = measure(frame, face)
    expect(m.headIn).toBeCloseTo(HEAD_TARGET_IN)
    expect(m.headIn).toBeGreaterThanOrEqual(HEAD_MIN_IN)
    expect(m.headIn).toBeLessThanOrEqual(HEAD_MAX_IN)
    expect(m.eyeFromBottomIn).toBeGreaterThanOrEqual(EYE_MIN_IN)
    expect(m.eyeFromBottomIn).toBeLessThanOrEqual(EYE_MAX_IN)
    expect(m.headTopIn).toBeGreaterThanOrEqual(TOP_MARGIN_MIN_IN)
    expect(m.centerOffsetIn).toBeCloseTo(0)
  })

  it('shifts the face down when hair is tall', () => {
    const tall = { eyeY: 500, centerX: 400, headTopY: 220, chinY: 720 }
    const frame = computeCrop(tall)
    const m = measure(frame, tall)
    expect(m.headTopIn).toBeGreaterThanOrEqual(TOP_MARGIN_MIN_IN - 1e-9)
    expect(m.headIn).toBeGreaterThanOrEqual(HEAD_MIN_IN)
    expect(m.eyeFromBottomIn).toBeLessThan(1.25)
  })

  it('shrinks the head when shifting is not enough', () => {
    const veryTall = { eyeY: 500, centerX: 400, headTopY: 50, chinY: 720 }
    const frame = computeCrop(veryTall)
    const m = measure(frame, veryTall)
    expect(m.headIn).toBeLessThan(HEAD_TARGET_IN)
    expect(m.headIn).toBeGreaterThanOrEqual(HEAD_MIN_IN)
    expect(m.headTopIn).toBeCloseTo(TOP_MARGIN_MIN_IN)
  })

  it('rejects a head that cannot fit', () => {
    expect(computeCrop({ eyeY: 500, centerX: 400, headTopY: 0, chinY: 560 })).toBeNull()
  })

  it('rejects broken measurements', () => {
    expect(computeCrop({ eyeY: 500, centerX: 400, headTopY: 600, chinY: 720 })).toBeNull()
    expect(computeCrop({ eyeY: 500, centerX: 400, headTopY: 300, chinY: 300 })).toBeNull()
  })
})

describe('applyAdjustments', () => {
  it('changes head size around the eyes', () => {
    const frame = computeCrop(face)
    const before = measure(frame, face)
    const after = measure(applyAdjustments(frame, face, { headIn: 1.3 }), face)
    expect(after.headIn).toBeCloseTo(1.3)
    expect(after.eyeFromBottomIn).toBeCloseTo(before.eyeFromBottomIn)
  })

  it('clamps head size to the spec', () => {
    const frame = computeCrop(face)
    expect(measure(applyAdjustments(frame, face, { headIn: 3 }), face).headIn).toBeCloseTo(HEAD_MAX_IN)
    expect(measure(applyAdjustments(frame, face, { headIn: 0.2 }), face).headIn).toBeCloseTo(HEAD_MIN_IN)
  })

  it('moves the face by the offsets in inches', () => {
    const frame = computeCrop(face)
    const before = measure(frame, face)
    const after = measure(applyAdjustments(frame, face, { dx: 0.1, dy: -0.05 }), face)
    expect(after.centerOffsetIn).toBeCloseTo(before.centerOffsetIn + 0.1)
    expect(after.headTopIn).toBeCloseTo(before.headTopIn - 0.05)
  })
})

describe('frame helpers', () => {
  it('maps the photo back to a square source rectangle', () => {
    const frame = computeCrop(face)
    const rect = frameSourceRect(frame)
    expect(rect.width).toBeCloseTo(rect.height)
    expect(rect.x * frame.s + frame.tx).toBeCloseTo(0)
    expect((rect.y + rect.height) * frame.s + frame.ty).toBeCloseTo(2)
  })

  it('measures how much is missing below the image', () => {
    const frame = computeCrop(face)
    const bottom = frameSourceRect(frame)
    const imageBottom = bottom.y + bottom.height
    expect(bottomMissingIn(frame, imageBottom + 10)).toBe(0)
    expect(bottomMissingIn(frame, imageBottom - 100)).toBeCloseTo(100 * frame.s)
  })

  it('detects rectangle overlap', () => {
    const a = { x: 0, y: 0, width: 10, height: 10 }
    expect(rectsIntersect(a, { x: 5, y: 5, width: 10, height: 10 })).toBe(true)
    expect(rectsIntersect(a, { x: 10, y: 0, width: 5, height: 5 })).toBe(false)
  })
})

describe('clampRect and expandFaceBox', () => {
  it('clamps a rectangle to the image', () => {
    expect(clampRect(-10.5, 5.2, 50.1, 300, 40, 100)).toEqual({ x: 0, y: 5, width: 40, height: 95 })
  })

  it('leaves room for the head, shoulders and frame around a face', () => {
    const box = { x: 900, y: 800, width: 180, height: 200 }
    const rect = expandFaceBox(box, 4000, 4000)
    expect(rect.x).toBeLessThanOrEqual(990 - 2 * 200)
    expect(rect.x + rect.width).toBeGreaterThanOrEqual(990 + 2 * 200)
    expect(rect.y).toBeLessThanOrEqual(800 - 1.5 * 200)
    expect(rect.y + rect.height).toBeGreaterThanOrEqual(1000 + 1.8 * 200)
  })

  it('stays inside the image near an edge', () => {
    const rect = expandFaceBox({ x: 10, y: 10, width: 100, height: 120 }, 500, 400)
    expect(rect.x).toBe(0)
    expect(rect.y).toBe(0)
    expect(rect.x + rect.width).toBeLessThanOrEqual(500)
    expect(rect.y + rect.height).toBeLessThanOrEqual(400)
  })
})

describe('iou and mergeDetections', () => {
  const a = { x: 0, y: 0, width: 10, height: 10 }

  it('measures overlap', () => {
    expect(iou(a, a)).toBe(1)
    expect(iou(a, { x: 20, y: 0, width: 10, height: 10 })).toBe(0)
    expect(iou(a, { x: 5, y: 0, width: 10, height: 10 })).toBeCloseTo(50 / 150)
  })

  it('keeps the best scored copy of the same face', () => {
    const items = [
      { box: a, score: 2, id: 'edge' },
      { box: { x: 1, y: 1, width: 10, height: 10 }, score: 9, id: 'centred' },
      { box: { x: 50, y: 50, width: 10, height: 10 }, score: 1, id: 'other' },
    ]
    expect(mergeDetections(items).map((i) => i.id)).toEqual(['centred', 'other'])
  })
})

describe('tileOrigins', () => {
  it('spreads tiles from edge to edge', () => {
    expect(tileOrigins(1000, 500, 3)).toEqual([0, 250, 500])
  })

  it('uses one tile when it already covers the image', () => {
    expect(tileOrigins(1000, 1000, 3)).toEqual([0])
    expect(tileOrigins(1000, 400, 1)).toEqual([0])
  })
})
