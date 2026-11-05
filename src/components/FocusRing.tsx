// A ring that briefly shows where you tapped to focus the camera.
export function FocusRing({ point }: { point?: { x: number; y: number; id: number } }) {
  if (!point) return null
  return <span className="focus-ring" style={{ left: point.x, top: point.y }} aria-hidden="true" />
}
