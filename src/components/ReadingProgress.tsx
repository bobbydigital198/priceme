export function ReadingProgress({ progress }: { progress: number }) {
  return (
    <section className="card" aria-busy="true">
      <h2>Reading the price…</h2>
      <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)}>
        <div className="progress-bar" style={{ width: `${Math.max(5, progress * 100)}%` }} />
      </div>
      <p className="product-sub">This takes a few seconds and happens entirely on your phone.</p>
    </section>
  )
}
