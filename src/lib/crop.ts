// Maps the on-screen framing rectangle to pixels in the camera frame.

type Rect = { left: number; top: number; width: number; height: number }

// The video fills its element with object-fit: cover, so part of the frame is cut off at the edges.
export function frameToVideoCrop(video: { width: number; height: number }, element: Rect, frame: Rect) {
  const scale = Math.max(element.width / video.width, element.height / video.height)
  const offsetX = (element.width - video.width * scale) / 2
  const offsetY = (element.height - video.height * scale) / 2

  const x0 = Math.max(0, (frame.left - element.left - offsetX) / scale)
  const y0 = Math.max(0, (frame.top - element.top - offsetY) / scale)
  const x1 = Math.min(video.width, (frame.left + frame.width - element.left - offsetX) / scale)
  const y1 = Math.min(video.height, (frame.top + frame.height - element.top - offsetY) / scale)

  return { sx: Math.round(x0), sy: Math.round(y0), sw: Math.round(x1 - x0), sh: Math.round(y1 - y0) }
}

type Size = { width: number; height: number }
type Crop = { sx: number; sy: number; sw: number; sh: number }

// Moves a crop of the live view onto a full-resolution photo of the same scene. The live view
// is the middle of the photo (the photo can show a little more at two edges), scaled down.
// Returns undefined if the photo is turned the other way, so the live view is used instead.
export function videoCropToPhoto(crop: Crop, video: Size, photo: Size): Crop | undefined {
  if (video.width > video.height !== photo.width > photo.height) return undefined
  const scale = Math.min(photo.width / video.width, photo.height / video.height)
  const offsetX = (photo.width - video.width * scale) / 2
  const offsetY = (photo.height - video.height * scale) / 2
  return {
    sx: Math.max(0, Math.round(offsetX + crop.sx * scale)),
    sy: Math.max(0, Math.round(offsetY + crop.sy * scale)),
    sw: Math.round(crop.sw * scale),
    sh: Math.round(crop.sh * scale),
  }
}
