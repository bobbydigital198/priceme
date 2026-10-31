import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { ReadingProgress } from '../components/ReadingProgress'
import { ReadingResult } from '../components/ReadingResult'
import { cropToCanvas } from '../lib/imageProcessing'
import { getOcrWorker, readPriceTag, type TagReading } from '../lib/ocr'

type Props = { onBack: () => void }
type Box = { x: number; y: number; width: number; height: number }

const MIN_BOX = 20

// Try the price reader on photos from the gallery, without going to a shop.
export function OcrTest({ onBack }: Props) {
  const [imageUrl, setImageUrl] = useState<string>()
  const [box, setBox] = useState<Box>()
  const [progress, setProgress] = useState<number>()
  const [reading, setReading] = useState<TagReading>()
  const [failed, setFailed] = useState(false)
  const imageRef = useRef<HTMLImageElement>(null)
  const dragStart = useRef<{ x: number; y: number }>(undefined)

  useEffect(() => {
    getOcrWorker().catch(() => {})
  }, [])

  useEffect(() => () => (imageUrl ? URL.revokeObjectURL(imageUrl) : undefined), [imageUrl])

  function choose(file: File | undefined) {
    if (!file) return
    setImageUrl(URL.createObjectURL(file))
    setBox(undefined)
    setReading(undefined)
    setFailed(false)
  }

  function pointAt(event: PointerEvent) {
    const rect = imageRef.current!.getBoundingClientRect()
    return {
      x: Math.min(Math.max(event.clientX - rect.left, 0), rect.width),
      y: Math.min(Math.max(event.clientY - rect.top, 0), rect.height),
    }
  }

  function onPointerDown(event: PointerEvent) {
    event.currentTarget.setPointerCapture(event.pointerId)
    dragStart.current = pointAt(event)
    setBox(undefined)
  }

  function onPointerMove(event: PointerEvent) {
    const start = dragStart.current
    if (!start) return
    const p = pointAt(event)
    setBox({ x: Math.min(start.x, p.x), y: Math.min(start.y, p.y), width: Math.abs(p.x - start.x), height: Math.abs(p.y - start.y) })
  }

  function onPointerUp() {
    dragStart.current = undefined
    setBox((b) => (b && b.width >= MIN_BOX && b.height >= MIN_BOX ? b : undefined))
  }

  async function read() {
    const image = imageRef.current
    if (!image) return
    const scale = image.naturalWidth / image.getBoundingClientRect().width
    const area = box ?? { x: 0, y: 0, width: image.naturalWidth / scale, height: image.naturalHeight / scale }
    const tag = cropToCanvas(image, area.x * scale, area.y * scale, area.width * scale, area.height * scale)

    setReading(undefined)
    setFailed(false)
    setProgress(0)
    try {
      setReading(await readPriceTag(tag, setProgress))
    } catch {
      setFailed(true)
    } finally {
      setProgress(undefined)
    }
  }

  return (
    <main className="screen">
      <button type="button" className="back-button" onClick={onBack}>
        Back
      </button>
      <h1 className="product-name">Test the price reader</h1>
      <p className="product-sub">
        Choose a photo of a shelf price tag from your gallery. Drag a box around the tag for the best result, or leave it to
        read the whole photo.
      </p>

      <label className="primary-button file-button">
        {imageUrl ? 'Choose another photo' : 'Choose a photo'}
        <input type="file" accept="image/*" onChange={(e) => choose(e.target.files?.[0])} />
      </label>

      {imageUrl && (
        <>
          <div className="crop-area" onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp}>
            <img ref={imageRef} src={imageUrl} alt="The chosen photo" draggable={false} />
            {box && <div className="crop-box" style={{ left: box.x, top: box.y, width: box.width, height: box.height }} />}
          </div>
          <div className="button-row">
            <button type="button" className="primary-button" onClick={read} disabled={progress !== undefined}>
              {box ? 'Read the price in the box' : 'Read the whole photo'}
            </button>
            {box && (
              <button type="button" className="secondary-button" onClick={() => setBox(undefined)}>
                Clear the box
              </button>
            )}
          </div>
        </>
      )}

      <div className="test-output">
        {progress !== undefined && <ReadingProgress progress={progress} />}
        {failed && (
          <section className="card">
            <h2>The price reader didn't start</h2>
            <p>Close PriceMe completely and open it again.</p>
          </section>
        )}
        {reading && <ReadingResult reading={reading} />}
      </div>
    </main>
  )
}
