// 1x / 2x / 3x buttons on the camera screens, for cameras that can zoom.
// Zooming in lets you hold the phone further back, where it can focus.
export function ZoomControl({ steps, zoom, onZoom }: { steps: number[]; zoom: number; onZoom: (level: number) => void }) {
  if (steps.length < 2) return null
  return (
    <div className="zoom-control" role="group" aria-label="Zoom">
      {steps.map((level) => (
        <button
          key={level}
          type="button"
          className={level === zoom ? 'selected' : ''}
          aria-pressed={level === zoom}
          aria-label={`Zoom ${level} times`}
          onClick={() => onZoom(level)}
        >
          {level}×
        </button>
      ))}
    </div>
  )
}
