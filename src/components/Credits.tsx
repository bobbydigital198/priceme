// Attribution lines required by the open data licences (see About for the full credits).

export function OffCredit() {
  return (
    <p className="credit">
      Product data from{' '}
      <a href="https://world.openfoodfacts.org" target="_blank" rel="noreferrer">
        Open Food Facts
      </a>{' '}
      (ODbL)
    </p>
  )
}

export function OsmCredit() {
  return (
    <p className="credit">
      Shop data ©{' '}
      <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">
        OpenStreetMap contributors
      </a>
    </p>
  )
}
