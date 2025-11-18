---
Version: 1.0.0
Last Updated: 2025-11-17
Status: Draft
Owner: Russell Henderson
---

# ARCHITECTURE

## 1. System Overview

Ethereal Harmony is a single page React application that runs entirely in the browser.

There is **no backend service in production today**. All logic executes on the client side, and all persistence uses browser storage. Any backend or API designs in this repository are conceptual and describe possible future states, not the current deployed system.

Key properties:

- React + Vite + TypeScript frontend
- Single page application with view level routing
- State managed with domain focused Zustand stores
- Web Audio API for playback and analysis
- Three.js for visualizer scenes
- Browser storage for all data and preferences

For product level context, see `../EXECUTIVE_SUMMARY.md` and `./PRD.md`.

---

## 2. High Level Architecture

> **Visual Reference:** See [`./diagrams/architecture-overview.mmd`](./diagrams/architecture-overview.mmd) for a component interaction diagram, and [`./diagrams/services-context.mmd`](./diagrams/services-context.mmd) for a system context view.

At a high level the system consists of four layers, all inside the browser:

1. **UI Layer**  
   React components under `src/components` and `src/app`  
   - **Layout Shell** (`AppShell`):
     - Fixed background WebGL canvas (visualizer)
     - Top bar (`TopBar`) with menu, search, profile/settings
     - Visualizer toolbar (`VisualizerToolbar`) with preset, HDR, dimmer controls
     - Content grid with side panel (`SidePanel`) and main content area
     - Fixed bottom player bar (`BottomPlayerBar`)
   - **Player Components**: Bottom player bar with volume, transport, now playing, time/speed
   - **View Components**: Library, Playlists, Discovery views with split-pane layout (list + detail)
   - **Visualizer Components**: Scene canvas, toolbar controls, preset selectors
   - **Settings Components**: Settings panel, audio device picker, EQ panel
   - **Utility Components**: Global hotkeys, media key bridge, error boundaries, toasts
   - **Diagnostics**: Performance overlays and feedback components

2. **State Layer**  
   Zustand stores under `src/lib/state`  
   - `usePlayerStore` for playback and queue state  
   - `useVizStore` for visualizer configuration  
   - `useSettingsStore` for theme and preferences  
   - `useUIStore` for layout, modals, and toasts

3. **Domain and Engine Layer**  
   Domain modules under `src/lib`  
   - `audio` for Web Audio orchestration, analysis, EQ, and device handling  
   - `visualizer` for mapping audio data to scene controls and uniforms  
   - `three` for scene setup, shaders, and rendering  
   - `streaming` for HLS and remote source handling  
   - `diagnostics` for performance and observability helpers  
   - `utils` for hotkeys, reduced motion, visibility, focus, and media session helpers

4. **Persistence and Integration Layer**  
   Browser side data and integrations  
   - LocalStorage and IndexedDB for user settings, playlists, and library metadata  
   - Cache API and static assets for the PWA shell and icons  
   - Optional streaming endpoints, consumed as HLS, treated as opaque external services

A typical flow:

1. User loads or selects audio (local file or URL) in a UI component.  
2. The UI dispatches actions to a store, which calls into the audio domain layer.  
3. `AudioEngine` controls playback and exposes analysis data.  
4. Visualizer modules subscribe to audio analysis and update Three.js scenes.  
5. UI components render state from the stores, and diagnostics modules observe performance.

---

## 3. Data Flow Overview

> **Visual Reference:** See [`./diagrams/sequence-auth.mmd`](./diagrams/sequence-auth.mmd) for a sequence diagram of the playback flow (note: despite the filename, this diagram shows playback sequence, not authentication).

This section traces an end-to-end path from user input through audio processing to visual rendering.

### 3.1 End-to-End Flow: File Selection to Visualization

#### Step 1: User Input and Track Loading

**Entry Point:** UI components in `src/components/player/`
- `LocalFileLoader.tsx` - File input handler
- `UrlLoader.tsx` - URL input handler

**Process:**
1. User selects a local file or enters a stream URL
2. Component calls `loadTrackFromFile(file)` or `loadTrackFromUrl(url)` from [`src/lib/audio/TrackLoader.ts`](../src/lib/audio/TrackLoader.ts)
3. `TrackLoader`:
   - Validates file type or URL format
   - Extracts metadata using `music-metadata-browser` (for local files)
   - Creates object URL for local files (via `URL.createObjectURL`)
   - Probes duration (for non-stream sources)
   - Returns a `Track` object with `id`, `title`, `artist`, `url`, `duration`, etc.

**Key Module:** [`src/lib/audio/TrackLoader.ts`](../src/lib/audio/TrackLoader.ts)

---

#### Step 2: State Store Update

**Process:**
1. UI component receives `Track` from `TrackLoader`
2. Component calls `usePlayerStore.setQueue([track], 0)` or `usePlayerStore.addToQueue(track)`
3. `usePlayerStore` updates its state:
   - Adds track to `queue` array
   - Sets `index` to current position
   - Persists queue to LocalStorage (via Zustand persist middleware)
4. Store action delegates to `PlaybackController` to load the track

**Key Modules:**
- [`src/lib/state/usePlayerStore.ts`](../src/lib/state/usePlayerStore.ts)
- [`../STATE_MANAGEMENT.md`](../STATE_MANAGEMENT.md) for store details

---

#### Step 3: Playback Controller and Audio Engine

**Process:**
1. `PlaybackController` (singleton) receives track from store
2. `PlaybackController.loadCurrent()` calls `AudioEngine.load(track.url)`
3. `AudioEngine` (singleton) sets up Web Audio graph:
   - Creates or reuses `AudioContext`
   - Creates `HTMLAudioElement` and sets `src` to track URL
   - For HLS streams: loads `HlsController` dynamically (Chromium) or uses native (Safari)
   - Connects audio element to Web Audio graph:
     ```
     HTMLAudioElement → AnalyserNode → EQGraph → GainNode → Limiter → AudioDestinationNode
     ```
4. `AudioEngine` emits `"loaded"` event
5. `PlaybackController` calls `AudioEngine.play()` to start playback

**Key Modules:**
- [`src/lib/audio/PlaybackController.ts`](../src/lib/audio/PlaybackController.ts) - Queue management and playback orchestration
- [`src/lib/audio/AudioEngine.ts`](../src/lib/audio/AudioEngine.ts) - Web Audio graph and transport controls
- [`src/lib/audio/EQGraph.ts`](../src/lib/audio/EQGraph.ts) - 10-band equalizer
- [`src/lib/audio/Limiter.ts`](../src/lib/audio/Limiter.ts) - Safe output limiting

---

#### Step 4: Audio Analysis

**Process:**
1. `AnalyserNode` in the Web Audio graph continuously samples audio data
2. `AnalyserBus` (singleton) wraps the `AnalyserNode` and provides a stable API:
   - `getFrequencyData(out: Uint8Array)` - Frequency domain (0-255 per bin)
   - `getTimeDomainData(out: Float32Array)` - Time domain (-1 to 1)
   - `sample()` - Convenience method returning `{ low, mid, high, rms }` band energies
3. `AnalyserBus` uses cached buffers to minimize allocations in animation frames
4. Analysis data is updated every frame (60 FPS target)

**Key Module:** [`src/lib/audio/AnalyserBus.ts`](../src/lib/audio/AnalyserBus.ts)

**Configuration:**
- FFT size: 2048 (1024 frequency bins)
- Smoothing: 0.8 (reduces jitter)
- Band ranges:
  - Low: 20-250 Hz
  - Mid: 250-2000 Hz
  - High: 2000-16000 Hz

---

#### Step 5: Visualizer Scene Updates

**Process:**
1. `SceneController` (in `src/lib/visualizer/` or `src/lib/three/`) is mounted by React component `SceneCanvas.tsx`
2. `SceneController` subscribes to `AnalyserBus` via `setAnalyser(analyserBus)`
3. In the `requestAnimationFrame` loop (driven by `SceneCanvas`):
   - `SceneController.update(dt)` is called each frame
   - Controller reads audio data from `AnalyserBus`:
     ```ts
     const rms = analyser.getRms();
     const bass = analyser.getBass();
     const mid = analyser.getMid();
     const treble = analyser.getTreble();
     ```
   - Controller reads visualizer parameters from `useVizStore`:
     ```ts
     const viz = useVizStore.getState();
     const intensity = viz.params.intensity;
     const bloom = viz.params.bloom;
     const motionScale = viz.params.motionScale;
     ```
   - Controller updates Three.js shader uniforms:
     ```ts
     uniforms.uAudioRms.value = lerp(current, rms, 0.25); // easing
     uniforms.uAudioBass.value = lerp(current, bass, 0.25);
     uniforms.uIntensity.value = intensity;
     uniforms.uTime.value = time;
     ```
4. Three.js renders the scene with audio-reactive uniforms

**Key Modules:**
- [`src/lib/visualizer/SceneController.ts`](../src/lib/visualizer/SceneController.ts) - Main visualizer controller
- [`src/lib/three/VisualizerScene.ts`](../src/lib/three/VisualizerScene.ts) - Three.js scene setup (alternative implementation)
- [`src/lib/three/components/ParticlesField.ts`](../src/lib/three/components/ParticlesField.ts) - Particle system component
- [`src/lib/visualizer/QualityPresets.ts`](../src/lib/visualizer/QualityPresets.ts) - Quality tier configuration
- [`src/lib/state/useVizStore.ts`](../src/lib/state/useVizStore.ts) - Visualizer state store

---

#### Step 6: UI Rendering

**Process:**
1. React components subscribe to stores using Zustand hooks:
   - `BottomPlayerBar` reads `usePlayerStore` and `PlaybackController` events for current track and playback state
   - `LibraryView`, `PlaylistsView`, `DiscoveryView` use `SplitPane` layout and read from `usePlayerStore` and `useUIStore`
   - `VisualizerToolbar` reads `useVizStore` for preset, HDR, and dimmer state
   - `SceneCanvas` reads `useVizStore` for preset and parameter changes
2. Components re-render when subscribed state changes
3. Diagnostics overlays (if enabled) read from `PerfEvents` and display FPS/metrics

**Component Hierarchy:**
```
AppShell
├── TopBar (menu, search, profile/settings)
├── VisualizerToolbar (preset, HDR, dimmer)
├── ContentGrid
│   ├── SidePanel (Library, Playlists, Discovery navigation)
│   └── MainContent
│       ├── LibraryView (SplitPane: list + detail)
│       ├── PlaylistsView (SplitPane: list + detail)
│       └── DiscoveryView (SplitPane: categories + list + detail)
└── BottomPlayerBar (volume, now playing, transport, time/speed)
```

**Key Modules:**
- [`src/components/layout/AppShell.tsx`](../src/components/layout/AppShell.tsx) - Main layout scaffold
- [`src/components/player/BottomPlayerBar.tsx`](../src/components/player/BottomPlayerBar.tsx) - Persistent bottom player bar
- [`src/components/layout/SplitPane.tsx`](../src/components/layout/SplitPane.tsx) - Split-pane layout component
- [`src/components/visualizer/VisualizerToolbar.tsx`](../src/components/visualizer/VisualizerToolbar.tsx) - Visualizer controls toolbar
- [`src/components/visualizer/SceneCanvas.tsx`](../src/components/visualizer/SceneCanvas.tsx) - WebGL renderer wrapper
- [`src/lib/diagnostics/PerfEvents.ts`](../src/lib/diagnostics/PerfEvents.ts) - Performance event system

---

### 3.2 Data Flow Diagram

```
User Input (File/URL)
    ↓
TrackLoader (extract metadata, create Track)
    ↓
usePlayerStore.setQueue() → PlaybackController
    ↓
AudioEngine.load(url) → Web Audio Graph
    ├─ HTMLAudioElement (source)
    ├─ AnalyserNode (analysis)
    ├─ EQGraph (equalization)
    ├─ GainNode (volume)
    └─ Limiter → Destination (output)
    ↓
AnalyserBus (wraps AnalyserNode, provides sampling API)
    ↓
SceneController.update() (reads audio data each frame)
    ├─ Reads AnalyserBus.sample() → { low, mid, high, rms }
    ├─ Reads useVizStore → { intensity, bloom, motionScale, preset }
    └─ Updates Three.js shader uniforms
    ↓
Three.js Renderer (renders scene with audio-reactive uniforms)
    ↓
Canvas Display (visual output)
```

---

### 3.3 Key Integration Points

**Audio → State:**
- `PlaybackController` emits events that update `usePlayerStore` (position, duration, playback state)
- Store actions delegate transport operations back to `PlaybackController`

**Audio → Visualizer:**
- `AnalyserBus` provides the single source of audio analysis data
- `SceneController` reads from `AnalyserBus` in the animation frame loop
- No direct coupling: visualizer doesn't know about `AudioEngine`, only the analyser interface

**State → Visualizer:**
- `useVizStore` provides visualizer parameters (intensity, bloom, preset, HDR, dimmer)
- `SceneController` reads store state imperatively (not via React hooks) to avoid render coupling
- Quality presets from `useSettingsStore` affect visualizer performance tier

**State → UI:**
- All UI components subscribe to stores via Zustand hooks
- Stores use primitive selectors to minimize re-renders
- See [`../STATE_MANAGEMENT.md`](../STATE_MANAGEMENT.md) for selector patterns

---

## 4. Architectural Boundaries and Responsibilities

> **Visual Reference:** See [`./diagrams/cross-cutting-concerns.mmd`](./diagrams/cross-cutting-concerns.mmd) for cross-cutting concerns and integration patterns.

### 4.1 Frontend Application

The frontend is the only active runtime component at this stage.

Responsibilities:

- Render the entire user experience  
- Coordinate playback, queue management, and visualizer selection  
- Manage state and navigation inside a single browser context  
- Persist user preferences and library metadata locally  
- Respect accessibility and reduced motion preferences

For full details see:

- `./FRONTEND.md`

### 4.2 Backend and APIs

There is **no backend service in the current implementation**.

The repository includes backend and API related documents that describe possibilities for future evolution, such as:

- Remote library indexing
- Multi device sync
- Shared playlists
- Telemetry and analytics

These are design references, not active components.

For future facing designs see:

- `./BACKEND.md`  
- `./API_REFERENCE.md`

Any section in those documents that describes endpoints, queues, or external storage refers to a potential future system that may sit behind the current frontend.

---

## 5. Data and Persistence Overview

All persistent data currently lives in the browser.

### 5.1 Storage Mechanisms

- **LocalStorage**  
  - Lightweight preferences such as theme, density, and some simple flags

- **IndexedDB**  
  - Structured data such as library metadata, playlist definitions, and derived track information

- **Cache API and static assets**  
  - PWA shell, icons, and compiled bundle assets

There is no remote database, and there are no user accounts or authentication flows.

For entity level details and schemas see:

- `./DATABASE.md`

---

## 6. Observability, Diagnostics, and Runtime Behaviour

Even without a backend, the app includes diagnostics and performance features inside the frontend.

Key aspects:

- Diagnostics overlays that display frame rate and other performance signals  
- Performance guards that adapt visualizer quality to device capabilities  
- Logging hooks that can be wired to future telemetry backends if needed

For more information see:

- `./OBSERVABILITY.md`

---

## 7. DevOps, Build, and Deployment

> **Visual Reference:** See [`./diagrams/deployment-topology.mmd`](./diagrams/deployment-topology.mmd) for deployment architecture.

Ethereal Harmony builds into a static bundle that can be hosted on any static file server or static hosting platform.

Current characteristics:

- Vite build pipeline with `npm run build`  
- Output is a static asset directory suitable for static hosting  
- PWA support through manifest and service worker configuration  
- No dedicated backend infrastructure required at this stage

Future DevOps plans, including CI, CD, and potential backend deployment, are tracked here:

- `./DEVOPS.md`

---

## 8. Document Map

Use this file as the starting point for architectural questions. For deeper information, follow these links:

- Product and requirements  
  - `./PRD.md`

- Application architecture  
  - `./FRONTEND.md`  
  - `./BACKEND.md` (future design)  
  - `./DATABASE.md`  

- Integration and APIs  
  - `./API_REFERENCE.md` (future design and integration surface)

- Quality and operations  
  - `./OBSERVABILITY.md`  
  - `./DEVOPS.md`  

This document should stay aligned with the actual codebase. When architecture changes, update this index first, then update the linked documents as needed.
