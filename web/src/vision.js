import { FaceLandmarker, FilesetResolver, ImageSegmenter } from '@mediapipe/tasks-vision'
import { MAX_FACES, MODELS, SEGMENT_CLASSES } from './spec.js'
import { boundingBox, eulerFromMatrix, mergeDetections, tileOrigins } from './geometry.js'
import { resizeMask } from './mask.js'

let models

export function loadModels() {
  if (!models) {
    models = (async () => {
      const fileset = await FilesetResolver.forVisionTasks(new URL('./mediapipe/wasm', document.baseURI).href)
      const [face, segmenter] = await Promise.all([
        FaceLandmarker.createFromOptions(fileset, {
          baseOptions: { modelAssetPath: MODELS.face },
          runningMode: 'IMAGE',
          numFaces: MAX_FACES,
          outputFaceBlendshapes: true,
          outputFacialTransformationMatrixes: true,
        }),
        ImageSegmenter.createFromOptions(fileset, {
          baseOptions: { modelAssetPath: MODELS.segmenter },
          runningMode: 'IMAGE',
          outputConfidenceMasks: true,
          outputCategoryMask: false,
        }),
      ])
      return { face, segmenter }
    })()
    models.catch(() => {
      models = undefined
    })
  }
  return models
}

export async function detectFaces(canvas) {
  const { face } = await loadModels()
  const result = face.detect(canvas)
  const w = canvas.width
  const h = canvas.height
  return result.faceLandmarks.map((landmarks, i) => {
    const points = landmarks.map((p) => ({ x: p.x * w, y: p.y * h }))
    const scores = Object.fromEntries((result.faceBlendshapes?.[i]?.categories ?? []).map((c) => [c.categoryName, c.score]))
    const matrix = result.facialTransformationMatrixes?.[i]
    return {
      points,
      box: boundingBox(points),
      blinkLeft: scores.eyeBlinkLeft ?? 0,
      blinkRight: scores.eyeBlinkRight ?? 0,
      pose: matrix ? eulerFromMatrix(matrix.data) : { yaw: 0, pitch: 0, roll: 0 },
    }
  })
}

export async function detectFacesTiled(canvas, levels = [2, 3, 4]) {
  const tile = document.createElement('canvas')
  for (const n of levels) {
    const tw = Math.min(canvas.width, Math.round((canvas.width / n) * 1.5))
    const th = Math.min(canvas.height, Math.round((canvas.height / n) * 1.5))
    tile.width = tw
    tile.height = th
    const ctx = tile.getContext('2d')
    const found = []
    for (const y of tileOrigins(canvas.height, th, n)) {
      for (const x of tileOrigins(canvas.width, tw, n)) {
        ctx.clearRect(0, 0, tw, th)
        ctx.drawImage(canvas, x, y, tw, th, 0, 0, tw, th)
        for (const face of await detectFaces(tile)) {
          const { box } = face
          const score = Math.min(box.x, box.y, tw - box.x - box.width, th - box.y - box.height)
          const points = face.points.map((p) => ({ x: p.x + x, y: p.y + y }))
          found.push({ ...face, points, box: boundingBox(points), score })
        }
      }
    }
    const faces = mergeDetections(found)
    if (faces.length) return faces
  }
  return []
}

export async function findFaces(canvas) {
  const faces = await detectFaces(canvas)
  return faces.length ? faces : detectFacesTiled(canvas)
}

export async function segmentRegion(canvas) {
  const { segmenter } = await loadModels()
  const result = segmenter.segment(canvas)
  try {
    const masks = result.confidenceMasks ?? []
    const read = (index) => {
      const mask = masks[index]
      return resizeMask(mask.getAsFloat32Array(), mask.width, mask.height, canvas.width, canvas.height)
    }
    return {
      background: read(SEGMENT_CLASSES.background),
      faceSkin: read(SEGMENT_CLASSES.faceSkin),
      bodySkin: read(SEGMENT_CLASSES.bodySkin),
    }
  } finally {
    result.close?.()
  }
}
