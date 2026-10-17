import { LIMITS } from './spec.js'

export function evaluatePhoto(m) {
  const reasons = []
  const reject = (code) => reasons.push({ code, level: 'reject' })
  const warn = (code) => reasons.push({ code, level: 'warn' })

  if (!m.faceFound) {
    reject('noFace')
  } else {
    if (Math.abs(m.yaw) > LIMITS.yawDeg) reject('turned')
    if (Math.abs(m.pitch) > LIMITS.pitchDeg) reject('tiltedUpDown')
    else if (Math.abs(m.pitch) > LIMITS.pitchWarnDeg) warn('tiltedUpDownWarn')
    if (Math.abs(m.roll) > LIMITS.rollDeg) reject('tilted')
    if (Math.max(m.blinkLeft, m.blinkRight) > LIMITS.eyeBlink) reject('eyesClosed')
    if (m.headCut) reject('headCut')
    if (m.headPx < LIMITS.minHeadPx) reject('lowRes')
    else if (m.headPx < LIMITS.warnHeadPx) warn('lowResWarn')
    if (!m.cropFits) reject('noFit')
    if (m.bottomMissingIn > LIMITS.bottomMissingIn) reject('shouldersMissing')
    if (m.otherPerson) reject('otherPerson')
    if (m.headCover > LIMITS.headCover) warn('headCovering')
    if (m.sidesCut) warn('sidesCut')
    if (m.shadowImbalance > LIMITS.shadowImbalance) warn('shadow')
  }

  const status = reasons.some((r) => r.level === 'reject') ? 'reject' : reasons.length ? 'warn' : 'ok'
  return { status, reasons }
}
