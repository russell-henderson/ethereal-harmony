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

# API Reference

## Reality Check

> **Current State (2025-01-27):**
> 
> - **No backend server exists today.** This is a frontend-only application.
> - **All persistence is browser-side** using LocalStorage, IndexedDB, and Cache API.
> - **API docs are forward looking.** This document describes current internal module boundaries (Current) and may include forward-looking API designs for potential future backend services (Planned).

---

## Current Architecture

### API Types

> **Current:** No external APIs exist.

This is a frontend-only SPA. There are **no REST, GraphQL, or external APIs** exposed.  
All integration happens through browser APIs (Web Audio API, MediaSession API, Cache API, IndexedDB, LocalStorage).

### Internal Module Boundaries

> **Current:** These are frontend module boundaries, not backend API endpoints.

- **Audio Engine** (`src/lib/audio/`):
  - `AudioEngine.ts`: initializes AudioContext, graph, gain, limiter.
  - `TrackLoader.ts`: loads local files or streams (HTTPS/HLS).
  - `PlaybackController.ts`: play, pause, seek, next, prev, repeat, shuffle.
  - `AnalyserBus.ts`: frequency domain analysis for visualizer.
- **State Stores** (`src/lib/state/`):
  - `usePlayerStore.ts`, `useVizStore.ts`, `useSettingsStore.ts`, `useUIStore.ts`.
- **Visualizer** (`src/lib/three/`, `src/components/visualizer/`):
  - `VisualizerScene.ts`: WebGL scene orchestration.
  - `ParticlesField.ts`, `PostProcessing.ts`: core 3D components.
  - `SceneController.ts`: Main visualizer controller (in `src/lib/visualizer/`).
- **Player UI** (`src/components/player/`):
  - `PlayerCard.tsx`, `TransportBar.tsx`, `PlaybackButtons.tsx`, `Timeline.tsx`, `VolumeSlider.tsx`.
- **Settings** (`src/components/settings/`):
  - `SettingsModal.tsx`, `SettingsPanel.tsx`, `EqPanel.tsx`, `VisualizerControls.tsx`.
- **Diagnostics** (`src/lib/diagnostics/`, `src/components/diagnostics/`):
  - `PerfOverlay.ts`, `Probe.ts`, `AdaptiveGuard.ts`.

### Example Interactions

> **Current:** All interactions are module-to-module, not networked.

```ts
usePlayerStore.getState().play();
useVizStore.setState({ intensity: 0.8 });
```

---

## Future Considerations (Planned/Conceptual)

> **Note:** The following sections describe potential future backend API services that do not exist today. These are design references only.

If backend API services are added in the future, they might include:

- REST or GraphQL endpoints for library management
- WebSocket connections for real-time sync
- Authentication and authorization APIs
- Telemetry and analytics endpoints
- Playlist sharing and collaboration APIs

[← Back to Documentation Index](./README.md)
