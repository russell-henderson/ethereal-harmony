> Part of [Ethereal Harmony Documentation](./README.md)

**Quick Links**  
**Core**: [Overview](./MASTER_OVERVIEW.md) · [Roadmap](./ROADMAP.md) · [Brand](./BRAND_GUIDELINES.md) · [Glossary](./GLOSSARY.md)  
**Architecture**: [Frontend](./FRONTEND.md) · [Backend](./BACKEND.md) · [DevOps](./DEVOPS.md) · [Database](./DATABASE.md) · [API Ref](./API_REFERENCE.md)  
**Quality**: [Accessibility](./ACCESSIBILITY.md) · [Security](./SECURITY.md) · [Performance](./PERFORMANCE.md) · [Observability](./OBSERVABILITY.md) · [Test Plan](./TEST_PLAN.md) · [Workflows](./WORKFLOWS.md)  
**People**: [Onboarding](./ONBOARDING.md) · [Contributing](./CONTRIBUTING.md)  
**Deep Links**: [ADRs](./ADR) · [Diagrams](./diagrams) · [Security Reviews](./security) · [Ops/Runbooks](./ops) · [Reports](./reports) · [Images](./images/ui-overview.png)

# API Reference

> Part of [Ethereal Harmony Documentation](./README.md)

**Quick Links:**  
[Overview](./MASTER_OVERVIEW.md) · [Database](./DATABASE.md) · [API Reference](./API_REFERENCE.md) · [Accessibility](./ACCESSIBILITY.md) · [Roadmap](./ROADMAP.md)

## API Types

This is a frontend-only SPA. There are **no REST, GraphQL, or external APIs** exposed.  
All integration happens through browser APIs (Web Audio API, MediaSession API, Cache API, IndexedDB, LocalStorage).

## Internal Module Boundaries

- **Audio Engine** (`src/lib/audio/`):
  - `AudioEngine.ts`: initializes AudioContext, graph, gain, limiter.
  - `TrackLoader.ts`: loads local files or streams (HTTPS/HLS).
  - `PlaybackController.ts`: play, pause, seek, next, prev, repeat, shuffle.
  - `AnalyserBus.ts`: frequency domain analysis for visualizer.
- **State Stores** (`src/lib/state/`):
  - `usePlayerStore.ts`, `useVizStore.ts`, `useSettingsStore.ts`, `useUIStore.ts`.
- **Visualizer** (`src/lib/three/`, `src/components/visualizer/`):
  - `VisualizerScene.ts`: WebGL scene orchestration.
  - `ParticlesField.ts`, `MistLayers.ts`, `PostProcessing.ts`: core 3D components.
- **Player UI** (`src/components/player/`):
  - `PlayerCard.tsx`, `TransportBar.tsx`, `PlaybackButtons.tsx`, `Timeline.tsx`, `VolumeSlider.tsx`.
- **Settings** (`src/components/settings/`):
  - `SettingsModal.tsx`, `EqPanel.tsx`, `CacheControls.tsx`, `TelemetryConsent.tsx`.
- **Diagnostics** (`src/lib/diagnostics/`, `src/components/diagnostics/`):
  - `PerfOverlay.ts`, `Probe.ts`, `AdaptiveGuard.ts`.

## Example Interactions

All interactions are module-to-module, not networked. Example:

```ts
usePlayerStore.getState().play();
useVizStore.setState({ intensity: 0.8 });
```

[← Back to Documentation Index](./README.md)