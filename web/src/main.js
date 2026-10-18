import './style.css'
import { applyTranslations, getLanguage, setLanguage, t } from './i18n.js'
import { findFaces, loadModels, segmentRegion } from './vision.js'
import {
  applyAdjustments,
  bottomMissingIn,
  clampRect,
  computeCrop,
  expandFaceBox,
  frameSourceRect,
  measure,
  pickMainFace,
  rectsIntersect,
  rollAngle,
} from './geometry.js'
import { evaluatePhoto } from './quality.js'
import { alphaFromConfidence, coverageIn, findHeadTop, fractionAbove, keepConnected } from './mask.js'
import { liftShadows, luminance, shadowImbalance, weightedBlur, weightedPercentile } from './tone.js'
import { createCanvas, drawGuides, renderPassport } from './render.js'
import { drawSheet, layoutSheet } from './sheet.js'
import { setJpegDpi } from './jpeg.js'
import {
  DIGITAL,
  DPI,
  EYE_MAX_IN,
  EYE_MIN_IN,
  HEAD_MAX_IN,
  HEAD_MIN_IN,
  HEAD_TARGET_IN,
  LANDMARKS,
  LIMITS,
  PHOTO_IN,
  WORK_MAX_PX,
} from './spec.js'

const $ = (id) => document.getElementById(id)
const el = {
  file: $('file'),
  drop: $('drop'),
  status: $('status'),
  source: $('source'),
  facesInfo: $('faces-info'),
  overview: $('overview'),
  boxMode: $('box-mode'),
  boxHint: $('box-hint'),
  result: $('result'),
  resultGrid: document.querySelector('.result-grid'),
  verdict: $('verdict'),
  reasons: $('reasons'),
  preview: $('preview'),
  guides: $('guides'),
  summary: $('summary'),
  background: $('background'),
  shadow: $('shadow'),
  strength: $('strength'),
  headSize: $('head-size'),
  headValue: $('head-value'),
  reset: $('reset'),
  downloadNote: $('download-note'),
  sheetSection: $('sheet-section'),
  sheet: $('sheet'),
  downloadSheet: $('download-sheet'),
  downloadDigital: $('download-digital'),
}

const PREVIEW_PX = 600
const NUDGE_IN = 0.02
const MAX_OFFSET_IN = 0.25
const sheetLayout = layoutSheet(DPI)

const state = {
  source: null,
  sourceUrl: null,
  overview: null,
  faces: [],
  selected: -1,
  box: null,
  boxMode: false,
  drag: null,
  scene: null,
  adjust: { headIn: HEAD_TARGET_IN, dx: 0, dy: 0 },
  frame: null,
  photo: null,
  allowed: false,
  status: null,
  busy: false,
  modelsReady: false,
  renderQueued: false,
}

class StatusError extends Error {
  constructor(key, detail = '') {
    super(key)
    this.key = key
    this.detail = detail
  }
}

function describeError(error) {
  if (error instanceof Event) return `${error.type} event ${error.target?.src ?? ''}`.trim()
  const text = error instanceof Error ? `${error.name}: ${error.message}` : String(error)
  return text.slice(0, 300)
}

const nextFrame = () => new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0)))

function setStatus(key, isError = false, detail = '') {
  state.status = key ? { key, isError, detail } : null
  el.status.hidden = !key
  el.status.classList.toggle('error', isError)
  el.status.textContent = key ? t(key) + (detail ? ` ${t('errorDetail', { detail })}` : '') : ''
}

async function runTask(task) {
  if (state.busy) return
  state.busy = true
  document.body.classList.add('busy')
  setStatus('processing')
  await nextFrame()
  try {
    await task()
    setStatus(null)
  } catch (error) {
    console.error(error)
    if (error instanceof StatusError) setStatus(error.key, true, error.detail)
    else setStatus('processError', true, describeError(error))
  } finally {
    state.busy = false
    document.body.classList.remove('busy')
  }
}

async function ensureModels() {
  if (state.modelsReady) return
  if (typeof WebAssembly === 'undefined') throw new StatusError('noWasm')
  setStatus('loadingModels')
  await nextFrame()
  try {
    await loadModels()
    state.modelsReady = true
  } catch (error) {
    console.error(error)
    throw new StatusError('modelError', describeError(error))
  }
  setStatus('processing')
  await nextFrame()
}

async function decodeImage(file) {
  try {
    return await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.src = url
    try {
      await img.decode()
    } catch {
      URL.revokeObjectURL(url)
      throw new StatusError('decodeError')
    }
    state.sourceUrl = url
    return img
  }
}

function sizeOf(image) {
  return { width: image.naturalWidth || image.width, height: image.naturalHeight || image.height }
}

function toCanvas(image, rect, maxPx) {
  const scale = Math.min(1, maxPx / Math.max(rect.width, rect.height))
  const canvas = createCanvas(Math.max(1, Math.round(rect.width * scale)), Math.max(1, Math.round(rect.height * scale)))
  const ctx = canvas.getContext('2d')
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(image, rect.x, rect.y, rect.width, rect.height, 0, 0, canvas.width, canvas.height)
  return { canvas, scale }
}

function rotateCanvas(source, center, angle) {
  const canvas = createCanvas(source.width, source.height)
  const ctx = canvas.getContext('2d')
  ctx.imageSmoothingQuality = 'high'
  ctx.translate(center.x, center.y)
  ctx.rotate(angle)
  ctx.translate(-center.x, -center.y)
  ctx.drawImage(source, 0, 0)
  return canvas
}

function eyeMidpoint(face) {
  const a = face.points[LANDMARKS.irisA]
  const b = face.points[LANDMARKS.irisB]
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
}

function nearestFace(faces, point) {
  let best = -1
  let bestDistance = Infinity
  faces.forEach((face, i) => {
    const mid = eyeMidpoint(face)
    const distance = Math.hypot(mid.x - point.x, mid.y - point.y)
    if (distance < bestDistance) {
      best = i
      bestDistance = distance
    }
  })
  return best
}

async function handleFile(file) {
  if (!file) return
  await runTask(async () => {
    if (state.sourceUrl) URL.revokeObjectURL(state.sourceUrl)
    state.sourceUrl = null
    const image = await decodeImage(file)
    state.source = image
    state.overview = toCanvas(image, { x: 0, y: 0, ...sizeOf(image) }, WORK_MAX_PX)
    state.box = null
    setBoxMode(false)
    await ensureModels()
    const { canvas } = state.overview
    state.faces = await findFaces(canvas)
    state.selected = pickMainFace(
      state.faces.map((f) => f.box),
      canvas.width,
      canvas.height,
    )
    el.source.hidden = false
    drawOverview()
    renderFacesInfo()
    await processFace(state.selected)
    el.source.scrollIntoView({ behavior: 'smooth', block: 'start' })
  })
}

async function processFace(index) {
  if (index < 0) {
    showScene({ faceFound: false })
    return
  }
  const scale = state.overview.scale
  const face = state.faces[index]
  const box = { x: face.box.x / scale, y: face.box.y / scale, width: face.box.width / scale, height: face.box.height / scale }
  const { width, height } = sizeOf(state.source)
  const rect = expandFaceBox(box, width, height)
  const crop = toCanvas(state.source, rect, WORK_MAX_PX)
  const mid = eyeMidpoint(face)
  const expected = { x: (mid.x / scale - rect.x) * crop.scale, y: (mid.y / scale - rect.y) * crop.scale }
  const faces = await findFaces(crop.canvas)
  await buildScene(crop.canvas, faces, nearestFace(faces, expected))
}

async function selectFace(index) {
  await runTask(async () => {
    state.selected = index
    state.box = null
    drawOverview()
    await processFace(index)
  })
}

async function selectRegion(box) {
  await runTask(async () => {
    const scale = state.overview.scale
    const rect = { x: box.x / scale, y: box.y / scale, width: box.width / scale, height: box.height / scale }
    const { canvas } = toCanvas(state.source, rect, WORK_MAX_PX)
    const faces = await findFaces(canvas)
    setBoxMode(false)
    drawOverview()
    await buildScene(
      canvas,
      faces,
      pickMainFace(
        faces.map((f) => f.box),
        canvas.width,
        canvas.height,
      ),
    )
  })
}

async function buildScene(base, faces, index) {
  if (index < 0) {
    showScene({ faceFound: false })
    return
  }

  const face = faces[index]
  const roll = rollAngle(face.points[LANDMARKS.irisA], face.points[LANDMARKS.irisB])
  const rollDeg = (roll * 180) / Math.PI
  const eyeMid = eyeMidpoint(face)
  const level = Math.abs(rollDeg) <= LIMITS.rollDeg && Math.abs(roll) > 1e-3
  const work = level ? rotateCanvas(base, eyeMid, -roll) : base
  const workFaces = level ? await findFaces(work) : faces
  const wi = level ? nearestFace(workFaces, eyeMid) : index
  if (wi < 0) {
    showScene({ faceFound: false })
    return
  }

  const wf = workFaces[wi]
  const p = wf.points
  const chin = p[LANDMARKS.chin]
  const forehead = p[LANDMARKS.forehead]
  const left = p[LANDMARKS.faceLeft]
  const right = p[LANDMARKS.faceRight]
  const eyeY = eyeMidpoint(wf).y
  const centerX = (left.x + right.x) / 2
  const faceHeight = chin.y - forehead.y

  const region = clampRect(
    centerX - 1.6 * faceHeight,
    forehead.y - 1.2 * faceHeight,
    centerX + 1.6 * faceHeight,
    chin.y + 1.3 * faceHeight,
    work.width,
    work.height,
  )
  const { width: rw, height: rh } = region
  const regionCanvas = createCanvas(rw, rh)
  const rctx = regionCanvas.getContext('2d', { willReadFrequently: true })
  rctx.drawImage(work, region.x, region.y, rw, rh, 0, 0, rw, rh)

  const seg = await segmentRegion(regionCanvas)
  const alpha = keepConnected(alphaFromConfidence(seg.background), rw, rh, centerX - region.x, (eyeY + chin.y) / 2 - region.y)
  const topRow = findHeadTop(alpha, rw, rh, left.x - region.x, right.x - region.x)
  const headTopY = topRow >= 0 ? region.y + topRow : forehead.y
  const faceWidth = right.x - left.x
  const headCover = coverageIn([seg.clothes, seg.others], rw, rh, {
    x0: left.x + 0.2 * faceWidth - region.x,
    x1: right.x - 0.2 * faceWidth - region.x,
    y0: forehead.y - 0.45 * faceHeight - region.y,
    y1: forehead.y - 0.05 * faceHeight - region.y,
  })
  const irisA = p[LANDMARKS.irisA]
  const irisB = p[LANDMARKS.irisB]
  const eyeGap = Math.hypot(irisB.x - irisA.x, irisB.y - irisA.y)
  const bridgeX = (irisA.x + irisB.x) / 2
  const glasses = fractionAbove(
    [seg.others],
    rw,
    rh,
    {
      x0: bridgeX - 0.15 * eyeGap - region.x,
      x1: bridgeX + 0.15 * eyeGap - region.x,
      y0: eyeY - 0.25 * eyeGap - region.y,
      y1: eyeY + 0.05 * eyeGap - region.y,
    },
    0.5,
  )
  const headCut = (topRow === 0 && region.y === 0) || chin.y >= work.height - 1 || forehead.y <= 0
  const geometry = { eyeY, centerX, headTopY, chinY: chin.y }

  const pixels = rctx.getImageData(0, 0, rw, rh).data
  const lum = luminance(pixels)
  const skin = new Float32Array(rw * rh)
  for (let i = 0; i < skin.length; i++) skin[i] = Math.min(1, seg.faceSkin[i] + seg.bodySkin[i]) * (alpha[i] / 255)
  const illumination = weightedBlur(lum, skin, rw, rh, Math.max(2, Math.round(faceHeight / 10)))
  const imbalance = shadowImbalance(lum, seg.faceSkin, rw, rh, centerX - region.x, {
    x0: left.x - region.x,
    x1: right.x - region.x,
    y0: eyeY - region.y,
    y1: chin.y - region.y,
  })

  const edgeRows = (column, touches) => {
    const rows = new Uint8Array(rh)
    if (!touches) return rows
    for (let y = 0; y < rh; y++) rows[y] = alpha[y * rw + column] >= 128 ? 1 : 0
    return rows
  }

  const autoFrame = computeCrop(geometry)
  showScene({
    faceFound: true,
    work,
    region,
    pixels,
    alpha,
    skin,
    illumination,
    target: weightedPercentile(illumination, seg.faceSkin, 0.85),
    imbalance,
    leftEdge: edgeRows(0, region.x === 0),
    rightEdge: edgeRows(rw - 1, region.x + rw === work.width),
    geometry,
    headCut,
    headCover,
    glasses,
    headPx: chin.y - headTopY,
    pose: wf.pose,
    roll: rollDeg,
    blinkLeft: wf.blinkLeft,
    blinkRight: wf.blinkRight,
    others: workFaces.filter((_, i) => i !== wi).map((f) => f.box),
    autoFrame,
    subjects: new Map(),
  })
}

function autoHeadIn(scene) {
  return scene.autoFrame ? measure(scene.autoFrame, scene.geometry).headIn : HEAD_TARGET_IN
}

function showScene(scene) {
  state.scene = scene
  state.adjust = { headIn: scene.faceFound ? autoHeadIn(scene) : HEAD_TARGET_IN, dx: 0, dy: 0 }
  render()
}

function subjectFor(scene, replaceBackground, strength) {
  const key = `${replaceBackground}|${strength}`
  const cached = scene.subjects.get(key)
  if (cached) return cached
  const { width, height } = scene.region
  const rgba =
    strength > 0
      ? liftShadows(scene.pixels, scene.skin, scene.illumination, scene.target, strength)
      : Uint8ClampedArray.from(scene.pixels)
  for (let i = 0, j = 3; i < scene.alpha.length; i++, j += 4) rgba[j] = replaceBackground ? scene.alpha[i] : 255
  const canvas = createCanvas(width, height)
  canvas.getContext('2d').putImageData(new ImageData(rgba, width, height), 0, 0)
  if (scene.subjects.size > 8) scene.subjects.clear()
  scene.subjects.set(key, canvas)
  return canvas
}

function otherPersonInFrame(scene, frame, replaceBackground) {
  const rect = frameSourceRect(frame)
  return scene.others.some((box) => {
    if (!rectsIntersect(box, rect)) return false
    if (!replaceBackground) return true
    const x = Math.round(box.x + box.width / 2 - scene.region.x)
    const y = Math.round(box.y + box.height / 2 - scene.region.y)
    if (x < 0 || y < 0 || x >= scene.region.width || y >= scene.region.height) return false
    return scene.alpha[y * scene.region.width + x] >= 128
  })
}

function sidesCut(scene, frame, replaceBackground) {
  const rect = frameSourceRect(frame)
  const y0 = Math.max(0, Math.floor(rect.y - scene.region.y))
  const y1 = Math.min(scene.region.height, Math.ceil(rect.y + rect.height - scene.region.y))
  const visible = (rows) => rows.subarray(y0, Math.max(y0, y1)).some((v) => v)
  const leftOut = Math.max(0, -rect.x) * frame.s
  const rightOut = Math.max(0, rect.x + rect.width - scene.work.width) * frame.s
  return (
    (leftOut > LIMITS.sideMissingIn && (!replaceBackground || visible(scene.leftEdge))) ||
    (rightOut > LIMITS.sideMissingIn && (!replaceBackground || visible(scene.rightEdge)))
  )
}

function digitalSize(frame) {
  return frame.s * (DIGITAL.largePx / PHOTO_IN) <= 1 ? DIGITAL.largePx : DIGITAL.smallPx
}

function scheduleRender() {
  if (state.renderQueued) return
  state.renderQueued = true
  requestAnimationFrame(() => {
    state.renderQueued = false
    render()
  })
}

function render() {
  const scene = state.scene
  el.result.hidden = !scene
  if (!scene) return

  const replaceBackground = el.background.checked
  const strength = el.shadow.checked ? Number(el.strength.value) : 0
  let frame = null
  let m = null
  let metrics = { faceFound: false }

  if (scene.faceFound) {
    frame = scene.autoFrame ? applyAdjustments(scene.autoFrame, scene.geometry, state.adjust) : null
    m = frame ? measure(frame, scene.geometry) : null
    const bottomLimit = replaceBackground ? scene.region.y + scene.region.height : scene.work.height
    metrics = {
      faceFound: true,
      yaw: scene.pose.yaw,
      pitch: scene.pose.pitch,
      roll: scene.roll,
      blinkLeft: scene.blinkLeft,
      blinkRight: scene.blinkRight,
      headCut: scene.headCut,
      headCover: scene.headCover,
      glasses: scene.glasses,
      headPx: scene.headPx,
      cropFits: !!frame,
      bottomMissingIn: frame ? bottomMissingIn(frame, bottomLimit) : 0,
      otherPerson: frame ? otherPersonInFrame(scene, frame, replaceBackground) : false,
      sidesCut: frame ? sidesCut(scene, frame, replaceBackground) : false,
      shadowImbalance: strength > 0 ? 0 : scene.imbalance,
    }
  }

  const verdict = evaluatePhoto(metrics)
  renderVerdict(verdict)
  renderSummary(scene, metrics, m)

  state.frame = frame
  el.resultGrid.hidden = !frame
  if (frame) {
    state.photo = renderPassport(scene, frame, PREVIEW_PX, replaceBackground, subjectFor(scene, replaceBackground, strength))
    const ctx = el.preview.getContext('2d')
    ctx.drawImage(state.photo, 0, 0, PREVIEW_PX, PREVIEW_PX)
    if (el.guides.checked) drawGuides(ctx, PREVIEW_PX, m)
    el.headSize.value = String(m.headIn)
    el.headValue.textContent = `${m.headIn.toFixed(2)} in`
  }

  state.allowed = !!frame && verdict.status !== 'reject'
  el.downloadNote.hidden = state.allowed
  el.sheetSection.hidden = !state.allowed
  if (state.allowed) {
    drawSheet(el.sheet.getContext('2d'), sheetLayout, state.photo)
    const size = digitalSize(frame)
    el.downloadDigital.textContent = t('downloadDigital', { size })
  }
}

function renderVerdict(verdict) {
  const key = { ok: 'verdictOk', warn: 'verdictWarn', reject: 'verdictReject' }[verdict.status]
  el.verdict.className = `verdict ${verdict.status}`
  el.verdict.textContent = t(key)
  el.reasons.replaceChildren(
    ...verdict.reasons.map((r) => {
      const li = document.createElement('li')
      li.className = r.level
      li.textContent = t(r.code)
      return li
    }),
  )
}

function renderSummary(scene, metrics, m) {
  const rows = []
  const within = (v, lo, hi) => v >= lo - 1e-6 && v <= hi + 1e-6
  const deg = (v) => Math.round(v)
  if (metrics.faceFound) {
    if (m) {
      rows.push([t('sumHead'), `${m.headIn.toFixed(2)} in`, within(m.headIn, HEAD_MIN_IN, HEAD_MAX_IN) ? 'ok' : 'reject'])
      rows.push([t('sumEyes'), `${m.eyeFromBottomIn.toFixed(2)} in`, within(m.eyeFromBottomIn, EYE_MIN_IN, EYE_MAX_IN) ? 'ok' : 'warn'])
    }
    const poseOk =
      Math.abs(metrics.yaw) <= LIMITS.yawDeg && Math.abs(metrics.pitch) <= LIMITS.pitchDeg && Math.abs(metrics.roll) <= LIMITS.rollDeg
    const pose = !poseOk ? 'reject' : Math.abs(metrics.pitch) > LIMITS.pitchWarnDeg ? 'warn' : 'ok'
    rows.push([t('sumPose'), t('poseValue', { yaw: deg(metrics.yaw), pitch: deg(metrics.pitch), roll: deg(metrics.roll) }), pose])
    const closed = Math.max(metrics.blinkLeft, metrics.blinkRight) > LIMITS.eyeBlink
    rows.push([t('sumEyesOpen'), t(closed ? 'eyesClosedShort' : 'eyesOpen'), closed ? 'reject' : 'ok'])
    const covered = metrics.headCover > LIMITS.headCover
    rows.push([t('sumHeadCover'), t(covered ? 'seenPresent' : 'seenNone'), covered ? 'warn' : 'ok'])
    const glasses = metrics.glasses > LIMITS.glasses
    rows.push([t('sumGlasses'), t(glasses ? 'seenPresent' : 'seenNone'), glasses ? 'warn' : 'ok'])
    const resolution = metrics.headPx < LIMITS.minHeadPx ? 'reject' : metrics.headPx < LIMITS.warnHeadPx ? 'warn' : 'ok'
    rows.push([t('sumResolution'), `${Math.round(metrics.headPx)} px`, resolution])
    rows.push([t('sumShadow'), `${Math.round(scene.imbalance * 100)}%`, scene.imbalance > LIMITS.shadowImbalance ? 'warn' : 'ok'])
  }
  const marks = { ok: '✓', warn: '!', reject: '✕' }
  el.summary.replaceChildren(
    ...rows.map(([label, value, level]) => {
      const tr = document.createElement('tr')
      const th = document.createElement('th')
      th.textContent = label
      const td = document.createElement('td')
      td.textContent = value
      const badge = document.createElement('td')
      badge.className = `badge ${level}`
      badge.textContent = marks[level]
      tr.append(th, td, badge)
      return tr
    }),
  )
}

function drawOverview() {
  if (!state.overview) return
  const { canvas } = state.overview
  const c = el.overview
  c.width = canvas.width
  c.height = canvas.height
  const ctx = c.getContext('2d')
  ctx.drawImage(canvas, 0, 0)
  const line = Math.max(2, Math.round(Math.max(c.width, c.height) / 400))
  ctx.font = `bold ${line * 9}px sans-serif`
  ctx.textBaseline = 'bottom'
  state.faces.forEach((face, i) => {
    const { x, y, width, height } = face.box
    const selected = !state.box && i === state.selected
    ctx.lineWidth = line * 2.5
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.55)'
    ctx.strokeRect(x, y, width, height)
    ctx.lineWidth = line
    ctx.strokeStyle = selected ? '#2fbf5b' : '#ffffff'
    ctx.strokeRect(x, y, width, height)
    if (state.faces.length > 1) {
      ctx.fillStyle = selected ? '#2fbf5b' : '#ffffff'
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.7)'
      ctx.lineWidth = line
      ctx.strokeText(String(i + 1), x, y - line)
      ctx.fillText(String(i + 1), x, y - line)
    }
  })
  if (state.box) {
    ctx.lineWidth = line
    ctx.setLineDash([line * 4, line * 3])
    ctx.strokeStyle = '#1e6ee6'
    ctx.strokeRect(state.box.x, state.box.y, state.box.width, state.box.height)
    ctx.setLineDash([])
  }
}

function renderFacesInfo() {
  if (!state.overview) return
  const n = state.faces.length
  el.facesInfo.textContent = n === 0 ? t('facesNone') : n === 1 ? t('facesOne') : t('facesMany', { n })
}

function setBoxMode(on) {
  state.boxMode = on
  state.drag = null
  el.boxMode.textContent = t(on ? 'selectBoxCancel' : 'selectBox')
  el.boxHint.hidden = !on
  el.overview.classList.toggle('drawing', on)
}

function overviewPoint(event) {
  const rect = el.overview.getBoundingClientRect()
  const x = ((event.clientX - rect.left) / rect.width) * el.overview.width
  const y = ((event.clientY - rect.top) / rect.height) * el.overview.height
  return { x: Math.min(el.overview.width, Math.max(0, x)), y: Math.min(el.overview.height, Math.max(0, y)) }
}

function boxFrom(a, b) {
  return { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), width: Math.abs(a.x - b.x), height: Math.abs(a.y - b.y) }
}

async function download(canvas, name, dpi, quality, minBytes = 0) {
  const toBlob = (q) => new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', q))
  let blob = await toBlob(quality)
  if (blob.size < minBytes) blob = await toBlob(1)
  const bytes = setJpegDpi(new Uint8Array(await blob.arrayBuffer()), dpi)
  const url = URL.createObjectURL(new Blob([bytes], { type: 'image/jpeg' }))
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.append(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10000)
}

function renderLabels() {
  applyTranslations()
  for (const button of document.querySelectorAll('[data-lang]')) {
    button.setAttribute('aria-pressed', String(button.dataset.lang === getLanguage()))
  }
  el.boxMode.textContent = t(state.boxMode ? 'selectBoxCancel' : 'selectBox')
  if (state.status) setStatus(state.status.key, state.status.isError, state.status.detail)
  renderFacesInfo()
  if (state.scene) render()
}

for (const button of document.querySelectorAll('[data-lang]')) {
  button.addEventListener('click', () => {
    setLanguage(button.dataset.lang)
    renderLabels()
  })
}

el.drop.addEventListener('pointerdown', () => loadModels().catch(() => {}), { once: true })
el.file.addEventListener('change', () => {
  const file = el.file.files?.[0]
  el.file.value = ''
  handleFile(file)
})
el.drop.addEventListener('dragover', (event) => {
  event.preventDefault()
  el.drop.classList.add('over')
})
el.drop.addEventListener('dragleave', () => el.drop.classList.remove('over'))
el.drop.addEventListener('drop', (event) => {
  event.preventDefault()
  el.drop.classList.remove('over')
  handleFile(event.dataTransfer?.files?.[0])
})

el.boxMode.addEventListener('click', () => {
  setBoxMode(!state.boxMode)
  if (!state.boxMode) {
    state.box = null
    drawOverview()
  }
})

el.overview.addEventListener('pointerdown', (event) => {
  if (!state.overview || state.busy) return
  const point = overviewPoint(event)
  if (state.boxMode) {
    event.preventDefault()
    el.overview.setPointerCapture(event.pointerId)
    state.drag = point
    state.box = boxFrom(point, point)
    drawOverview()
    return
  }
  const hits = state.faces
    .map((face, i) => ({ face, i }))
    .filter(({ face: { box } }) => point.x >= box.x && point.x <= box.x + box.width && point.y >= box.y && point.y <= box.y + box.height)
    .sort((a, b) => a.face.box.width * a.face.box.height - b.face.box.width * b.face.box.height)
  if (hits.length) selectFace(hits[0].i)
})

el.overview.addEventListener('pointermove', (event) => {
  if (!state.drag) return
  state.box = boxFrom(state.drag, overviewPoint(event))
  drawOverview()
})

el.overview.addEventListener('pointerup', () => {
  if (!state.drag) return
  state.drag = null
  const minSize = Math.max(24, Math.min(el.overview.width, el.overview.height) * 0.03)
  if (state.box && state.box.width >= minSize && state.box.height >= minSize) {
    selectRegion(state.box)
  } else {
    state.box = null
    drawOverview()
  }
})

el.background.addEventListener('change', scheduleRender)
el.guides.addEventListener('change', scheduleRender)
el.shadow.addEventListener('change', () => {
  el.strength.disabled = !el.shadow.checked
  scheduleRender()
})
el.strength.addEventListener('input', scheduleRender)
el.headSize.addEventListener('input', () => {
  state.adjust.headIn = Number(el.headSize.value)
  scheduleRender()
})

const moves = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }
for (const button of document.querySelectorAll('[data-move]')) {
  button.addEventListener('click', () => {
    const [mx, my] = moves[button.dataset.move]
    const clamp = (v) => Math.max(-MAX_OFFSET_IN, Math.min(MAX_OFFSET_IN, v))
    state.adjust.dx = clamp(state.adjust.dx + mx * NUDGE_IN)
    state.adjust.dy = clamp(state.adjust.dy + my * NUDGE_IN)
    scheduleRender()
  })
}

el.reset.addEventListener('click', () => {
  if (!state.scene?.faceFound) return
  state.adjust = { headIn: autoHeadIn(state.scene), dx: 0, dy: 0 }
  scheduleRender()
})

el.downloadSheet.addEventListener('click', () => {
  if (!state.allowed) return
  const canvas = createCanvas(sheetLayout.width, sheetLayout.height)
  drawSheet(canvas.getContext('2d'), sheetLayout, state.photo)
  download(canvas, 'passport-photo-4x6.jpg', DPI, 0.95)
})

el.downloadDigital.addEventListener('click', () => {
  if (!state.allowed) return
  const size = digitalSize(state.frame)
  const strength = el.shadow.checked ? Number(el.strength.value) : 0
  const replaceBackground = el.background.checked
  const subject = subjectFor(state.scene, replaceBackground, strength)
  const canvas = renderPassport(state.scene, state.frame, size, replaceBackground, subject)
  download(canvas, 'passport-photo-digital.jpg', Math.round(size / PHOTO_IN), DIGITAL.quality, DIGITAL.minBytes)
})

renderLabels()
if (typeof WebAssembly === 'undefined') setStatus('noWasm', true)
