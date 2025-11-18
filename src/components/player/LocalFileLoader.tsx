import { usePlayerStore } from '@/lib/state/usePlayerStore'
import { loadTrackFromFile } from '@/lib/audio/TrackLoader'
import { toast } from '@/components/feedback/Toasts'

export const LocalFileLoader = () => {
  const { setQueue, play } = usePlayerStore()

  const handleChange: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const track = await loadTrackFromFile(file)
      setQueue([track], 0)
      play()
      toast.success(`Loaded: ${track.title}`)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load audio file'
      if (message.includes('Unsupported')) {
        toast.error('Unsupported file type', {
          message: 'Please select an MP3, M4A, AAC, FLAC, or WAV file.',
        })
      } else {
        toast.error('Failed to load file', {
          message: message,
        })
      }
    }
    
    // Reset input so same file can be selected again
    e.target.value = ''
  }

  return (
    <label className="eh-glass" style={{ padding: '8px 12px', cursor: 'pointer', display: 'inline-block' }}>
      <span aria-hidden="true">📂</span> <span>Open audio file</span>
      <input
        type="file"
        accept="audio/*"
        onChange={handleChange}
        style={{ display: 'none' }}
        aria-label="Open local audio file"
      />
    </label>
  )
}
