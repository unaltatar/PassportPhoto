export function alphaFromConfidence(background, lo = 0.25, hi = 0.75) {
  const out = new Uint8ClampedArray(background.length)
  for (let i = 0; i < background.length; i++) {
    const t = Math.min(1, Math.max(0, (1 - background[i] - lo) / (hi - lo)))
    out[i] = Math.round(t * t * (3 - 2 * t) * 255)
  }
  return out
}

export function keepConnected(alpha, width, height, seedX, seedY, { threshold = 128, feather = 3 } = {}) {
  const sx = Math.round(seedX)
  const sy = Math.round(seedY)
  if (sx < 0 || sy < 0 || sx >= width || sy >= height || alpha[sy * width + sx] < threshold) {
    return Uint8ClampedArray.from(alpha)
  }

  const n = width * height
  const mark = new Uint8Array(n)
  const stack = new Int32Array(n)
  let top = 0
  const push = (j) => {
    if (!mark[j] && alpha[j] >= threshold) {
      mark[j] = 1
      stack[top++] = j
    }
  }
  push(sy * width + sx)
  while (top > 0) {
    const i = stack[--top]
    const x = i % width
    if (x > 0) push(i - 1)
    if (x < width - 1) push(i + 1)
    if (i >= width) push(i - width)
    if (i + width < n) push(i + width)
  }

  for (let pass = 0; pass < feather; pass++) {
    const grown = mark.slice()
    for (let i = 0; i < mark.length; i++) {
      if (mark[i]) continue
      const x = i % width
      if ((x > 0 && mark[i - 1]) || (x < width - 1 && mark[i + 1]) || (i >= width && mark[i - width]) || (i + width < mark.length && mark[i + width])) {
        grown[i] = 1
      }
    }
    mark.set(grown)
  }

  const out = new Uint8ClampedArray(alpha.length)
  for (let i = 0; i < alpha.length; i++) out[i] = mark[i] ? alpha[i] : 0
  return out
}

export function findHeadTop(alpha, width, height, x0, x1, { threshold = 128, minFraction = 0.1 } = {}) {
  const a = Math.max(0, Math.floor(x0))
  const b = Math.min(width, Math.ceil(x1))
  if (b <= a) return -1
  const need = Math.max(1, Math.ceil((b - a) * minFraction))
  for (let y = 0; y < height; y++) {
    let count = 0
    for (let x = a; x < b; x++) {
      if (alpha[y * width + x] >= threshold) count++
    }
    if (count >= need) return y
  }
  return -1
}

export function resizeMask(src, sw, sh, dw, dh) {
  if (sw === dw && sh === dh) return Float32Array.from(src)
  const out = new Float32Array(dw * dh)
  for (let y = 0; y < dh; y++) {
    const fy = Math.min(sh - 1, Math.max(0, ((y + 0.5) * sh) / dh - 0.5))
    const y0 = Math.floor(fy)
    const y1 = Math.min(sh - 1, y0 + 1)
    const wy = fy - y0
    for (let x = 0; x < dw; x++) {
      const fx = Math.min(sw - 1, Math.max(0, ((x + 0.5) * sw) / dw - 0.5))
      const x0 = Math.floor(fx)
      const x1 = Math.min(sw - 1, x0 + 1)
      const wx = fx - x0
      const top = src[y0 * sw + x0] * (1 - wx) + src[y0 * sw + x1] * wx
      const bottom = src[y1 * sw + x0] * (1 - wx) + src[y1 * sw + x1] * wx
      out[y * dw + x] = top * (1 - wy) + bottom * wy
    }
  }
  return out
}

export function coverageIn(masks, width, height, { x0, x1, y0, y1 }) {
  const a = Math.max(0, Math.floor(x0))
  const b = Math.min(width, Math.ceil(x1))
  const top = Math.max(0, Math.floor(y0))
  const bottom = Math.min(height, Math.ceil(y1))
  if (b <= a || bottom <= top) return 0
  let sum = 0
  for (let y = top; y < bottom; y++) {
    for (let x = a; x < b; x++) {
      const i = y * width + x
      let v = 0
      for (const mask of masks) v += mask[i]
      sum += Math.min(1, v)
    }
  }
  return sum / ((b - a) * (bottom - top))
}
