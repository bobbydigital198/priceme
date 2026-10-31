// Left half barcode, a diagonal slash, right half price tag.
export function ScanIcon({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <rect x="1.5" y="6" width="1.4" height="12" />
      <rect x="3.7" y="6" width="0.7" height="12" />
      <rect x="5.2" y="6" width="1.6" height="12" />
      <rect x="7.6" y="6" width="0.7" height="12" />
      <rect x="9.1" y="6" width="1.1" height="12" />
      <path d="M12.9 3.5 L11.1 20.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none" />
      <path fillRule="evenodd" d="M14 12 L17.2 7.5 H22.5 V16.5 H17.2 Z M17.9 12 a1.1 1.1 0 1 0 0.001 0 Z" />
    </svg>
  )
}
