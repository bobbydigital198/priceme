// Large barcode drawn over the camera view, so it's obvious what to point at.
const WIDTHS = [3, 1, 2, 1, 4, 1, 1, 3, 2, 1, 1, 2, 3, 1, 2, 4, 1, 1, 2, 1, 3, 1, 2, 1, 1, 3, 2, 1, 4, 1, 2, 3]

// Even entries are bars, odd entries are gaps.
const BARS = WIDTHS.flatMap((width, i) => {
  const x = WIDTHS.slice(0, i).reduce((a, b) => a + b, 0)
  return i % 2 === 0 ? [{ x, width }] : []
})
const TOTAL_WIDTH = WIDTHS.reduce((a, b) => a + b, 0)

export function BarcodeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox={`0 0 ${TOTAL_WIDTH} 50`} fill="currentColor" preserveAspectRatio="none" aria-hidden="true">
      {BARS.map((bar) => (
        <rect key={bar.x} x={bar.x} y={0} width={bar.width} height={50} />
      ))}
    </svg>
  )
}
