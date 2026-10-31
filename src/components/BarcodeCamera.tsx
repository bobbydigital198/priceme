import { useEffect, useRef } from 'react'
import { createDetector, normaliseBarcode } from '../lib/barcode'

type Props = {
  onDetected: (barcode: string) => void
  onError: (message: string) => void
}

const SCAN_INTERVAL_MS = 120

function cameraErrorMessage(error: unknown): string {
  const name = error instanceof DOMException ? error.name : ''
  if (name === 'NotAllowedError') {
    return 'PriceMe needs the camera to scan barcodes. If you blocked it before, open Chrome, go to Settings, then Site settings, then Camera, and allow it for bobbydigital198.github.io.'
  }
  if (name === 'NotFoundError') return 'No camera was found on this device.'
  if (name === 'NotReadableError') return 'The camera is busy. Close any other app using it and try again.'
  return 'The camera could not start. Try again, or type the barcode instead.'
}

// Live rear-camera view that reports the first valid barcode it sees, then stops.
// The camera switches off when this component goes away.
export function BarcodeCamera({ onDetected, onError }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const callbacks = useRef({ onDetected, onError })
  useEffect(() => {
    callbacks.current = { onDetected, onError }
  })

  useEffect(() => {
    const video = videoRef.current!
    let stream: MediaStream | undefined
    let stopped = false
    let timer: ReturnType<typeof setTimeout> | undefined

    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) {
        callbacks.current.onError('This browser cannot use the camera here.')
        return
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        })
      } catch (error) {
        if (!stopped) callbacks.current.onError(cameraErrorMessage(error))
        return
      }
      if (stopped) {
        stream.getTracks().forEach((t) => t.stop())
        return
      }

      video.srcObject = stream
      await video.play().catch(() => {})
      const [track] = stream.getVideoTracks()
      // Not every camera supports continuous focus; ignore it if not.
      track?.applyConstraints({ advanced: [{ focusMode: 'continuous' } as MediaTrackConstraintSet] }).catch(() => {})

      const detect = await createDetector()
      const tick = async () => {
        if (stopped) return
        const result = await detect(video).catch(() => null)
        const barcode = result && normaliseBarcode(result.rawValue, result.format)
        if (barcode && !stopped) {
          stopped = true
          callbacks.current.onDetected(barcode)
          return
        }
        timer = setTimeout(tick, SCAN_INTERVAL_MS)
      }
      tick()
    }

    start()
    return () => {
      stopped = true
      clearTimeout(timer)
      stream?.getTracks().forEach((t) => t.stop())
      video.srcObject = null
    }
  }, [])

  return <video ref={videoRef} className="camera-video" playsInline muted autoPlay />
}
