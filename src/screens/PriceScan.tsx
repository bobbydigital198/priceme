import { useEffect, useRef, useState } from 'react'
import { ReadingProgress } from '../components/ReadingProgress'
import { ReadingResult } from '../components/ReadingResult'
import { TagIcon } from '../components/TagIcon'
import { frameToVideoCrop } from '../lib/crop'
import type { Product } from '../lib/db'
import { cropToCanvas } from '../lib/imageProcessing'
import { getOcrWorker, readPriceTag, type TagReading } from '../lib/ocr'
import { useRearCamera } from '../lib/useRearCamera'

type Props = { product: Product; onCancel: () => void; onDone: () => void }

type Step =
  | { kind: 'camera' }
  | { kind: 'camera-error'; message: string }
  | { kind: 'reading'; progress: number }
  | { kind: 'result'; reading: TagReading }
  | { kind: 'failed' }

const STEP_LABEL = 'Step 2 of 2: scan the price tag'

export function PriceScan({ product, onCancel, onDone }: Props) {
  const [step, setStep] = useState<Step>({ kind: 'camera' })

  useEffect(() => {
    // Warm up the reader while you line up the photo.
    getOcrWorker().catch(() => {})
  }, [])

  async function read(tag: HTMLCanvasElement) {
    setStep({ kind: 'reading', progress: 0 })
    try {
      const reading = await readPriceTag(tag, (progress) => setStep({ kind: 'reading', progress }))
      setStep({ kind: 'result', reading })
    } catch {
      setStep({ kind: 'failed' })
    }
  }

  if (step.kind === 'camera') {
    return <TagCamera onCancel={onCancel} onCapture={read} onError={(message) => setStep({ kind: 'camera-error', message })} />
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
          </div>
        </section>
      )}

      {step.kind === 'reading' && <ReadingProgress progress={step.progress} />}

      {step.kind === 'failed' && (
        <section className="card">
          <h2>The price reader didn't start</h2>
          <p>Close PriceMe completely and open it again. If it keeps happening, let me know.</p>
          <div className="button-row">
            <button type="button" className="primary-button" onClick={() => setStep({ kind: 'camera' })}>
              Retake photo
            </button>
          </div>
        </section>
      )}

      {step.kind === 'result' && (
        <>
          <ReadingResult reading={step.reading} product={product} />
          <p className="placeholder-note">Editing and saving the price arrive in stage 5.</p>
          <div className="button-row">
            <button type="button" className="primary-button" onClick={() => setStep({ kind: 'camera' })}>
              Retake photo
            </button>
            <button type="button" className="secondary-button" onClick={onDone}>
              Back to home
            </button>
          </div>
        </>
      )}
    </main>
  )
}

type CameraProps = { onCancel: () => void; onCapture: (tag: HTMLCanvasElement) => void; onError: (message: string) => void }

function TagCamera({ onCancel, onCapture, onError }: CameraProps) {
  const { videoRef, ready } = useRearCamera(onError)
  const frameRef = useRef<HTMLDivElement>(null)

  function capture() {
    const video = videoRef.current
    const frame = frameRef.current
    if (!video || !frame || !video.videoWidth) return
    const { sx, sy, sw, sh } = frameToVideoCrop(
      { width: video.videoWidth, height: video.videoHeight },
      video.getBoundingClientRect(),
      frame.getBoundingClientRect(),
    )
    navigator.vibrate?.(40)
    onCapture(cropToCanvas(video, sx, sy, sw, sh))
  }

  return (
    <main className="camera-screen">
      <video ref={videoRef} className="camera-video" playsInline muted autoPlay />
      <div className="camera-overlay">
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
          <p className="camera-hint">Fill the frame with the tag and hold steady.</p>
          <button type="button" className="shutter" onClick={capture} disabled={!ready} aria-label="Take photo" />
        </div>
      </div>
    </main>
  )
}
