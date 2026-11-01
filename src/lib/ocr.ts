// On-device text recognition with Tesseract.js. Nothing is sent anywhere: the engine and
// French/English language data are bundled with the app (see scripts/copy-ocr-assets.mjs).
import { createWorker, OEM, PSM, type Page, type Worker } from 'tesseract.js'
import { adaptiveThreshold, darkTextOnLight, grayToCanvas, makeThumbnail, stretchContrast, toGray, type GrayImage } from './imageProcessing'
import { parsePriceTag, type Confidence, type OcrLine, type OcrWord, type ParseResult } from './priceParser'
import { findPriceRegions, type PriceRegion, type Region } from './priceRegion'

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
  // Black-and-white version of the image, used to find the gap after the big digits.
  binary?: GrayImage,
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
  // Tesseract sometimes stretches the last digit's box over the cents too, so find where the
  // digit really ends: the first blank pixel column, or failing that 0.8 times its height.
  const last = euros[euros.length - 1].bbox
  const digitHeight = heightOf(last)
  let right = Math.min(last.x1, last.x0 + digitHeight * 0.8)
  if (binary) {
    const blank = (x: number) => {
      for (let y = last.y0; y < last.y1; y++) if (binary.pixels[y * binary.width + x] === 0) return false
      return true
    }
    for (let x = Math.round(last.x0 + digitHeight * 0.3); x < Math.min(last.x1, binary.width); x++) {
      if (blank(x)) {
        right = x
        break
      }
    }
  }
  const left = Math.round(right) + 1
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

// Reads the big digits and the small cents beside them separately, then joins them into one line
// for the parser. Tesseract misreads a big digit and small text in the same box, but reads each
// well on its own. Only price characters are allowed, so a small "€" can't become a "9".
async function readRegion(worker: Worker, image: HTMLCanvasElement, region: PriceRegion) {
  const read = async (rectangle: Region, mode: PSM) => {
    if (rectangle.width < 8 || rectangle.height < 8) return [] as OcrWord[]
    await worker.setParameters({ tessedit_pageseg_mode: mode })
    const { data } = await worker.recognize(image, { rectangle }, { blocks: true })
    return toLines(data).flatMap((line) => line.words)
  }

  await worker.setParameters({ tessedit_char_whitelist: '0123456789,.€' })
  try {
    const words = [...(await read(region.digits, PSM.SINGLE_LINE)), ...(await read(region.beside, PSM.SINGLE_BLOCK))]
    // Tesseract scores digit-only reads low even when right. Finding a big digit with smaller
    // ones beside it is good evidence in itself, so count these as "fairly sure", never more.
    const steady = words.map((w) => ({ ...w, confidence: 60 }))
    return { parsed: parsePriceTag([{ words: steady }]), text: words.map((w) => w.text).join(' ') }
  } finally {
    await worker.setParameters({ tessedit_pageseg_mode: PSM.SPARSE_TEXT, tessedit_char_whitelist: '' })
  }
}

// Ways of preparing the photo, tried in order until one gives a confident price.
// Real photos read best as plain grayscale at a moderate size: huge digits confuse Tesseract,
// and black-and-white thresholding tends to damage them, so that is the last resort.
const PASSES = [
  { width: 900, threshold: false },
  { width: 1600, threshold: false },
  { width: 1600, threshold: true },
]

// Reads a cropped photo of a price tag.
export async function readPriceTag(tag: HTMLCanvasElement, progress?: (fraction: number) => void): Promise<TagReading> {
  const started = performance.now()
  const worker = await getOcrWorker()
  const unsure = (parsed: ParseResult) => RANK[parsed.confidence] < RANK.medium

  let best: { parsed: ParseResult; rawText: string; image: HTMLCanvasElement } | undefined
  try {
    for (const [i, pass] of PASSES.entries()) {
      const gray = darkTextOnLight(stretchContrast(toGray(tag, pass.width)))
      const prepared = pass.threshold ? adaptiveThreshold(gray) : gray
      const image = grayToCanvas(prepared)

      onProgress = (fraction) => progress?.((i + fraction) / PASSES.length)
      const { data } = await worker.recognize(image, {}, { blocks: true, text: true })
      onProgress = undefined
      let parsed = parsePriceTag(toLines(data))
      let rawText = data.text
      // Black-and-white map for finding where things are; handles shadows across the tag.
      const binary = pass.threshold ? prepared : adaptiveThreshold(gray)

      // Always read the biggest text on its own too: Tesseract's layout step can skip the price,
      // or pair cents with digits from another line. The biggest text is the selling price,
      // so when that read is reasonably sure it wins.
      for (const region of findPriceRegions(binary)) {
        const found = await readRegion(worker, image, region)
        rawText += `\n[price area] ${found.text}`
        if (found.parsed.price === undefined) continue
        const fullRead = parsed
        const otherPrices = unsure(fullRead) ? [] : [fullRead.price, ...fullRead.alternatives]
        const merged: ParseResult = {
          ...found.parsed,
          // The unit price is small text elsewhere on the tag, so keep it from the full read.
          unitPrice: found.parsed.unitPrice ?? fullRead.unitPrice,
          unitBasis: found.parsed.unitBasis ?? fullRead.unitBasis,
          alternatives: [...new Set([...found.parsed.alternatives, ...otherPrices.filter((p): p is number => p !== undefined && p !== found.parsed.price)])],
        }
        if (!unsure(merged) || RANK[merged.confidence] > RANK[fullRead.confidence]) {
          parsed = merged
          if (!unsure(merged)) break
        }
      }

      if (unsure(parsed)) {
        const lines = await recoverSplitPrice(worker, image, image, data, binary)
        const recovered = lines && parsePriceTag(lines)
        if (recovered && RANK[recovered.confidence] > RANK[parsed.confidence]) parsed = recovered
      }

      if (!best || RANK[parsed.confidence] > RANK[best.parsed.confidence]) best = { parsed, rawText, image }
      if (!unsure(best.parsed)) break
    }
    progress?.(1)

    return {
      parsed: best!.parsed,
      rawText: best!.rawText,
      thumbnail: makeThumbnail(tag),
      processedImage: makeThumbnail(best!.image, 800, 0.7),
      durationMs: performance.now() - started,
    }
  } finally {
    onProgress = undefined
  }
}
