> Part of [Ethereal Harmony Documentation](./README.md)

**Quick Links**  
**Core**: [Overview](./MASTER_OVERVIEW.md) · [Roadmap](./ROADMAP.md) · [Brand](./BRAND_GUIDELINES.md) · [Glossary](./GLOSSARY.md)  
**Architecture**: [Frontend](./FRONTEND.md) · [Backend](./BACKEND.md) · [DevOps](./DEVOPS.md) · [Database](./DATABASE.md) · [API Ref](./API_REFERENCE.md)  
**Quality**: [Accessibility](./ACCESSIBILITY.md) · [Security](./SECURITY.md) · [Performance](./PERFORMANCE.md) · [Observability](./OBSERVABILITY.md) · [Test Plan](./TEST_PLAN.md) · [Workflows](./WORKFLOWS.md)  
**People**: [Onboarding](./ONBOARDING.md) · [Contributing](./CONTRIBUTING.md)  
**Deep Links**: [ADRs](./ADR) · [Diagrams](./diagrams) · [Security Reviews](./security) · [Ops/Runbooks](./ops) · [Reports](./reports) · [Images](./images/ui-overview.png)

# Backend Documentation

> Part of [Ethereal Harmony Documentation](./README.md)

**Quick Links:**  
[Overview](./MASTER_OVERVIEW.md) · [Database](./DATABASE.md) · [API Reference](./API_REFERENCE.md) · [Accessibility](./ACCESSIBILITY.md) · [Roadmap](./ROADMAP.md)

## Frameworks, Packages, and Versions

There is no backend server or API in this codebase. All business logic, state management, and orchestration are implemented in the frontend (React + TypeScript). The architecture is modular, with a clear separation of concerns for audio, state, diagnostics, and UI.

**Key Packages:**

- React, Zustand, Three.js, Framer Motion, hls.js (all frontend)
- No backend or server-side frameworks

## App Entrypoints

- No Node.js/Express/server entrypoint. The app is a static SPA, entry is `src/index.tsx`.

## Services/Controllers/Handlers

- `AudioEngine` (`src/lib/audio/AudioEngine.ts`): Core audio playback, state, and event handling.
- `PlaybackController` (`src/lib/audio/PlaybackController.ts`): Orchestrates playback, queue, repeat/shuffle, and event forwarding.
- `AnalyserBus` (`src/lib/audio/AnalyserBus.ts`): Audio analysis for visualizations.
- `DeviceManager`, `OutputDeviceManager`, `EQGraph`, `Limiter`: Audio device and effects management.
- `PerfEvents` (`src/lib/diagnostics/PerfEvents.ts`): Performance diagnostics, event pub/sub.

## Middleware Chain

Not applicable (no HTTP stack).

## Auth/Permissions

No authentication or permissions model.

## Validation

Defensive programming in playback and audio modules (never throw on user actions).

## Error Handling

- Error boundaries in React (`src/components/feedback/ErrorBoundary.tsx`).
- Defensive error handling in audio modules.

## Background Jobs

- Performance sampling (RAF loop in `PerfEvents`).
- LocalStorage for developer toggles and settings.

## Configuration (Env Var Table)

- No `.env` or config files. All config is in code or browser storage.

## Performance Practices

- Performance overlays, FPS sampling, and adaptive quality for visualizer.
- No connection pooling, caching, or pagination (not applicable).

## Code Path Citations

- See `src/lib/audio/`, `src/lib/diagnostics/`, `src/lib/state/`, and `src/components/feedback/ErrorBoundary.tsx`.

---

[← Back to Documentation Index](./README.md)
