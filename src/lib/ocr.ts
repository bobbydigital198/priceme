// On-device text recognition with Tesseract.js. Nothing is sent anywhere: the engine and
// French/English language data are bundled with the app (see scripts/copy-ocr-assets.mjs).
import { createWorker, OEM, PSM, type Page, type Worker } from 'tesseract.js'
import { adaptiveThreshold, grayToCanvas, makeThumbnail, stretchContrast, toGray } from './imageProcessing'
import { parsePriceTag, type Confidence, type OcrLine, type OcrWord, type ParseResult } from './priceParser'

export type TagReading = {
  parsed: ParseResult
  rawText: string
  // The colour tag photo, small, for saving with the scan.
  thumbnail: string
  // What Tesseract actually saw after clean-up, for checking problems.
  processedImage: string
  durationMs: number
}

let workerPromise: Promise<Worker> | undefined
let onProgress: ((fraction: number) => void) | undefined

const assetUrl = (file = '') => new URL(`ocr/${file}`, document.baseURI).href

// Starts the OCR engine. Call early (e.g. when the camera opens) so it's ready by the time a photo is taken.
export function getOcrWorker(): Promise<Worker> {
  workerPromise ??= createWorker(['fra', 'eng'], OEM.LSTM_ONLY, {
    workerPath: assetUrl('worker.min.js'),
    corePath: assetUrl(),
    langPath: assetUrl().replace(/\/$/, ''),
    gzip: true,
    // The service worker already keeps these files offline, so don't store a second copy.
    cacheMethod: 'none',
    logger: (message) => {
      if (message.status === 'recognizing text') onProgress?.(message.progress)
    },
  }).then(async (worker) => {
    await worker.setParameters({
      // Price tags are scattered blocks of text rather than paragraphs.
      tessedit_pageseg_mode: PSM.SPARSE_TEXT,
      user_defined_dpi: '300',
    })
    return worker
  })
  workerPromise.catch(() => (workerPromise = undefined))
  return workerPromise
}

type TesseractWord = Page['blocks'] extends (infer B)[] | null
  ? B extends { paragraphs: { lines: { words: (infer W)[] }[] }[] }
    ? W
    : never
  : never

const allWords = (page: Page) => (page.blocks ?? []).flatMap((b) => b.paragraphs.flatMap((p) => p.lines.flatMap((l) => l.words)))
const heightOf = (box: { y0: number; y1: number }) => box.y1 - box.y0

// Converts Tesseract's output for the parser, optionally swapping one word for others.
export function toLines(page: Page, swap?: { word: TesseractWord; with: OcrWord[] }): OcrLine[] {
  return (page.blocks ?? []).flatMap((block) =>
    block.paragraphs.flatMap((paragraph) =>
      paragraph.lines.map((line) => ({
        words: line.words.flatMap((w) =>
          w === swap?.word ? swap.with : [{ text: w.text, height: heightOf(w.bbox), confidence: w.confidence }],
        ),
      })),
    ),
  )
}

// Tags often print big euros with small cents beside them ("2⁸⁹ €"), and Tesseract tends to read
// that as one garbled word like "2°". This keeps the big digits as the euros and re-reads the area
// to their right on its own, where the cents come out cleanly.
export async function recoverSplitPrice(
  worker: Worker,
  image: Parameters<Worker['recognize']>[0],
  size: { width: number; height: number },
  page: Page,
): Promise<OcrLine[] | null> {
  const words = allWords(page)
  if (!words.length) return null
  const word = words.reduce((a, b) => (heightOf(b.bbox) > heightOf(a.bbox) ? b : a))

  const tallestSymbol = Math.max(...word.symbols.map((s) => heightOf(s.bbox)))
  const euros = []
  for (const symbol of word.symbols) {
    if (!/\d/.test(symbol.text) || heightOf(symbol.bbox) < tallestSymbol * 0.8) break
    euros.push(symbol)
  }
  if (euros.length < 1 || euros.length > 2) return null

  const wordHeight = heightOf(word.bbox)
  const left = euros[euros.length - 1].bbox.x1 + 1
  const rectangle = {
    left,
    top: word.bbox.y0,
    width: Math.min(size.width - left, Math.round(wordHeight * 1.2)),
    height: Math.min(size.height - word.bbox.y0, wordHeight),
  }
  if (rectangle.width < 8) return null

  await worker.setParameters({ tessedit_pageseg_mode: PSM.SINGLE_BLOCK })
  let beside: Page
  try {
    beside = (await worker.recognize(image, { rectangle }, { blocks: true })).data
  } finally {
    await worker.setParameters({ tessedit_pageseg_mode: PSM.SPARSE_TEXT })
  }

  const centsWords = allWords(beside).map((w) => ({ text: w.text, height: heightOf(w.bbox), confidence: w.confidence }))
  if (!centsWords.length) return null
  const eurosWord = {
    text: euros.map((s) => s.text).join(''),
    height: wordHeight,
    confidence: Math.min(...euros.map((s) => s.confidence)),
  }
  return toLines(page, { word, with: [eurosWord, ...centsWords] })
}

const RANK: Record<Confidence, number> = { none: 0, low: 1, medium: 2, high: 3 }

// Reads a cropped photo of a price tag.
export async function readPriceTag(tag: HTMLCanvasElement, progress?: (fraction: number) => void): Promise<TagReading> {
  const started = performance.now()
  const worker = await getOcrWorker()

  const gray = stretchContrast(toGray(tag))
  const binary = grayToCanvas(adaptiveThreshold(gray))

  async function attempt(image: HTMLCanvasElement, from: number, to: number) {
    onProgress = (fraction) => progress?.(from + fraction * (to - from))
    const { data } = await worker.recognize(image, {}, { blocks: true, text: true })
    return { parsed: parsePriceTag(toLines(data)), rawText: data.text, image, page: data }
  }

  const unsure = (result: { parsed: ParseResult }) => RANK[result.parsed.confidence] < RANK.medium

  try {
    let best = await attempt(binary, 0, 0.5)
    // Thresholding sometimes destroys thin or coloured text, so try the plain grayscale image too.
    if (unsure(best)) {
      const second = await attempt(grayToCanvas(gray), 0.5, 0.85)
      if (RANK[second.parsed.confidence] > RANK[best.parsed.confidence]) best = second
    }
    if (unsure(best)) {
      onProgress = undefined
      const lines = await recoverSplitPrice(worker, best.image, best.image, best.page)
      const recovered = lines && parsePriceTag(lines)
      if (recovered && RANK[recovered.confidence] > RANK[best.parsed.confidence]) best = { ...best, parsed: recovered }
    }
    progress?.(1)

    return {
      parsed: best.parsed,
      rawText: best.rawText,
      thumbnail: makeThumbnail(tag),
      processedImage: makeThumbnail(best.image, 800, 0.7),
      durationMs: performance.now() - started,
    }
  } finally {
    onProgress = undefined
  }
}
