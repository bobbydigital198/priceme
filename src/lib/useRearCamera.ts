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

type CameraOptions = {
  // Price tags: ask for a sharper live view (up to 4K), since the photo is a frame of it.
  highResolution?: boolean
}

// Zoom choices offered on the camera screens, where the camera allows them.
const ZOOM_STEPS = [1, 2, 3]
const ZOOM_KEY = 'camera-zoom'
// Phones can't focus very close up; starting at 2x means holding the phone further back.
const DEFAULT_ZOOM = 2

function savedZoom(): number {
  try {
    const value = Number(localStorage.getItem(ZOOM_KEY))
    return ZOOM_STEPS.includes(value) ? value : DEFAULT_ZOOM
  } catch {
    return DEFAULT_ZOOM
  }
}

type Capabilities = { focusMode?: string[]; zoom?: { min: number; max: number } }

// Streams the rear camera into a <video>. The camera switches off when the component goes away.
export function useRearCamera(onError: (message: string) => void, { highResolution = false }: CameraOptions = {}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const trackRef = useRef<MediaStreamTrack>(undefined)
  const [ready, setReady] = useState(false)
  // Whether the camera lets PrixIt choose where to focus (most Android phones in Chrome; not iPhones).
  const [canFocus, setCanFocus] = useState(false)
  const [focusPoint, setFocusPoint] = useState<{ x: number; y: number; id: number }>()
  // The zoom steps this camera allows (empty if it can't zoom), and the one in use.
  const [zoomSteps, setZoomSteps] = useState<number[]>([])
  const [zoom, setZoomState] = useState(1)
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
      const size = highResolution ? { width: { ideal: 3840 }, height: { ideal: 2160 } } : { width: { ideal: 1920 }, height: { ideal: 1080 } }
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: { ideal: 'environment' }, ...size } })
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
      const capabilities = (track?.getCapabilities?.() ?? {}) as Capabilities
      const modes = capabilities.focusMode ?? []
      const steps = capabilities.zoom ? ZOOM_STEPS.filter((z) => z >= capabilities.zoom!.min && z <= capabilities.zoom!.max) : []
      const startZoom = steps.length > 1 ? Math.min(savedZoom(), steps[steps.length - 1]) : undefined
      // Not every camera supports continuous focus or zoom; whatever isn't supported is ignored.
      track
        ?.applyConstraints({
          advanced: [{ ...(modes.includes('continuous') ? { focusMode: 'continuous' } : {}), ...(startZoom ? { zoom: startZoom } : {}) } as MediaTrackConstraintSet],
        })
        .catch(() => {})
      if (!stopped) {
        setCanFocus(modes.includes('single-shot') || modes.includes('continuous'))
        setZoomSteps(steps.length > 1 ? steps : [])
        if (startZoom) setZoomState(startZoom)
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
  }, [highResolution])

  function setZoom(level: number) {
    const track = trackRef.current
    if (!track) return
    setZoomState(level)
    try {
      localStorage.setItem(ZOOM_KEY, String(level))
    } catch {
      // Not remembered next time.
    }
    track.applyConstraints({ advanced: [{ zoom: level } as MediaTrackConstraintSet] }).catch(() => {})
  }

  // Tap to focus: asks the camera to focus on the tapped spot. Cameras that can't do this ignore it.
  function focusAt(clientX: number, clientY: number) {
    const track = trackRef.current
    const video = videoRef.current
    if (!track || !video?.videoWidth) return
    const point = screenToVideoPoint(clientX, clientY, video)
    setFocusPoint((current) => ({ x: clientX, y: clientY, id: (current?.id ?? 0) + 1 }))
    const modes = (track.getCapabilities?.() as Capabilities | undefined)?.focusMode ?? []
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

  return { videoRef, ready, canFocus, tapToFocus, focusPoint, zoomSteps, zoom, setZoom }
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
