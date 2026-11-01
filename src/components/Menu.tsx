import { useEffect } from 'react'

export type Section = 'scans' | 'shops' | 'products'

const SECTIONS: { id: Section; label: string }[] = [
  { id: 'scans', label: 'Scans' },
  { id: 'shops', label: 'Shops' },
  { id: 'products', label: 'Products' },
]

export function MenuButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" className="menu-button" onClick={onClick} aria-label="Open menu">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
        <path d="M4 6h16M4 12h16M4 18h16" />
      </svg>
    </button>
  )
}

type Props = {
  current: Section
  onNavigate: (section: Section) => void
  onOpenSettings: () => void
  onClose: () => void
}

// Side menu for moving between the app's sections.
export function MenuDrawer({ current, onNavigate, onOpenSettings, onClose }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <nav className="drawer" aria-label="Sections" onClick={(e) => e.stopPropagation()}>
        <p className="drawer-title">PriceMe</p>
        <ul>
          {SECTIONS.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                className={s.id === current ? 'current' : ''}
                aria-current={s.id === current ? 'page' : undefined}
                onClick={() => (onClose(), onNavigate(s.id))}
              >
                {s.label}
              </button>
            </li>
          ))}
        </ul>
        <hr />
        <ul>
          <li>
            <button type="button" onClick={() => (onClose(), onOpenSettings())}>
              Settings
            </button>
          </li>
        </ul>
        <p className="drawer-version">Version {__APP_VERSION__}</p>
      </nav>
    </div>
  )
}
