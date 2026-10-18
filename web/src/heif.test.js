import { describe, expect, it } from 'vitest'
import { isHeifBrand } from './heif.js'

const header = (brand) => Uint8Array.from([0, 0, 0, 0x18, ...'ftyp'.split('').map((c) => c.charCodeAt(0)), ...brand.split('').map((c) => c.charCodeAt(0))])

describe('isHeifBrand', () => {
  it('recognizes iPhone HEIC and generic HEIF files', () => {
    for (const brand of ['heic', 'heix', 'hevc', 'hevx', 'mif1', 'msf1']) expect(isHeifBrand(header(brand))).toBe(true)
  })

  it('leaves AVIF to the browser, which can open it', () => {
    expect(isHeifBrand(header('avif'))).toBe(false)
  })

  it('rejects other files and short input', () => {
    expect(isHeifBrand(Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0x49, 0x46, 0, 1]))).toBe(false)
    expect(isHeifBrand(Uint8Array.from([0, 0, 0, 0x18, 0x66, 0x74]))).toBe(false)
  })
})
