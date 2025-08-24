# API Reference

## API Types

This project is a frontend-only SPA. There are **no REST, GraphQL, gRPC, WebSocket, or webhook APIs** exposed to external consumers.

## Internal Module Boundaries

While there is no external API, the codebase is organized into clear internal modules:

- **Audio Engine**: `src/lib/audio/AudioEngine.ts`, `PlaybackController.ts`, `AnalyserBus.ts`
- **State Stores**: `src/lib/state/usePlayerStore.ts`, `useVizStore.ts`, `useSettingsStore.ts`, `useUIStore.ts`
- **Visualizer**: `src/lib/visualizer/`, `src/components/visualizer/`
- **Player UI**: `src/components/player/`
- **Settings**: `src/components/settings/`
- **Diagnostics**: `src/lib/diagnostics/`, `src/components/diagnostics/`

## Example Requests/Responses

Not applicable. All interactions are in-browser and module-to-module.
