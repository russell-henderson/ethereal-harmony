---
Version: 1.0.0
Last Updated: 2025-01-27
Status: Draft
Owner: Russell Henderson
---

> Part of [Ethereal Harmony Documentation](./README.md)

**Quick Links**  
**Core**: [Overview](./MASTER_OVERVIEW.md) · [Roadmap](./ROADMAP.md) · [Brand](./BRAND_GUIDELINES.md) · [Glossary](./GLOSSARY.md)  
**Architecture**: [Frontend](./FRONTEND.md) · [Backend](./BACKEND.md) · [DevOps](./DEVOPS.md) · [Database](./DATABASE.md) · [API Ref](./API_REFERENCE.md)  
**Quality**: [Accessibility](./ACCESSIBILITY.md) · [Security](./SECURITY.md) · [Performance](./PERFORMANCE.md) · [Observability](./OBSERVABILITY.md) · [Test Plan](./TEST_PLAN.md) · [Workflows](./WORKFLOWS.md)  
**People**: [Onboarding](./ONBOARDING.md) · [Contributing](./CONTRIBUTING.md)  
**Deep Links**: [ADRs](./ADR) · [Diagrams](./diagrams) · [Security Reviews](./security) · [Ops/Runbooks](./ops) · [Reports](./reports) · [Images](./images/ui-overview.png)

# Database Documentation

## Reality Check

> **Current State (2025-01-27):**
> 
> - **No backend database exists today.** All data persistence is browser-side.
> - **All persistence is browser-side** using LocalStorage, IndexedDB, and Cache API.
> - This document describes the current browser-side storage architecture.

---

## Current Architecture

### Databases Used

There is **no backend database**. All data is stored locally in the browser using:

- **LocalStorage**: for persisted settings (theme, density, volume, viz params).
- **IndexedDB**: for cached audio chunks, album artwork, and metadata sidecars.
- **In-memory (Zustand stores)**: transient app state (queue, current track, UI flags).
- **Cache API**: used by the PWA service worker for artwork and offline assets.

### Models/Entities

> **Current:** These entities exist in browser storage only.

- **Track**: Metadata for a single audio item.
- **Playlist**: Array of Track IDs with a name and timestamp.
- **SettingsStore**: Theme, density, reducedMotion, telemetryOptIn, cache size.
- **PlayerStore**: Playback state, queue, currentIndex, repeat, shuffle, volume.
- **VizStore**: Visualizer parameters (intensity, bloom, motionScale, HDR toggle).
- **UIStore**: Modals, side panel visibility, diagnostic overlays.

### Relationships

> **Current:** These relationships exist in-memory and browser storage only.

- `Playlist` references `Track` IDs.  
- `PlayerStore.queue` is an ordered list of Track IDs.  
- No relational DB, but sidecars (`track.json`) may reference cached artwork.

### ERD

> **Current:** Conceptual representation of browser-side data structures.

```
[Playlist] --- [Track]
[PlayerStore] 1---* [Track]
[SettingsStore] 1---1 [VizStore]
```

### Data Retention/Backups

> **Current:** All data is local-only.

- Data remains until user clears storage.  
- No automatic backups.  
- No sensitive PII stored.

---

## Future Considerations (Planned/Conceptual)

> **Note:** The following sections describe potential future backend database services that do not exist today. These are design references only.

If a backend database is added in the future, it might include:

- Remote database for library metadata sync
- User account and playlist persistence
- Cross-device synchronization
- Backup and restore services

---

[← Back to Documentation Index](./README.md)
