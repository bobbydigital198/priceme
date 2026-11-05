import { useEffect, useRef, type ReactNode, type RefObject } from 'react'
import { createDetector, normaliseBarcode } from '../lib/barcode'
import { frameToVideoCrop } from '../lib/crop'
import { useRearCamera } from '../lib/useRearCamera'
import { FocusRing } from './FocusRing'

type Props = {
  // The on-screen guide: only barcodes inside it are read.
  guideRef: RefObject<HTMLElement | null>
  onDetected: (barcode: string) => void
  onError: (message: string) => void
  // What's drawn over the camera view, told whether tap to focus works on this phone.
  children: (canFocus: boolean) => ReactNode
}

const SCAN_INTERVAL_MS = 120
// The guide is widened a little on each side, so a barcode touching its edge still counts.
const MARGIN = 0.08

// Live rear-camera view that reports the first valid barcode inside the guide, then stops.
export function BarcodeCamera({ guideRef, onDetected, onError, children }: Props) {
  const { videoRef, ready, canFocus, tapToFocus, focusPoint } = useRearCamera(onError)
  const onDetectedRef = useRef(onDetected)
  useEffect(() => {
    onDetectedRef.current = onDetected
  })

  useEffect(() => {
    if (!ready) return
    const video = videoRef.current!
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d', { willReadFrequently: true })
    let stopped = false
    let timer: ReturnType<typeof setTimeout> | undefined

    // Copies just the part of the camera view inside the guide.
    function guidePicture(): HTMLCanvasElement | null {
      const guide = guideRef.current
      if (!context || !guide || !video.videoWidth) return null
      const box = guide.getBoundingClientRect()
      const widened = {
        left: box.left - box.width * MARGIN,
        top: box.top - box.height * MARGIN,
        width: box.width * (1 + 2 * MARGIN),
        height: box.height * (1 + 2 * MARGIN),
      }
      const { sx, sy, sw, sh } = frameToVideoCrop({ width: video.videoWidth, height: video.videoHeight }, video.getBoundingClientRect(), widened)
      if (sw <= 0 || sh <= 0) return null
      // Smaller pictures decode faster and barcodes stay readable.
      const scale = Math.min(1, 1280 / sw)
      canvas.width = Math.round(sw * scale)
      canvas.height = Math.round(sh * scale)
      context.drawImage(video, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height)
      return canvas
    }

    createDetector().then((detect) => {
      const tick = async () => {
        if (stopped) return
        const picture = guidePicture()
        const result = picture && (await detect(picture).catch(() => null))
        const barcode = result && normaliseBarcode(result.rawValue, result.format)
        if (barcode && !stopped) {
          stopped = true
          onDetectedRef.current(barcode)
          return
        }
        timer = setTimeout(tick, SCAN_INTERVAL_MS)
      }
      tick()
    })

    return () => {
      stopped = true
      clearTimeout(timer)
    }
  }, [ready, videoRef, guideRef])

  return (
    <>
      <video ref={videoRef} className="camera-video" playsInline muted autoPlay />
      <div className="camera-overlay" onPointerUp={tapToFocus}>
        {children(canFocus)}
      </div>
      <FocusRing key={focusPoint?.id} point={focusPoint} />
    </>
  )
}
