const HEIF_BRANDS = new Set(['heic', 'heix', 'hevc', 'hevx', 'mif1', 'msf1'])

export function isHeifBrand(bytes) {
  if (bytes.length < 12) return false
  const text = (from, to) => String.fromCharCode(...bytes.subarray(from, to))
  return text(4, 8) === 'ftyp' && HEIF_BRANDS.has(text(8, 12))
}
