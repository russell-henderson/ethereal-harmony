import { FormEvent, useState } from 'react'
import { usePlayerStore } from '@/lib/state/usePlayerStore'
import { isHttpsUrl } from '@/lib/utils/UrlGuard'

export const UrlLoader = () => {
  const { load, play } = usePlayerStore()
  const [url, setUrl] = useState('https://files.freemusicarchive.org/storage-freemusicarchive-org/music/no_curator/Loyalty_Freak_Music/LOFI_and_chill/Loyalty_Freak_Music_-_01_-_Just_Because.mp3')

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!isHttpsUrl(url)) {
      alert('Only HTTPS URLs are allowed.')
      return
    }
    load(url)
    play()
  }

  return (
    <form onSubmit={handleSubmit} className="eh-hstack" aria-label="Load from URL" style={{ gap: 8 }}>
      <input
        type="url"
        required
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="https://example.com/track.mp3"
        aria-label="Audio URL"
        className="eh-glass"
        style={{ padding: '8px 12px', width: '100%', borderRadius: '12px', background: 'rgba(255,255,255,0.06)' }}
      />
      <button type="submit" className="eh-glass" style={{ padding: '8px 12px', cursor: 'pointer' }}>
        Load URL
      </button>
    </form>
  )
}
