// Image clean-up before OCR: resize, grayscale, contrast boost, dark-on-light and thresholding.

const MAX_UPSCALE = 3

export type GrayImage = { pixels: Uint8ClampedArray; width: number; height: number }

export function createCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(width))
  canvas.height = Math.max(1, Math.round(height))
  return canvas
}

function context2d(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) throw new Error('Canvas is not available')
  return context
}

// Copies part of an image, video frame or canvas onto a new canvas.
export function cropToCanvas(source: CanvasImageSource, sx: number, sy: number, sw: number, sh: number): HTMLCanvasElement {
  const canvas = createCanvas(sw, sh)
  context2d(canvas).drawImage(source, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height)
  return canvas
}

// Resizes to the given width (at most 3x enlargement) and converts to grayscale.
export function toGray(source: HTMLCanvasElement, width: number): GrayImage {
  const scale = Math.min(MAX_UPSCALE, width / source.width)
  const canvas = createCanvas(source.width * scale, source.height * scale)
  const context = context2d(canvas)
  context.imageSmoothingQuality = 'high'
  context.drawImage(source, 0, 0, canvas.width, canvas.height)

  const { data } = context.getImageData(0, 0, canvas.width, canvas.height)
  const pixels = new Uint8ClampedArray(canvas.width * canvas.height)
  for (let i = 0; i < pixels.length; i++) {
    pixels[i] = 0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2]
  }
  return { pixels, width: canvas.width, height: canvas.height }
}

// Stretches the darkest 1% to black and the brightest 1% to white.
export function stretchContrast(image: GrayImage): GrayImage {
  const histogram = new Uint32Array(256)
  for (const p of image.pixels) histogram[p]++

  const cut = image.pixels.length * 0.01
  let low = 0
  let below = histogram[0]
  while (low < 255 && below < cut) below += histogram[++low]
  let high = 255
  let above = histogram[255]
  while (high > 0 && above < cut) above += histogram[--high]
  if (high <= low) return image

  const pixels = image.pixels.map((p) => ((p - low) * 255) / (high - low))
  return { ...image, pixels }
}

// White text on a red or dark tag: flip so the text is dark on light, which Tesseract needs.
export function darkTextOnLight(image: GrayImage): GrayImage {
  let total = 0
  for (const p of image.pixels) total += p
  if (total / image.pixels.length >= 128) return image
  return { ...image, pixels: image.pixels.map((p) => 255 - p) }
}

// Bradley adaptive threshold: each pixel is compared with the average of its neighbourhood,
// which copes with shadows and glare across the tag. Output is black text on white.
export function adaptiveThreshold(image: GrayImage, sensitivity = 0.15): GrayImage {
  const { pixels, width, height } = image
  const integral = new Float64Array((width + 1) * (height + 1))
  for (let y = 0; y < height; y++) {
    let rowSum = 0
    for (let x = 0; x < width; x++) {
      rowSum += pixels[y * width + x]
      integral[(y + 1) * (width + 1) + x + 1] = integral[y * (width + 1) + x + 1] + rowSum
    }
  }

  const half = Math.max(8, Math.round(width / 16))
  const out = new Uint8ClampedArray(pixels.length)
  let black = 0
  for (let y = 0; y < height; y++) {
    const y0 = Math.max(0, y - half)
    const y1 = Math.min(height, y + half + 1)
    for (let x = 0; x < width; x++) {
      const x0 = Math.max(0, x - half)
      const x1 = Math.min(width, x + half + 1)
      const area = (x1 - x0) * (y1 - y0)
      const sum = integral[y1 * (width + 1) + x1] - integral[y0 * (width + 1) + x1] - integral[y1 * (width + 1) + x0] + integral[y0 * (width + 1) + x0]
      const isDark = pixels[y * width + x] * area <= sum * (1 - sensitivity)
      out[y * width + x] = isDark ? 0 : 255
      if (isDark) black++
    }
  }

  // Light text on a dark or coloured promo tag: flip so the text is dark, which Tesseract prefers.
  if (black > out.length / 2) for (let i = 0; i < out.length; i++) out[i] = 255 - out[i]
  return { pixels: out, width, height }
}

export function grayToCanvas(image: GrayImage): HTMLCanvasElement {
  const canvas = createCanvas(image.width, image.height)
  const context = context2d(canvas)
  const imageData = context.createImageData(image.width, image.height)
  for (let i = 0; i < image.pixels.length; i++) {
    imageData.data[i * 4] = imageData.data[i * 4 + 1] = imageData.data[i * 4 + 2] = image.pixels[i]
    imageData.data[i * 4 + 3] = 255
  }
  context.putImageData(imageData, 0, 0)
  return canvas
}

// Small JPEG data URL for storing alongside a scan.
export function makeThumbnail(source: HTMLCanvasElement, maxWidth = 480, quality = 0.6): string {
  const scale = Math.min(1, maxWidth / source.width)
  const canvas = createCanvas(source.width * scale, source.height * scale)
  const context = context2d(canvas)
  context.imageSmoothingQuality = 'high'
  context.drawImage(source, 0, 0, canvas.width, canvas.height)
  return canvas.toDataURL('image/jpeg', quality)
}
