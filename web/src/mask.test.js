import { describe, expect, it } from 'vitest'
import { alphaFromConfidence, coverageIn, findHeadTop, keepConnected, resizeMask } from './mask.js'

function grid(width, height, fill) {
  const out = new Uint8ClampedArray(width * height)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) out[y * width + x] = fill(x, y) ? 255 : 0
  }
  return out
}

describe('alphaFromConfidence', () => {
  it('maps background confidence to opaque or clear with a soft middle', () => {
    const alpha = alphaFromConfidence(Float32Array.from([1, 0, 0.5, 0.9, 0.1]))
    expect(Array.from(alpha)).toEqual([0, 255, 128, 0, 255])
  })
})

describe('keepConnected', () => {
  const width = 20
  const height = 10
  const twoPeople = grid(width, height, (x) => (x >= 2 && x <= 6) || (x >= 12 && x <= 16))

  it('removes a person who does not touch the selected one', () => {
    const kept = keepConnected(twoPeople, width, height, 4, 5, { feather: 0 })
    expect(kept[5 * width + 4]).toBe(255)
    expect(kept[5 * width + 14]).toBe(0)
  })

  it('keeps a soft edge next to the selected person', () => {
    const soft = Uint8ClampedArray.from(twoPeople)
    soft[5 * width + 7] = 60
    soft[5 * width + 11] = 60
    const kept = keepConnected(soft, width, height, 4, 5, { feather: 1 })
    expect(kept[5 * width + 7]).toBe(60)
    expect(kept[5 * width + 11]).toBe(0)
  })

  it('returns the mask unchanged when the seed is on background', () => {
    const kept = keepConnected(twoPeople, width, height, 9, 5)
    expect(Array.from(kept)).toEqual(Array.from(twoPeople))
  })
})

describe('findHeadTop', () => {
  const width = 30
  const height = 30
  const head = grid(width, height, (x, y) => y >= 8 && Math.abs(x - 15) <= 6 + (y - 8))

  it('finds the first row with enough person pixels across the face', () => {
    expect(findHeadTop(head, width, height, 8, 22)).toBe(8)
  })

  it('ignores a single stray hair above the head', () => {
    const stray = Uint8ClampedArray.from(head)
    stray[3 * width + 15] = 255
    expect(findHeadTop(stray, width, height, 5, 25, { minFraction: 0.1 })).toBe(8)
  })

  it('returns -1 when nothing is found', () => {
    expect(findHeadTop(new Uint8ClampedArray(width * height), width, height, 0, width)).toBe(-1)
  })

  it('returns 0 when the head touches the top edge', () => {
    const cut = grid(width, height, (x) => x >= 10 && x <= 20)
    expect(findHeadTop(cut, width, height, 8, 22)).toBe(0)
  })
})

describe('resizeMask', () => {
  it('returns a copy when sizes match', () => {
    const src = Float32Array.from([0, 1, 1, 0])
    const out = resizeMask(src, 2, 2, 2, 2)
    expect(Array.from(out)).toEqual([0, 1, 1, 0])
    expect(out).not.toBe(src)
  })

  it('interpolates between values when upscaling', () => {
    const out = resizeMask(Float32Array.from([0, 1]), 2, 1, 4, 1)
    expect(out[0]).toBeCloseTo(0)
    expect(out[1]).toBeCloseTo(0.25)
    expect(out[2]).toBeCloseTo(0.75)
    expect(out[3]).toBeCloseTo(1)
  })
})

describe('coverageIn', () => {
  const width = 10
  const height = 10
  const band = { x0: 2, x1: 8, y0: 0, y1: 4 }
  const filled = (value, rows = [0, 4]) => {
    const out = new Float32Array(width * height)
    for (let y = rows[0]; y < rows[1]; y++) out.fill(value, y * width, (y + 1) * width)
    return out
  }

  it('is high when a hat class covers the band above the forehead', () => {
    const others = filled(0.9)
    const clothes = filled(0.05)
    expect(coverageIn([clothes, others], width, height, band)).toBeCloseTo(0.95)
  })

  it('is low when the band is hair', () => {
    const empty = new Float32Array(width * height)
    expect(coverageIn([empty, empty], width, height, band)).toBe(0)
  })

  it('caps each pixel at 1 when classes overlap', () => {
    expect(coverageIn([filled(0.8), filled(0.8)], width, height, band)).toBeCloseTo(1)
  })

  it('clamps a band that reaches above the image and ignores rows outside it', () => {
    const others = filled(1, [0, 2])
    expect(coverageIn([others], width, height, { x0: 2, x1: 8, y0: -5, y1: 4 })).toBeCloseTo(0.5)
  })

  it('returns 0 for an empty band', () => {
    expect(coverageIn([filled(1)], width, height, { x0: 2, x1: 8, y0: -6, y1: -1 })).toBe(0)
  })
})
