# STATE_MANAGEMENT.md — Ethereal Harmony

## Store Structure
- `usePlayerStore`: queue, currentIndex, isPlaying, volume, repeat, shuffle
- `useVizStore`: visualizer params (intensity, bloom, motionScale, theme)
- `useSettingsStore`: theme, density, telemetryOptIn, cacheSize
- `useUIStore`: modals, toasts, layout flags

---
**Acceptance:** All features can extend stores without breaking architecture.
