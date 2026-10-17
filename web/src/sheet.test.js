import { describe, expect, it } from 'vitest'
import { layoutSheet } from './sheet.js'
import { rectsIntersect } from './geometry.js'

describe('layoutSheet', () => {
  const layout = layoutSheet(300)
  const rects = layout.photos.map((p) => ({ x: p.x, y: p.y, width: p.size, height: p.size }))

  it('is exactly 6x4 inches at 300 dpi', () => {
    expect(layout.width).toBe(1800)
    expect(layout.height).toBe(1200)
    expect(layout.width / layout.height).toBe(1.5)
  })

  it('places four 2x2 inch photos', () => {
    expect(layout.photos).toHaveLength(4)
    for (const p of layout.photos) expect(p.size).toBe(600)
  })

  it('keeps every photo on the sheet', () => {
    for (const r of rects) {
      expect(r.x).toBeGreaterThanOrEqual(0)
      expect(r.y).toBeGreaterThanOrEqual(0)
      expect(r.x + r.width).toBeLessThanOrEqual(layout.width)
      expect(r.y + r.height).toBeLessThanOrEqual(layout.height)
    }
  })

  it('never overlaps photos', () => {
    for (let i = 0; i < rects.length; i++) {
      for (let j = i + 1; j < rects.length; j++) expect(rectsIntersect(rects[i], rects[j])).toBe(false)
    }
  })

  it('leaves a side margin and a gap between columns for cutting', () => {
    expect(layout.photos[0].x).toBe(60)
    expect(layout.photos[1].x - (layout.photos[0].x + 600)).toBe(60)
  })

  it('puts a one inch ruler inside the side panel', () => {
    expect(layout.ruler.length).toBe(300)
    expect(layout.ruler.x).toBeGreaterThanOrEqual(layout.panel.x)
    expect(layout.ruler.x + layout.ruler.length).toBeLessThanOrEqual(layout.width)
  })
})
