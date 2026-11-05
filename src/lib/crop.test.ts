import { describe, expect, it } from 'vitest'
import { frameToVideoCrop, videoCropToPhoto } from './crop'

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

describe('videoCropToPhoto', () => {
  it('scales a crop onto a photo with the same shape', () => {
    expect(videoCropToPhoto({ sx: 100, sy: 200, sw: 300, sh: 200 }, { width: 1080, height: 1920 }, { width: 2160, height: 3840 })).toEqual({
      sx: 200,
      sy: 400,
      sw: 600,
      sh: 400,
    })
  })

  it('allows for the photo showing more at the sides (4:3 photo, 16:9 view)', () => {
    // Portrait: the 1080 x 1920 view is the middle 2250 x 4000 of a 3000 x 4000 photo.
    const crop = videoCropToPhoto({ sx: 0, sy: 0, sw: 1080, sh: 1920 }, { width: 1080, height: 1920 }, { width: 3000, height: 4000 })
    expect(crop).toEqual({ sx: 375, sy: 0, sw: 2250, sh: 4000 })
  })

  it('gives up when the photo is turned the other way', () => {
    expect(videoCropToPhoto({ sx: 0, sy: 0, sw: 10, sh: 10 }, { width: 1080, height: 1920 }, { width: 4000, height: 3000 })).toBeUndefined()
  })
})
