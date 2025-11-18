import { FormEvent, useState } from 'react'
import { usePlayerStore } from '@/lib/state/usePlayerStore'
import { isHttpsUrl } from '@/lib/utils/UrlGuard'
import { loadTrackFromUrl } from '@/lib/audio/TrackLoader'
import { toast } from '@/components/feedback/Toasts'

export const UrlLoader = () => {
  const { setQueue, play } = usePlayerStore()
  const [url, setUrl] = useState('https://files.freemusicarchive.org/storage-freemusicarchive-org/music/no_curator/Loyalty_Freak_Music/LOFI_and_chill/Loyalty_Freak_Music_-_01_-_Just_Because.mp3')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!isHttpsUrl(url)) {
      toast.error('Invalid URL', {
        message: 'Only HTTPS URLs are allowed for security.',
      })
      return
    }

    setLoading(true)
    try {
      const track = await loadTrackFromUrl(url)
      setQueue([track], 0)
      play()
      toast.success(`Loaded: ${track.title}`)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load audio from URL'
      if (message.includes('CORS') || message.includes('network')) {
        toast.error('Network error', {
          message: 'Unable to load audio. The server may not allow cross-origin requests.',
        })
      } else if (message.includes('HLS') || message.includes('stream')) {
        toast.error('Stream error', {
          message: 'Unable to load stream. Please check the URL and try again.',
        })
      } else {
        toast.error('Failed to load URL', {
          message: message,
        })
      }
    } finally {
      setLoading(false)
    }
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
      <button 
        type="submit" 
        className="eh-glass" 
        style={{ padding: '8px 12px', cursor: loading ? 'wait' : 'pointer' }}
        disabled={loading}
        aria-busy={loading}
      >
        {loading ? 'Loading...' : 'Load URL'}
      </button>
    </form>
  )
}
