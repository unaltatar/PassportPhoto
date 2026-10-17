import { describe, expect, it } from 'vitest'
import { evaluatePhoto } from './quality.js'

const good = {
  faceFound: true,
  yaw: 2,
  pitch: -3,
  roll: 1,
  blinkLeft: 0.1,
  blinkRight: 0.1,
  headCut: false,
  headPx: 600,
  cropFits: true,
  bottomMissingIn: 0,
  otherPerson: false,
  shadowImbalance: 0.05,
}

const codes = (result) => result.reasons.map((r) => r.code)

describe('evaluatePhoto', () => {
  it('accepts a good photo', () => {
    expect(evaluatePhoto(good)).toEqual({ status: 'ok', reasons: [] })
  })

  it('rejects when no face is found', () => {
    const result = evaluatePhoto({ faceFound: false })
    expect(result.status).toBe('reject')
    expect(codes(result)).toEqual(['noFace'])
  })

  it('rejects a face turned 12 degrees and accepts 5 degrees', () => {
    expect(codes(evaluatePhoto({ ...good, yaw: -12 }))).toEqual(['turned'])
    expect(evaluatePhoto({ ...good, yaw: 5 }).status).toBe('ok')
  })

  it('rejects pitch and roll beyond the limits', () => {
    expect(codes(evaluatePhoto({ ...good, pitch: 14 }))).toEqual(['tiltedUpDown'])
    expect(codes(evaluatePhoto({ ...good, roll: -11 }))).toEqual(['tilted'])
  })

  it('rejects closed eyes', () => {
    expect(codes(evaluatePhoto({ ...good, blinkRight: 0.8 }))).toEqual(['eyesClosed'])
  })

  it('rejects a cut head', () => {
    expect(codes(evaluatePhoto({ ...good, headCut: true }))).toEqual(['headCut'])
  })

  it('rejects low resolution and warns near the limit', () => {
    expect(codes(evaluatePhoto({ ...good, headPx: 250 }))).toEqual(['lowRes'])
    const near = evaluatePhoto({ ...good, headPx: 320 })
    expect(near.status).toBe('warn')
    expect(codes(near)).toEqual(['lowResWarn'])
  })

  it('rejects when no crop fits, shoulders are missing or another person is in frame', () => {
    expect(codes(evaluatePhoto({ ...good, cropFits: false }))).toEqual(['noFit'])
    expect(codes(evaluatePhoto({ ...good, bottomMissingIn: 0.3 }))).toEqual(['shouldersMissing'])
    expect(codes(evaluatePhoto({ ...good, otherPerson: true }))).toEqual(['otherPerson'])
  })

  it('only warns about shadows', () => {
    const result = evaluatePhoto({ ...good, shadowImbalance: 0.3 })
    expect(result.status).toBe('warn')
    expect(codes(result)).toEqual(['shadow'])
  })

  it('collects several reasons and lets reject win over warn', () => {
    const result = evaluatePhoto({ ...good, yaw: 20, shadowImbalance: 0.4 })
    expect(result.status).toBe('reject')
    expect(codes(result)).toEqual(['turned', 'shadow'])
  })
})
