import { usePlayerStore } from '@/lib/state/usePlayerStore'

export const LocalFileLoader = () => {
  const { load, play } = usePlayerStore()

  const handleChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    load(url)
    play()
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
