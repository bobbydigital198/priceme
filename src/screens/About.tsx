import { useState } from 'react'
import { InstallSteps } from '../components/InstallSteps'
import { MenuButton } from '../components/Menu'

type Props = { onOpenMenu: () => void }

const APP_URL = 'https://bobbydigital198.github.io/priceme/'

// What PrixIt is, how to install it, what happens to your data, and whose data and code it uses.
export function About({ onOpenMenu }: Props) {
  const [shareMessage, setShareMessage] = useState('')

  async function shareApp() {
    try {
      if (navigator.share) await navigator.share({ title: 'PrixIt', text: 'Track supermarket prices with PrixIt:', url: APP_URL })
      else {
        await navigator.clipboard.writeText(APP_URL)
        setShareMessage('Link copied. Paste it into a message to send it.')
      }
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError')) setShareMessage(`Send this link: ${APP_URL}`)
    }
  }

  return (
    <main className="screen about">
      <header className="section-header">
        <MenuButton onClick={onOpenMenu} />
        <h1>About</h1>
      </header>

      <p>
        PrixIt logs supermarket prices: scan a barcode, photograph the shelf price tag, and see how prices change over time
        and from shop to shop. It's a personal, non-commercial app. Version {__APP_VERSION__}.
      </p>

      <section className="card">
        <h2 className="card-heading">Install on a phone</h2>
        <InstallSteps />
        <div className="button-row">
          <button type="button" className="secondary-button" onClick={shareApp}>
            Send PrixIt to someone
          </button>
        </div>
        {shareMessage && <p className="settings-message">{shareMessage}</p>}
      </section>

      <section className="card prose">
        <h2 className="card-heading">Privacy and data</h2>
        <p>
          <strong>Your data stays on your phone.</strong> PrixIt has no accounts, no server of its own, no analytics, no
          adverts and no cookies. Nobody else, including whoever made or shared the app, can see your scans.
        </p>

        <h3>What's stored on your phone</h3>
        <ul>
          <li>Products you've scanned: barcode, name, brand, pack size, category and a link to the product photo.</li>
          <li>
            Each scan: the price, the price per kilo or litre, the date and time, the shop, a small photo of the price tag
            and the text read from it. Tag photos stay on your phone; avoid photographing people.
          </li>
          <li>Your shops: name, street and chain, plus the shop's location if you found it with "Find shops near me".</li>
        </ul>

        <h3>What leaves your phone</h3>
        <ul>
          <li>
            <strong>Opening the app:</strong> it's downloaded from GitHub Pages (GitHub, Inc., USA), which receives your IP
            address and logs it for security, as described in GitHub's privacy statement.
          </li>
          <li>
            <strong>Scanning a product new to your phone:</strong> its barcode is sent to Open Food Facts, and if not found,
            to Open Beauty Facts and Open Products Facts (all run by the non-profit Open Food Facts, France). They receive the
            barcode and your IP address. Product photos are loaded from their servers too. Products you've scanned before
            don't go online again.
          </li>
          <li>
            <strong>Only if you tap "Use my location":</strong> your position (to about 10 m) is sent to OpenStreetMap's
            Overpass service (run by FOSSGIS e.V., Germany) to find shops within 150 m. You're asked first; it isn't saved,
            and nothing about your location is sent anywhere else.
          </li>
          <li>Price tag photos and the text read from them are never sent anywhere.</li>
        </ul>

        <h3>Your control</h3>
        <ul>
          <li>
            <strong>Copy everything:</strong> Settings → Save a backup gives you all your data as a file.
          </li>
          <li>
            <strong>Delete everything:</strong> Settings → Delete all data, or delete the app. Single scans can be deleted on
            each product's page.
          </li>
          <li>
            <strong>Location and camera</strong> are only used with your permission, which you can withdraw in your phone's
            settings at any time.
          </li>
        </ul>
        <p>
          Questions about PrixIt and your data: contact the person who shared it with you, or{' '}
          <a href="https://github.com/bobbydigital198/priceme" target="_blank" rel="noreferrer">
            bobbydigital198 on GitHub
          </a>
          .
        </p>
      </section>

      <section className="card prose">
        <h2 className="card-heading">Credits and licences</h2>
        <p>PrixIt is built on the work of these open projects:</p>
        <ul>
          <li>
            <strong>Product information</strong> from{' '}
            <a href="https://world.openfoodfacts.org" target="_blank" rel="noreferrer">
              Open Food Facts
            </a>
            , Open Beauty Facts and Open Products Facts, available under the Open Database Licence (ODbL). Product photos are
            by their contributors, under Creative Commons Attribution-ShareAlike (CC BY-SA).
          </li>
          <li>
            <strong>Shop locations</strong> © OpenStreetMap contributors, available under the{' '}
            <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">
              Open Database Licence
            </a>
            , found with the Overpass API.
          </li>
          <li>
            <strong>Price tag reading</strong> by Tesseract and Tesseract.js (Apache 2.0), with its French and English
            language data.
          </li>
          <li>
            <strong>Barcode reading</strong> by ZXing (Apache 2.0) where the phone has no built-in scanner.
          </li>
          <li>
            <strong>Also</strong> React (MIT), Dexie (Apache 2.0), Chart.js (MIT), Vite and vite-plugin-pwa (MIT).
          </li>
        </ul>
      </section>
    </main>
  )
}
