import { describe, expect, it } from 'vitest'
import { liftShadows, luminance, shadowImbalance, weightedBlur, weightedPercentile } from './tone.js'

const width = 20
const height = 10

function halfLitFace() {
  const rgba = new Uint8ClampedArray(width * height * 4)
  const skin = new Float32Array(width * height)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const j = y * width + x
      const isSkin = x >= 2 && x < 18
      const level = isSkin ? (x < 10 ? 100 : 200) : 50
      rgba.set([level, level * 0.8, level * 0.6, 255], j * 4)
      skin[j] = isSkin ? 1 : 0
    }
  }
  return { rgba, skin }
}

describe('luminance', () => {
  it('weights green the most', () => {
    const lum = luminance(Uint8ClampedArray.from([255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255]))
    expect(lum[1]).toBeGreaterThan(lum[0])
    expect(lum[0]).toBeGreaterThan(lum[2])
  })
})

describe('weightedBlur', () => {
  it('keeps a constant field constant', () => {
    const values = new Float32Array(width * height).fill(80)
    const weights = new Float32Array(width * height).fill(1)
    const out = weightedBlur(values, weights, width, height, 3)
    expect(out.every((v) => Math.abs(v - 80) < 1e-3)).toBe(true)
  })

  it('ignores values with zero weight', () => {
    const values = new Float32Array(width * height).fill(100)
    const weights = new Float32Array(width * height).fill(1)
    for (let i = 0; i < values.length; i += 2) {
      values[i] = 0
      weights[i] = 0
    }
    const out = weightedBlur(values, weights, width, height, 2)
    expect(out[width * 5 + 7]).toBeCloseTo(100)
  })
})

describe('weightedPercentile', () => {
  it('reads a percentile from the weighted pixels only', () => {
    const values = Float32Array.from([10, 20, 30, 40, 1000])
    const weights = Float32Array.from([1, 1, 1, 1, 0])
    expect(weightedPercentile(values, weights, 0.5)).toBe(30)
    expect(weightedPercentile(values, weights, 0.99)).toBe(40)
  })
})

describe('liftShadows', () => {
  it('brightens the dark half of the face and leaves the rest alone', () => {
    const { rgba, skin } = halfLitFace()
    const lum = luminance(rgba)
    const out = liftShadows(rgba, skin, lum, 160, 1)
    const at = (x, y) => (y * width + x) * 4
    expect(out[at(5, 5)]).toBeGreaterThan(rgba[at(5, 5)])
    expect(out[at(15, 5)]).toBe(rgba[at(15, 5)])
    expect(out[at(0, 5)]).toBe(rgba[at(0, 5)])
    expect(out[at(5, 5) + 3]).toBe(255)
  })

  it('never darkens and caps the gain', () => {
    const { rgba, skin } = halfLitFace()
    const lum = luminance(rgba)
    const out = liftShadows(rgba, skin, lum, 1000, 1, 1.6)
    for (let i = 0; i < rgba.length; i++) expect(out[i]).toBeGreaterThanOrEqual(rgba[i])
    expect(out[(5 * width + 5) * 4]).toBe(160)
  })

  it('does nothing at zero strength', () => {
    const { rgba, skin } = halfLitFace()
    const out = liftShadows(rgba, skin, luminance(rgba), 170, 0)
    expect(Array.from(out)).toEqual(Array.from(rgba))
  })
})

describe('shadowImbalance', () => {
  it('is large for a half lit face and zero for an even one', () => {
    const { rgba, skin } = halfLitFace()
    expect(shadowImbalance(luminance(rgba), skin, width, height, 10)).toBeCloseTo(0.5)
    const even = new Float32Array(width * height).fill(120)
    expect(shadowImbalance(even, skin, width, height, 10)).toBe(0)
  })
})
