import { describe, expect, it } from 'vitest'
import { frameToVideoCrop } from './crop'

describe('frameToVideoCrop', () => {
  const screen = { left: 0, top: 0, width: 400, height: 800 }

  it('maps a centred frame on a portrait video that fits exactly', () => {
    const crop = frameToVideoCrop({ width: 1080, height: 2160 }, screen, { left: 50, top: 300, width: 300, height: 200 })
    expect(crop).toEqual({ sx: 135, sy: 810, sw: 810, sh: 540 })
  })

  it('accounts for the sides cut off by object-fit: cover', () => {
    // A landscape 1920x1080 video in a tall element is scaled to 800 high and 1422 wide, so 511px is cut each side.
    const crop = frameToVideoCrop({ width: 1920, height: 1080 }, screen, { left: 0, top: 0, width: 400, height: 800 })
    expect(crop.sw).toBe(540)
    expect(crop.sh).toBe(1080)
    expect(crop.sx).toBe(690)
  })

  it('never goes outside the video', () => {
    const crop = frameToVideoCrop({ width: 1080, height: 2160 }, screen, { left: -20, top: -20, width: 500, height: 900 })
    expect(crop).toEqual({ sx: 0, sy: 0, sw: 1080, sh: 2160 })
  })
})
