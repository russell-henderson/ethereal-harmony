> Part of [Ethereal Harmony Documentation](./README.md)

**Quick Links**  
**Core**: [Overview](./MASTER_OVERVIEW.md) · [Roadmap](./ROADMAP.md) · [Brand](./BRAND_GUIDELINES.md) · [Glossary](./GLOSSARY.md)  
**Architecture**: [Frontend](./FRONTEND.md) · [Backend](./BACKEND.md) · [DevOps](./DEVOPS.md) · [Database](./DATABASE.md) · [API Ref](./API_REFERENCE.md)  
**Quality**: [Accessibility](./ACCESSIBILITY.md) · [Security](./SECURITY.md) · [Performance](./PERFORMANCE.md) · [Observability](./OBSERVABILITY.md) · [Test Plan](./TEST_PLAN.md) · [Workflows](./WORKFLOWS.md)  
**People**: [Onboarding](./ONBOARDING.md) · [Contributing](./CONTRIBUTING.md)  
**Deep Links**: [ADRs](./ADR) · [Diagrams](./diagrams) · [Security Reviews](./security) · [Ops/Runbooks](./ops) · [Reports](./reports) · [Images](./images/ui-overview.png)

# Database Documentation

> Part of [Ethereal Harmony Documentation](./README.md)

**Quick Links:**  
[Overview](./MASTER_OVERVIEW.md) · [Database](./DATABASE.md) · [API Reference](./API_REFERENCE.md) · [Accessibility](./ACCESSIBILITY.md) · [Roadmap](./ROADMAP.md)

> Part of [Ethereal Harmony Documentation](./README.md)

**Quick Links:**  
[Overview](./MASTER_OVERVIEW.md) · [Database](./DATABASE.md) · [API Reference](./API_REFERENCE.md) · [Accessibility](./ACCESSIBILITY.md) · [Roadmap](./ROADMAP.md)

## Databases Used

There is **no backend database**. All data is stored locally in the browser using:

- **LocalStorage**: for persisted settings (theme, density, volume, viz params).
- **IndexedDB**: for cached audio chunks, album artwork, and metadata sidecars.
- **In-memory (Zustand stores)**: transient app state (queue, current track, UI flags).
- **Cache API**: used by the PWA service worker for artwork and offline assets.

## Models/Entities

- **Track**: Metadata for a single audio item.
- **Playlist**: Array of Track IDs with a name and timestamp.
- **SettingsStore**: Theme, density, reducedMotion, telemetryOptIn, cache size.
- **PlayerStore**: Playback state, queue, currentIndex, repeat, shuffle, volume.
- **VizStore**: Visualizer parameters (intensity, bloom, motionScale, HDR toggle).
- **UIStore**: Modals, side panel visibility, diagnostic overlays.

## Relationships

- `Playlist` references `Track` IDs.  
- `PlayerStore.queue` is an ordered list of Track IDs.  
- No relational DB, but sidecars (`track.json`) may reference cached artwork.

## ERD

[Playlist] --- [Track]
[PlayerStore] 1---* [Track]
[SettingsStore] 1---1 [VizStore]

## Data Retention/Backups

- Data remains until user clears storage.  
- No automatic backups.  
- No sensitive PII stored.


---

[← Back to Documentation Index](./README.md)
