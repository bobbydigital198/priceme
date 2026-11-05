import { useEffect, useRef, useState } from 'react'
import { ReadingProgress } from '../components/ReadingProgress'
import { TagIcon } from '../components/TagIcon'
import { FocusRing } from '../components/FocusRing'
import { frameToVideoCrop, videoCropToPhoto } from '../lib/crop'
import type { Product, Scan } from '../lib/db'
import { cropToCanvas } from '../lib/imageProcessing'
import { getOcrWorker, readPriceTag, type TagReading } from '../lib/ocr'
import { useRearCamera } from '../lib/useRearCamera'
import { ConfirmPrice } from './ConfirmPrice'

type Props = { product: Product; onCancel: () => void; onSave: (scan: Scan) => void }

type Step =
  | { kind: 'camera' }
  | { kind: 'camera-error'; message: string }
  | { kind: 'reading'; progress: number }
  // No reading means the price is typed by hand.
  | { kind: 'confirm'; reading?: TagReading }

const STEP_LABEL = 'Step 2 of 2: scan the price tag'

export function PriceScan({ product, onCancel, onSave }: Props) {
  const [step, setStep] = useState<Step>({ kind: 'camera' })

  useEffect(() => {
    // Warm up the reader while you line up the photo.
    getOcrWorker().catch(() => {})
  }, [])

  async function read(tag: HTMLCanvasElement) {
    setStep({ kind: 'reading', progress: 0 })
    try {
      const reading = await readPriceTag(tag, (progress) => setStep({ kind: 'reading', progress }))
      setStep({ kind: 'confirm', reading })
    } catch {
      // The reader failed to start; typing the price still works.
      setStep({ kind: 'confirm' })
    }
  }

  if (step.kind === 'camera') {
    return (
      <TagCamera
        onCancel={onCancel}
        onCapture={read}
        onManual={() => setStep({ kind: 'confirm' })}
        onError={(message) => setStep({ kind: 'camera-error', message })}
      />
    )
  }

  if (step.kind === 'confirm') {
    return (
      <ConfirmPrice
        product={product}
        reading={step.reading}
        onSave={onSave}
        onRetake={() => setStep({ kind: 'camera' })}
        onCancel={onCancel}
      />
    )
  }

  return (
    <main className="screen">
      <div className="step-header">
        <button type="button" className="back-button" onClick={onCancel}>
          Cancel
        </button>
        <p className="step-label">{STEP_LABEL}</p>
        <p className="product-sub">{product.name}</p>
      </div>

      {step.kind === 'camera-error' && (
        <section className="card">
          <h2>Camera unavailable</h2>
          <p>{step.message}</p>
          <div className="button-row">
            <button type="button" className="primary-button" onClick={() => setStep({ kind: 'camera' })}>
              Try again
            </button>
            <button type="button" className="secondary-button" onClick={() => setStep({ kind: 'confirm' })}>
              Enter manually
            </button>
          </div>
        </section>
      )}

      {step.kind === 'reading' && <ReadingProgress progress={step.progress} />}
    </main>
  )
}

type CameraProps = {
  onCancel: () => void
  onCapture: (tag: HTMLCanvasElement) => void
  onManual: () => void
  onError: (message: string) => void
}

function TagCamera({ onCancel, onCapture, onManual, onError }: CameraProps) {
  const { videoRef, ready, canFocus, tapToFocus, focusPoint, takePhoto } = useRearCamera(onError)
  const frameRef = useRef<HTMLDivElement>(null)
  const [capturing, setCapturing] = useState(false)

  async function capture() {
    const video = videoRef.current
    const frame = frameRef.current
    if (!video || !frame || !video.videoWidth || capturing) return
    const videoSize = { width: video.videoWidth, height: video.videoHeight }
    const crop = frameToVideoCrop(videoSize, video.getBoundingClientRect(), frame.getBoundingClientRect())
    // The live view is kept as a backup in case a full photo can't be taken.
    const fromView = cropToCanvas(video, crop.sx, crop.sy, crop.sw, crop.sh)
    navigator.vibrate?.(40)
    setCapturing(true)

    const photo = await takePhoto()
    const photoCrop = photo && videoCropToPhoto(crop, videoSize, photo)
    const tag = photo && photoCrop ? cropToCanvas(photo, photoCrop.sx, photoCrop.sy, photoCrop.sw, photoCrop.sh) : fromView
    photo?.close()
    onCapture(tag)
  }

  return (
    <main className="camera-screen">
      <video ref={videoRef} className="camera-video" playsInline muted autoPlay />
      <div className="camera-overlay" onPointerUp={tapToFocus}>
        <div className="camera-top">
          <button type="button" className="camera-button" onClick={onCancel}>
            Cancel
          </button>
          <p className="camera-label">{STEP_LABEL}</p>
        </div>
        <div ref={frameRef} className="tag-frame">
          <TagIcon className="tag-guide" />
        </div>
        <div className="camera-bottom">
          <p className="camera-hint">
            {capturing ? 'Taking the photo…' : `Fill the frame with the tag and hold steady.${canFocus ? ' Tap the screen to focus.' : ''}`}
          </p>
          <button type="button" className="shutter" onClick={capture} disabled={!ready || capturing} aria-label="Take photo" />
          <button type="button" className="camera-button" onClick={onManual}>
            Enter manually
          </button>
        </div>
      </div>
      <FocusRing key={focusPoint?.id} point={focusPoint} />
    </main>
  )
}
