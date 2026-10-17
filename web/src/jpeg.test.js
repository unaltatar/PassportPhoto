import { describe, expect, it } from 'vitest'
import { encodeWithinBytes, readJpegDpi, setJpegDpi } from './jpeg.js'

const jfifJpeg = Uint8Array.from([
  0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01, 0x00, 0x01,
  0x00, 0x00, 0xff, 0xdb, 0x00, 0x02, 0xff, 0xd9,
])

const bareJpeg = Uint8Array.from([0xff, 0xd8, 0xff, 0xdb, 0x00, 0x02, 0xff, 0xd9])

describe('setJpegDpi', () => {
  it('patches an existing JFIF header to 300 dpi', () => {
    const out = setJpegDpi(jfifJpeg, 300)
    expect(out.length).toBe(jfifJpeg.length)
    expect(out[13]).toBe(1)
    expect(Array.from(out.subarray(14, 18))).toEqual([0x01, 0x2c, 0x01, 0x2c])
    expect(readJpegDpi(out)).toEqual({ x: 300, y: 300 })
    expect(Array.from(out.subarray(18))).toEqual(Array.from(jfifJpeg.subarray(18)))
  })

  it('does not change the input', () => {
    setJpegDpi(jfifJpeg, 300)
    expect(jfifJpeg[13]).toBe(0)
  })

  it('inserts a JFIF header when there is none', () => {
    const out = setJpegDpi(bareJpeg, 300)
    expect(out.length).toBe(bareJpeg.length + 18)
    expect(readJpegDpi(out)).toEqual({ x: 300, y: 300 })
    expect(Array.from(out.subarray(20))).toEqual(Array.from(bareJpeg.subarray(2)))
  })

  it('rejects data that is not a JPEG', () => {
    expect(() => setJpegDpi(Uint8Array.from([0x89, 0x50]), 300)).toThrow()
  })
})

describe('readJpegDpi', () => {
  it('returns null when density units are not dots per inch', () => {
    expect(readJpegDpi(jfifJpeg)).toBeNull()
  })
})

describe('encodeWithinBytes', () => {
  const sizedEncoder = (bytesAtFull, calls = []) => async (quality) => {
    calls.push(quality)
    return new Uint8Array(Math.round(quality * bytesAtFull))
  }

  it('keeps the start quality when the file already fits', async () => {
    const calls = []
    const out = await encodeWithinBytes(sizedEncoder(200, calls), 240, { start: 0.92, min: 0.3 })
    expect(out.length).toBe(184)
    expect(calls).toEqual([0.92])
  })

  it('lowers the quality until the file fits, staying close to the limit', async () => {
    const out = await encodeWithinBytes(sizedEncoder(400000), 240000, { start: 0.92, min: 0.3 })
    expect(out.length).toBeLessThanOrEqual(240000)
    expect(out.length).toBeGreaterThan(230000)
  })

  it('never returns a file over the limit when size does not follow quality', async () => {
    const noisy = async (quality) => new Uint8Array(Math.round(quality * 1000 + (quality * 1e4 % 7) * 30))
    for (const limit of [400, 500, 600, 700]) {
      const out = await encodeWithinBytes(noisy, limit, { start: 0.92, min: 0.2 })
      expect(out.length).toBeLessThanOrEqual(limit)
    }
  })

  it('throws when even the lowest quality is too large', async () => {
    await expect(encodeWithinBytes(sizedEncoder(1000), 100, { start: 0.92, min: 0.3 })).rejects.toThrow()
  })
})
