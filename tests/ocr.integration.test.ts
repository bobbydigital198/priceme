// Runs the real OCR engine on drawn price tags, end to end with the parser.
// Slower than the other tests (a few seconds), because Tesseract actually reads the images.
import { copyFileSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createWorker, OEM, PSM, type Worker } from 'tesseract.js'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { recoverSplitPrice, toLines } from '../src/lib/ocr'
import { parsePriceTag } from '../src/lib/priceParser'

let worker: Worker

beforeAll(async () => {
  const langPath = mkdtempSync(join(tmpdir(), 'priceme-ocr-'))
  for (const lang of ['fra', 'eng']) {
    copyFileSync(`node_modules/@tesseract.js-data/${lang}/4.0.0_best_int/${lang}.traineddata.gz`, join(langPath, `${lang}.traineddata.gz`))
  }
  worker = await createWorker(['fra', 'eng'], OEM.LSTM_ONLY, { langPath, gzip: true, cacheMethod: 'none' })
  await worker.setParameters({ tessedit_pageseg_mode: PSM.SPARSE_TEXT, user_defined_dpi: '300' })
}, 60_000)

afterAll(() => worker?.terminate())

// Same steps as readPriceTag, minus the browser-only image clean-up.
async function readTag(file: string) {
  const path = `tests/fixtures/${file}`
  const { data } = await worker.recognize(path, {}, { blocks: true })
  const parsed = parsePriceTag(toLines(data))
  if (parsed.confidence === 'high' || parsed.confidence === 'medium') return parsed
  const lines = await recoverSplitPrice(worker, path, { width: 900, height: 600 }, data)
  return lines ? parsePriceTag(lines) : parsed
}

describe('reading drawn price tags', () => {
  it('reads big euros with small cents', async () => {
    const result = await readTag('tag-split-cents.png')
    expect(result.price).toBe(2.89)
    expect(result.unitPrice).toBe(11.56)
    expect(result.unitBasis).toBe('kg')
    expect(['high', 'medium']).toContain(result.confidence)
  }, 30_000)

  it('reads a white-on-red promotion and spots the old price', async () => {
    const result = await readTag('tag-promo-red.png')
    expect(result.price).toBe(1.79)
    expect(result.unitPrice).toBe(3.58)
    expect(result.alternatives).toContain(2.49)
  }, 30_000)
})
