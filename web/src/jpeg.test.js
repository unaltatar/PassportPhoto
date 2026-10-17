import { describe, expect, it } from 'vitest'
import { readJpegDpi, setJpegDpi } from './jpeg.js'

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
