// Large price tag drawn inside the camera frame, so it's obvious what to photograph.
export function TagIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 100 60" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true">
      <path d="M4 30 L22 6 H96 V54 H22 Z" strokeLinejoin="round" />
      <circle cx="22" cy="30" r="5" />
      <path d="M40 22 H84 M40 32 H76 M40 42 H66" strokeLinecap="round" />
    </svg>
  )
}
