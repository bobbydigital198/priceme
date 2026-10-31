import { useEffect, useRef } from 'react'
import { createDetector, normaliseBarcode } from '../lib/barcode'
import { useRearCamera } from '../lib/useRearCamera'

type Props = {
  onDetected: (barcode: string) => void
  onError: (message: string) => void
}

const SCAN_INTERVAL_MS = 120

// Live rear-camera view that reports the first valid barcode it sees, then stops.
export function BarcodeCamera({ onDetected, onError }: Props) {
  const { videoRef, ready } = useRearCamera(onError)
  const onDetectedRef = useRef(onDetected)
  useEffect(() => {
    onDetectedRef.current = onDetected
  })

  useEffect(() => {
    if (!ready) return
    const video = videoRef.current!
    let stopped = false
    let timer: ReturnType<typeof setTimeout> | undefined

    createDetector().then((detect) => {
      const tick = async () => {
        if (stopped) return
        const result = await detect(video).catch(() => null)
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
  }, [ready, videoRef])

  return <video ref={videoRef} className="camera-video" playsInline muted autoPlay />
}
