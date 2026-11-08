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
