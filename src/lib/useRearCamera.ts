import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { isIos } from './platform'

function cameraErrorMessage(error: unknown): string {
  const name = error instanceof DOMException ? error.name : ''
  if (name === 'NotAllowedError') {
    return isIos()
      ? 'PrixIt needs the camera to scan barcodes and price tags. If you blocked it, open the Settings app, tap Apps, then Safari (or the browser you installed PrixIt from), then Camera, and choose Ask or Allow. Then close PrixIt and open it again.'
      : 'PrixIt needs the camera to scan barcodes and price tags. If you blocked it before, open Chrome, go to Settings, then Site settings, then Camera, and allow it for bobbydigital198.github.io.'
  }
  if (name === 'NotFoundError') return 'No camera was found on this device.'
  if (name === 'NotReadableError') return 'The camera is busy. Close any other app using it and try again.'
  return 'The camera could not start. Please try again.'
}

// Streams the rear camera into a <video>. The camera switches off when the component goes away.
export function useRearCamera(onError: (message: string) => void) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const trackRef = useRef<MediaStreamTrack>(undefined)
  const [ready, setReady] = useState(false)
  // Whether the camera lets PrixIt choose where to focus (most Android phones in Chrome; not iPhones).
  const [canFocus, setCanFocus] = useState(false)
  const [focusPoint, setFocusPoint] = useState<{ x: number; y: number; id: number }>()
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
      trackRef.current = track
      // Not every camera supports continuous focus; ignore it if not.
      track?.applyConstraints({ advanced: [{ focusMode: 'continuous' } as MediaTrackConstraintSet] }).catch(() => {})
      const modes = (track?.getCapabilities?.() as { focusMode?: string[] } | undefined)?.focusMode ?? []
      if (!stopped) {
        setCanFocus(modes.includes('single-shot') || modes.includes('continuous'))
        setReady(true)
      }
    }

    start()
    return () => {
      stopped = true
      trackRef.current = undefined
      stream?.getTracks().forEach((t) => t.stop())
      video.srcObject = null
    }
  }, [])

  // Tap to focus: asks the camera to focus on the tapped spot. Cameras that can't do this ignore it.
  function focusAt(clientX: number, clientY: number) {
    const track = trackRef.current
    const video = videoRef.current
    if (!track || !video?.videoWidth) return
    const point = screenToVideoPoint(clientX, clientY, video)
    setFocusPoint((current) => ({ x: clientX, y: clientY, id: (current?.id ?? 0) + 1 }))
    const modes = (track.getCapabilities?.() as { focusMode?: string[] } | undefined)?.focusMode ?? []
    const mode = modes.includes('single-shot') ? 'single-shot' : modes.includes('continuous') ? 'continuous' : undefined
    if (!mode) return
    const focusThere = { pointsOfInterest: [point], focusMode: mode } as MediaTrackConstraintSet
    // Switching mode first makes the camera start a fresh focus, even if it's already in that mode.
    track
      .applyConstraints({ advanced: [{ focusMode: mode === 'single-shot' ? 'continuous' : 'manual' } as MediaTrackConstraintSet] })
      .catch(() => {})
      .then(() => track.applyConstraints({ advanced: [focusThere] }))
      .catch(() => {})
  }

  // For the camera view: a tap anywhere except on a button focuses there.
  function tapToFocus(event: PointerEvent) {
    if ((event.target as HTMLElement).closest('button')) return
    focusAt(event.clientX, event.clientY)
  }

  // A full-resolution photo from the camera, sharper than a frame of the live view. Only some
  // browsers can do this (Chrome on Android); others return undefined and use the live view.
  async function takePhoto(): Promise<ImageBitmap | undefined> {
    const track = trackRef.current
    const Capture = (globalThis as { ImageCapture?: ImageCaptureClass }).ImageCapture
    if (!track || !Capture) return undefined
    try {
      const capture = new Capture(track)
      const capabilities = await capture.getPhotoCapabilities().catch(() => undefined)
      const settings: Record<string, unknown> = {}
      // No flash: it causes glare on shiny labels.
      if (capabilities?.fillLightMode?.includes('off')) settings.fillLightMode = 'off'
      const blob = await withTimeout(capture.takePhoto(settings), 5000)
      return await createImageBitmap(blob)
    } catch {
      return undefined
    }
  }

  return { videoRef, ready, canFocus, tapToFocus, focusPoint, takePhoto }
}

type ImageCaptureClass = new (track: MediaStreamTrack) => {
  getPhotoCapabilities(): Promise<{ fillLightMode?: string[] }>
  takePhoto(settings?: Record<string, unknown>): Promise<Blob>
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([promise, new Promise<T>((_, reject) => setTimeout(() => reject(new Error('timeout')), ms))])
}

// Where a tap lands in the camera picture, from 0 to 1 across and down. The picture fills the
// screen with object-fit: cover, so its edges are cut off.
function screenToVideoPoint(clientX: number, clientY: number, video: HTMLVideoElement) {
  const rect = video.getBoundingClientRect()
  const scale = Math.max(rect.width / video.videoWidth, rect.height / video.videoHeight)
  const offsetX = (rect.width - video.videoWidth * scale) / 2
  const offsetY = (rect.height - video.videoHeight * scale) / 2
  const clamp = (n: number) => Math.min(1, Math.max(0, n))
  return {
    x: clamp((clientX - rect.left - offsetX) / scale / video.videoWidth),
    y: clamp((clientY - rect.top - offsetY) / scale / video.videoHeight),
  }
}
