import { useEffect, useRef, useState } from 'react'

function cameraErrorMessage(error: unknown): string {
  const name = error instanceof DOMException ? error.name : ''
  if (name === 'NotAllowedError') {
    return 'PriceMe needs the camera to scan barcodes and price tags. If you blocked it before, open Chrome, go to Settings, then Site settings, then Camera, and allow it for bobbydigital198.github.io.'
  }
  if (name === 'NotFoundError') return 'No camera was found on this device.'
  if (name === 'NotReadableError') return 'The camera is busy. Close any other app using it and try again.'
  return 'The camera could not start. Please try again.'
}

// Streams the rear camera into a <video>. The camera switches off when the component goes away.
export function useRearCamera(onError: (message: string) => void) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [ready, setReady] = useState(false)
  const onErrorRef = useRef(onError)
  useEffect(() => {
    onErrorRef.current = onError
  })

  useEffect(() => {
    const video = videoRef.current!
    let stream: MediaStream | undefined
    let stopped = false

    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) {
        onErrorRef.current('This browser cannot use the camera here.')
        return
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        })
      } catch (error) {
        if (!stopped) onErrorRef.current(cameraErrorMessage(error))
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
      if (!stopped) setReady(true)
    }

    start()
    return () => {
      stopped = true
      stream?.getTracks().forEach((t) => t.stop())
      video.srcObject = null
    }
  }, [])

  return { videoRef, ready }
}
