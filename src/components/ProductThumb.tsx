import { useState } from 'react'

type Props = { imageUrl?: string; name: string; size?: number }

// Product photo, or the first letter of the name if there's no photo or it fails to load.
export function ProductThumb({ imageUrl, name, size = 56 }: Props) {
  const [failed, setFailed] = useState(false)
  const style = { width: size, height: size }

  if (imageUrl && !failed) {
    return <img className="thumb" style={style} src={imageUrl} alt="" loading="lazy" onError={() => setFailed(true)} />
  }
  return (
    <div className="thumb thumb-placeholder" style={style} aria-hidden="true">
      {name.trim().charAt(0).toUpperCase() || '?'}
    </div>
  )
}
