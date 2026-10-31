// Barcode reading: the phone's built-in scanner where available, ZXing as a backup.
// The pure helpers at the top are covered by barcode.test.ts.

export type BarcodeFormatName = 'ean_13' | 'ean_8' | 'upc_a' | 'upc_e'

const FORMATS: BarcodeFormatName[] = ['ean_13', 'ean_8', 'upc_a', 'upc_e']

// Standard GTIN check digit, used by EAN-13, EAN-8 and UPC-A.
export function gtinCheckDigit(body: string): number {
  let sum = 0
  for (let i = 0; i < body.length; i++) {
    const digit = Number(body[body.length - 1 - i])
    sum += i % 2 === 0 ? digit * 3 : digit
  }
  return (10 - (sum % 10)) % 10
}

export function hasValidCheckDigit(code: string): boolean {
  return /^\d{8,14}$/.test(code) && gtinCheckDigit(code.slice(0, -1)) === Number(code.at(-1))
}

// Expands an 8-digit UPC-E (number system, 6 digits, check digit) to 12-digit UPC-A.
export function expandUpcE(upcE: string): string | null {
  if (!/^[01]\d{7}$/.test(upcE)) return null
  const [d1, d2, d3, d4, d5, d6] = upcE.slice(1, 7)
  let body: string
  if ('012'.includes(d6)) body = d1 + d2 + d6 + '0000' + d3 + d4 + d5
  else if (d6 === '3') body = d1 + d2 + d3 + '00000' + d4 + d5
  else if (d6 === '4') body = d1 + d2 + d3 + d4 + '00000' + d5
  else body = d1 + d2 + d3 + d4 + d5 + '0000' + d6
  return upcE[0] + body + upcE[7]
}

function fromUpcE(code: string): string | null {
  // Some scanners drop the number system and/or the check digit.
  const withSystem = code.length === 6 ? '0' + code : code
  if (withSystem.length !== 7 && withSystem.length !== 8) return null
  const expanded = expandUpcE(withSystem.slice(0, 7) + '0')
  if (!expanded) return null
  const body = expanded.slice(0, 11)
  const upcA = body + gtinCheckDigit(body)
  if (withSystem.length === 8 && withSystem[7] !== upcA[11]) return null
  return '0' + upcA
}

// Turns a scanned or typed barcode into the form we store it under, or null if it isn't valid.
// UPC-A and UPC-E become 13-digit EAN-13, so the same product always gets the same key.
export function normaliseBarcode(raw: string, format?: BarcodeFormatName): string | null {
  const code = raw.replace(/[\s-]/g, '')
  if (!/^\d+$/.test(code)) return null

  if (format === 'upc_e') return fromUpcE(code)

  switch (code.length) {
    case 8:
      if (hasValidCheckDigit(code)) return code
      return fromUpcE(code)
    case 12:
      return hasValidCheckDigit(code) ? '0' + code : null
    case 13:
      return hasValidCheckDigit(code) ? code : null
    default:
      return null
  }
}

// ---- Live scanning ----

export type Detection = { rawValue: string; format?: BarcodeFormatName }
export type Detector = (video: HTMLVideoElement) => Promise<Detection | null>

type NativeDetector = { detect(source: CanvasImageSource): Promise<{ rawValue: string; format: string }[]> }
type NativeDetectorClass = {
  new (options: { formats: string[] }): NativeDetector
  getSupportedFormats(): Promise<string[]>
}

async function createNativeDetector(): Promise<Detector | null> {
  const NativeBarcodeDetector = (globalThis as { BarcodeDetector?: NativeDetectorClass }).BarcodeDetector
  if (!NativeBarcodeDetector) return null

  const supported = await NativeBarcodeDetector.getSupportedFormats().catch(() => [] as string[])
  const formats = FORMATS.filter((f) => supported.includes(f))
  if (!formats.includes('ean_13')) return null

  const detector = new NativeBarcodeDetector({ formats })
  return async (video) => {
    const [first] = await detector.detect(video)
    return first ? { rawValue: first.rawValue, format: first.format as BarcodeFormatName } : null
  }
}

async function createZxingDetector(): Promise<Detector> {
  // Loaded only when needed, so phones with a built-in scanner never download it.
  const [{ BrowserMultiFormatOneDReader }, { BarcodeFormat, DecodeHintType }] = await Promise.all([
    import('@zxing/browser'),
    import('@zxing/library'),
  ])

  const names = new Map<number, BarcodeFormatName>([
    [BarcodeFormat.EAN_13, 'ean_13'],
    [BarcodeFormat.EAN_8, 'ean_8'],
    [BarcodeFormat.UPC_A, 'upc_a'],
    [BarcodeFormat.UPC_E, 'upc_e'],
  ])
  const hints = new Map([[DecodeHintType.POSSIBLE_FORMATS, [...names.keys()]]])
  const reader = new BrowserMultiFormatOneDReader(hints)
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d', { willReadFrequently: true })

  return async (video) => {
    if (!context || !video.videoWidth) return null
    // Smaller frames decode faster and barcodes stay readable.
    const scale = Math.min(1, 1280 / video.videoWidth)
    canvas.width = Math.round(video.videoWidth * scale)
    canvas.height = Math.round(video.videoHeight * scale)
    context.drawImage(video, 0, 0, canvas.width, canvas.height)
    try {
      const result = reader.decodeFromCanvas(canvas)
      return { rawValue: result.getText(), format: names.get(result.getBarcodeFormat()) }
    } catch {
      return null
    }
  }
}

export async function createDetector(): Promise<Detector> {
  return (await createNativeDetector().catch(() => null)) ?? createZxingDetector()
}
