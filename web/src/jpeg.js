const JFIF = [0x4a, 0x46, 0x49, 0x46, 0x00]

function hasJfifApp0(bytes) {
  if (bytes[2] !== 0xff || bytes[3] !== 0xe0) return false
  return JFIF.every((b, i) => bytes[6 + i] === b)
}

export function setJpegDpi(bytes, dpi) {
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) throw new Error('Not a JPEG file')
  const hi = (dpi >> 8) & 0xff
  const lo = dpi & 0xff

  if (hasJfifApp0(bytes)) {
    const out = Uint8Array.from(bytes)
    out[13] = 1
    out[14] = hi
    out[15] = lo
    out[16] = hi
    out[17] = lo
    return out
  }

  const app0 = [0xff, 0xe0, 0x00, 0x10, ...JFIF, 0x01, 0x01, 0x01, hi, lo, hi, lo, 0x00, 0x00]
  const out = new Uint8Array(bytes.length + app0.length)
  out.set(bytes.subarray(0, 2), 0)
  out.set(app0, 2)
  out.set(bytes.subarray(2), 2 + app0.length)
  return out
}

export function readJpegDpi(bytes) {
  if (!hasJfifApp0(bytes) || bytes[13] !== 1) return null
  return { x: (bytes[14] << 8) | bytes[15], y: (bytes[16] << 8) | bytes[17] }
}

export async function encodeWithinBytes(encode, maxBytes, { start, min, steps = 8 }) {
  const first = await encode(start)
  if (first.length <= maxBytes) return first

  let best = await encode(min)
  if (best.length > maxBytes) throw new Error(`JPEG is larger than ${maxBytes} bytes even at quality ${min}`)

  let lo = min
  let hi = start
  for (let i = 0; i < steps; i++) {
    const mid = (lo + hi) / 2
    const bytes = await encode(mid)
    if (bytes.length <= maxBytes) {
      best = bytes
      lo = mid
    } else {
      hi = mid
    }
  }
  return best
}
