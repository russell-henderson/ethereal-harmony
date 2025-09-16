# DATABASE.md — Ethereal Harmony

## Entities
- `Track`
- `PlayerState`
- `VizState`
- `Playlist`

## Persistence
- IndexedDB for audio chunks + metadata
- Cache API for artwork
- Zustand persist for settings

## Example
```ts
// Track entity
 type Track = {
   id: string
   title: string
   artist: string
   album?: string
   durationSec: number
   src: { kind: "file" | "stream"; url: string }
   artworkUrl?: string
   palette?: { dominant: string; accent: string }
 }
```

## Retention
- Local-only
- Manual purge via cache controls

---
**Acceptance:** ERD or schema diagram clear; matches implemented stores.
