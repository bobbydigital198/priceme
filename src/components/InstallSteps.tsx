import { isInstalled, isIos, useInstallPrompt } from '../lib/platform'

// How to add PrixIt to the home screen on this phone, with one-tap install where Chrome offers it.
export function InstallSteps() {
  const install = useInstallPrompt()
  const ios = isIos()

  if (isInstalled()) return <p className="product-sub">PrixIt is installed on this phone. To put it on another, send them the link.</p>

  return (
    <>
      {install && (
        <div className="button-row">
          <button type="button" className="primary-button" onClick={install}>
            Install PrixIt
          </button>
        </div>
      )}
      {ios ? (
        <ol className="install-steps">
          <li>
            Open this page in <strong>Safari</strong> (or Chrome on iOS 16.4 or later).
          </li>
          <li>
            Tap the <strong>Share</strong> button (the square with an arrow pointing up).
          </li>
          <li>
            Scroll down and tap <strong>Add to Home Screen</strong>, then <strong>Add</strong>.
          </li>
          <li>Open PrixIt from your home screen, not from the browser.</li>
        </ol>
      ) : (
        <ol className="install-steps">
          <li>
            Open this page in <strong>Chrome</strong>.
          </li>
          <li>
            Tap the <strong>⋮</strong> menu (top right), then <strong>Add to home screen</strong>, then <strong>Install</strong>.
          </li>
          <li>Open PrixIt from your home screen.</li>
        </ol>
      )}
    </>
  )
}
