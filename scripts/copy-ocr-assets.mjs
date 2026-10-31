// Copies Tesseract's worker, engine and French/English language data into public/ocr,
// so text recognition runs offline instead of downloading them from a CDN.
// Runs automatically before `npm run dev` and `npm run build`.
import { copyFileSync, mkdirSync } from 'node:fs'

const out = 'public/ocr'
const files = [
  ['node_modules/tesseract.js/dist/worker.min.js', 'worker.min.js'],
  // Only the LSTM engines are needed; Tesseract picks the fastest one the phone supports.
  ['node_modules/tesseract.js-core/tesseract-core-lstm.wasm.js', 'tesseract-core-lstm.wasm.js'],
  ['node_modules/tesseract.js-core/tesseract-core-simd-lstm.wasm.js', 'tesseract-core-simd-lstm.wasm.js'],
  ['node_modules/tesseract.js-core/tesseract-core-relaxedsimd-lstm.wasm.js', 'tesseract-core-relaxedsimd-lstm.wasm.js'],
  ['node_modules/@tesseract.js-data/fra/4.0.0_best_int/fra.traineddata.gz', 'fra.traineddata.gz'],
  ['node_modules/@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz', 'eng.traineddata.gz'],
]

mkdirSync(out, { recursive: true })
for (const [from, to] of files) copyFileSync(from, `${out}/${to}`)
console.log(`Copied ${files.length} OCR files to ${out}`)
