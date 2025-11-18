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

# Frontend Documentation

## Routing Tree

- **Store-driven routing**: No external router; routes are managed in `useSettingsStore` and mirrored to `location.hash`.
- **Routes**:  
  - `player`: Now Playing & Visualizer  
  - `settings`: EQ, devices, visualizer controls  
  - `stream`: Streaming test wizard  
- See: `src/app/routes.tsx`

## Data Fetching Strategy

- No remote data fetching; all data is local (audio files, settings, state).
- HLS streams handled via `hls.js` for non-Safari browsers.

## State Stores

- **Zustand** is used for all state management:
  - `usePlayerStore`: playback state
  - `useVizStore`: visualizer state
  - `useSettingsStore`: theme, view, settings, router
  - `useUIStore`: ephemeral UI state (side panel, modals, FPS overlay)

## Key Components

### Layout Components

- `AppShell`: Main layout scaffold with:
  - Fixed background WebGL canvas (visualizer)
  - Top bar (`TopBar`) with menu, search, and profile/settings
  - Visualizer toolbar (`VisualizerToolbar`) with preset, HDR, and dimmer controls
  - Content grid with side panel (`SidePanel`) and main content area
  - Fixed bottom player bar (`BottomPlayerBar`)
- `TopBar`: Global header with menu bar, search, and user actions
- `SidePanel`: Left navigation panel with Library, Playlists, Discovery views
- `VisualizerToolbar`: Dedicated visualizer controls strip under top bar
- `SplitPane`: Reusable split-pane layout (left list, right detail) used by views
- `EmptyState`: Reusable empty state component for lists and detail panes

### Player Components

- `BottomPlayerBar`: Persistent bottom player bar with:
  - Volume control (left)
  - Now playing info with album art and progress bar (center-left)
  - Playback transport controls (center)
  - Upload button (center-right)
  - Time display and playback speed selector (right)
- `PlayerCard`: Legacy player card (hidden, replaced by BottomPlayerBar)
- `TransportBar`: Time readout component
- `PlaybackButtons`: Transport control buttons (prev, play/pause, next)
- `VolumeSlider`: Volume control with mute toggle

### View Components

- `LibraryView`: Main library view with split-pane layout (track list + detail)
- `PlaylistsView`: Playlist management with split-pane layout
- `DiscoveryView`: Discovery view with split-pane layout (categories + track list + detail)
- `TrackList`: Virtualized track list component

### Visualizer Components

- `SceneCanvas`: WebGL renderer wrapper for Three.js visualizer
- `VisualizerToolbar`: Quick controls for preset, HDR, dimmer
- `PresetSelector`, `HdrToggle`, `DimmerToggle`: Individual visualizer controls

### Settings Components

- `SettingsPanel`: Unified settings panel (compact toolbar or full mode)
- `AudioDevicePicker`: Output device selector
- `EqPanel`: Equalizer controls

### Utility Components

- `GlobalHotkeys`: Keyboard shortcuts handler
- `MediaKeyBridge`: Hardware media keys support
- `ErrorBoundary`, `Toasts`: Error and feedback handling

## Styling Approach

- **CSS**: Design tokens (`src/styles/tokens.css`), global styles (`src/styles/globals.css`), and utility classes.
- **Glassmorphism**: Used throughout for modern UI.
- No CSS-in-JS; all styles are static or token-driven.

## Accessibility Checklist

- Full keyboard navigation for all custom components.
- ARIA roles and states on buttons, sliders, toggles, and navigation.
- WCAG AA contrast enforced via tokens and runtime checks.
- Screen reader labels and skip links.
- Focus ring and modality helpers for visible focus.

## Performance Optimizations

- Code-splitting via Vite.
- Lazy loading of HLS.js.
- Adaptive visualizer quality.
- FPS and performance overlays for diagnostics.
- Minimal re-renders via primitive selectors in Zustand.

## Storybook Links

- No Storybook present.

---

[← Back to Documentation Index](./README.md)
