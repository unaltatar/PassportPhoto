export const DPI = 300
export const PHOTO_IN = 2

export const HEAD_MIN_IN = 1
export const HEAD_MAX_IN = 1.375
export const HEAD_TARGET_IN = 1.1875

export const EYE_MIN_IN = 1.125
export const EYE_MAX_IN = 1.375
export const EYE_TARGET_IN = 1.25

export const TOP_MARGIN_MIN_IN = 0.1

export const LIMITS = {
  yawDeg: 8,
  pitchDeg: 10,
  rollDeg: 10,
  eyeBlink: 0.6,
  minHeadPx: HEAD_MIN_IN * DPI,
  warnHeadPx: HEAD_TARGET_IN * DPI,
  bottomMissingIn: 0.1,
  shadowImbalance: 0.18,
}

export const SHEET = {
  widthIn: 6,
  heightIn: 4,
  marginIn: 0.2,
  gapIn: 0.2,
}

export const DIGITAL = {
  largePx: 1200,
  smallPx: 600,
  minBytes: 54 * 1024,
  quality: 0.92,
}

export const WORK_MAX_PX = 2400
export const MAX_FACES = 10

export const MODELS = {
  face: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
  segmenter: 'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_multiclass_256x256/float32/latest/selfie_multiclass_256x256.tflite',
}

export const LANDMARKS = {
  chin: 152,
  forehead: 10,
  faceLeft: 234,
  faceRight: 454,
  irisA: 468,
  irisB: 473,
}

export const SEGMENT_CLASSES = {
  background: 0,
  hair: 1,
  bodySkin: 2,
  faceSkin: 3,
  clothes: 4,
  others: 5,
}
