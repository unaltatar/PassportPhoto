export function luminance(rgba) {
  const out = new Float32Array(rgba.length / 4)
  for (let i = 0, j = 0; j < out.length; i += 4, j++) {
    out[j] = 0.299 * rgba[i] + 0.587 * rgba[i + 1] + 0.114 * rgba[i + 2]
  }
  return out
}

function boxBlur(src, width, height, radius) {
  const tmp = new Float32Array(src.length)
  const out = new Float32Array(src.length)
  for (let y = 0; y < height; y++) {
    const row = y * width
    let sum = 0
    let count = 0
    for (let x = 0; x <= Math.min(radius, width - 1); x++) {
      sum += src[row + x]
      count++
    }
    for (let x = 0; x < width; x++) {
      tmp[row + x] = sum / count
      const add = x + radius + 1
      const drop = x - radius
      if (add < width) {
        sum += src[row + add]
        count++
      }
      if (drop >= 0) {
        sum -= src[row + drop]
        count--
      }
    }
  }
  for (let x = 0; x < width; x++) {
    let sum = 0
    let count = 0
    for (let y = 0; y <= Math.min(radius, height - 1); y++) {
      sum += tmp[y * width + x]
      count++
    }
    for (let y = 0; y < height; y++) {
      out[y * width + x] = sum / count
      const add = y + radius + 1
      const drop = y - radius
      if (add < height) {
        sum += tmp[add * width + x]
        count++
      }
      if (drop >= 0) {
        sum -= tmp[drop * width + x]
        count--
      }
    }
  }
  return out
}

export function weightedBlur(values, weights, width, height, radius, passes = 3) {
  let num = new Float32Array(values.length)
  let den = Float32Array.from(weights)
  for (let i = 0; i < values.length; i++) num[i] = values[i] * weights[i]
  for (let p = 0; p < passes; p++) {
    num = boxBlur(num, width, height, radius)
    den = boxBlur(den, width, height, radius)
  }
  const out = new Float32Array(values.length)
  for (let i = 0; i < values.length; i++) out[i] = den[i] > 1e-4 ? num[i] / den[i] : values[i]
  return out
}

export function weightedPercentile(values, weights, p, minWeight = 0.5) {
  const picked = []
  for (let i = 0; i < values.length; i++) if (weights[i] >= minWeight) picked.push(values[i])
  if (!picked.length) return NaN
  picked.sort((a, b) => a - b)
  return picked[Math.min(picked.length - 1, Math.floor(p * picked.length))]
}

export function liftShadows(rgba, skin, illumination, target, strength, maxGain = 1.6) {
  const out = Uint8ClampedArray.from(rgba)
  if (!(strength > 0) || !(target > 0)) return out
  for (let j = 0, i = 0; j < skin.length; j++, i += 4) {
    const w = skin[j]
    const light = illumination[j]
    if (w <= 0 || light >= target) continue
    const gain = Math.min(maxGain, target / Math.max(light, 1))
    const g = 1 + (gain - 1) * strength * Math.min(1, w)
    out[i] = rgba[i] * g
    out[i + 1] = rgba[i + 1] * g
    out[i + 2] = rgba[i + 2] * g
  }
  return out
}

export function shadowImbalance(lum, weights, width, height, splitX, minWeight = 0.5) {
  let leftSum = 0
  let leftCount = 0
  let rightSum = 0
  let rightCount = 0
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x
      if (weights[i] < minWeight) continue
      if (x < splitX) {
        leftSum += lum[i]
        leftCount++
      } else {
        rightSum += lum[i]
        rightCount++
      }
    }
  }
  if (!leftCount || !rightCount) return 0
  const left = leftSum / leftCount
  const right = rightSum / rightCount
  const brighter = Math.max(left, right)
  return brighter > 0 ? Math.abs(left - right) / brighter : 0
}
