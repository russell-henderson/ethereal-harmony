> Part of [Ethereal Harmony Documentation](./README.md)

**Quick Links**  
**Core**: [Overview](./MASTER_OVERVIEW.md) · [Roadmap](./ROADMAP.md) · [Brand](./BRAND_GUIDELINES.md) · [Glossary](./GLOSSARY.md)  
**Architecture**: [Frontend](./FRONTEND.md) · [Backend](./BACKEND.md) · [DevOps](./DEVOPS.md) · [Database](./DATABASE.md) · [API Ref](./API_REFERENCE.md)  
**Quality**: [Accessibility](./ACCESSIBILITY.md) · [Security](./SECURITY.md) · [Performance](./PERFORMANCE.md) · [Observability](./OBSERVABILITY.md) · [Test Plan](./TEST_PLAN.md) · [Workflows](./WORKFLOWS.md)  
**People**: [Onboarding](./ONBOARDING.md) · [Contributing](./CONTRIBUTING.md)  
**Deep Links**: [ADRs](./ADR) · [Diagrams](./diagrams) · [Security Reviews](./security) · [Ops/Runbooks](./ops) · [Reports](./reports) · [Images](./images/ui-overview.png)

# Ethereal Harmony — Product Requirements Document (PRD)

## 1. Executive Summary

**Ethereal Harmony** is a premium single-page web application (SPA) music player that fuses high-fidelity audio playback with an immersive, audio-reactive WebGL visualizer. It delivers a polished glassmorphism UI with fluid Material-style interactions, optimized for performance, accessibility, and privacy.

**Vision:** Create an atmosphere of deep, focused listening by pairing responsive playback controls with dynamic but non-distracting visuals. Success is measured by smooth performance, intuitive usability, and emotional resonance with music.

**Primary Audience:**

* Music listeners who value immersive experiences.
* Audiophiles who care about EQ, lossless playback, and device control.
* Power users who demand performance, keyboard control, and offline support.

---

## 2. Guiding Principles

1. **Visuals Enhance, Never Distract** — The WebGL background deepens the music experience without competing with playback.
2. **Performance as Foundation** — 55–60 FPS is mandatory on mid-range devices. Adaptive quality guardrails preserve immersion under load.
3. **Accessibility by Design** — WCAG AA, full keyboard navigation, ARIA-compliant controls, and reduced-motion support.
4. **Privacy and Trust** — All data is local-first. Telemetry is strictly opt-in and anonymized.
5. **Simplicity Through Curation** — A curated set of presets and controls ensures power without clutter.

---

## 3. Scope (V1)

### Core Features

* **Playback:** Local files, HTTPS streams, HLS (Chromium via hls.js, Safari native). Queue, repeat, shuffle, seek, volume, mute.
* **Audio Engine:** Web Audio API with 10-band EQ, presets (Flat, Rock, Pop, Electronic), safe limiter, device switching.
* **Visualizer:** WebGL scene with presets (Nebula, Glass Waves, Strobe Pulse), sliders for intensity, motion, bloom, HDR/dimmer toggles.
* **Library & Playlists:** Virtualized track list, search, M3U/PLS import, JSON export, album-art accent theming.
* **Settings & Diagnostics:** Theme toggle, density control, cache management, performance overlay, telemetry consent.
* **Offline & PWA:** IndexedDB cache for audio/artwork, installable PWA shell, first-launch “What’s New” modal.

### Non-Goals for V1

* Casting integrations (Chromecast, AirPlay, DLNA).
* Crossfade and gapless playback.
* Profiles, social features, collaborative playlists.
* Mic/live input visualizer.

---

## 4. Tech Stack

* **Framework:** React 18 + TypeScript + Vite.
* **State:** Zustand (domain stores: `usePlayerStore`, `useVizStore`, `useSettingsStore`, `useUIStore`).
* **Rendering:** Three.js (WebGLRenderer).
* **Motion:** Framer Motion.
* **Audio:** Web Audio API; hls.js for HLS streaming.
* **Storage:** IndexedDB + Cache API; localStorage (persisted settings).
* **Build Tools:** Vitest, React Testing Library, Playwright, Storybook.

---

## 5. Architecture & File Layout

```
ethereal-harmony/
  public/manifest.webmanifest
  src/
    app/ { App.tsx, providers/ThemeProvider.tsx, MotionProvider.tsx, ErrorProvider.tsx }
    components/
      layout/ { AppShell.tsx, TopBar.tsx, SidePanel.tsx }
      player/ { PlayerCard.tsx, PlaybackButtons.tsx, TransportBar.tsx, Timeline.tsx,
                VolumeSlider.tsx, TrackInfo.tsx, AlbumArt.tsx }
      visualizer/ { WebGLCanvas.tsx, PresetSelector.tsx, HdrToggle.tsx, DimmerToggle.tsx }
      library/ { LibraryView.tsx, TrackList.tsx, PlaylistList.tsx, SearchBar.tsx, Filters.tsx }
      settings/ { SettingsModal.tsx, ThemeControls.tsx, VisualizerControls.tsx, AudioDevicePicker.tsx }
      feedback/ { ErrorBoundary.tsx, Toasts.tsx, LoadingOverlay.tsx }
    lib/
      audio/ { AudioEngine.ts, TrackLoader.ts, PlaybackController.ts, AnalyserBus.ts, EQGraph.ts, Limiter.ts }
      three/ { VisualizerScene.ts, SceneController.ts, VisualizerParams.ts,
               components/{ParticlesField.ts, MistLayers.ts, PostProcessing.ts} }
      state/ { usePlayerStore.ts, useVizStore.ts, useSettingsStore.ts, useUIStore.ts }
      utils/ { mediaSession.ts, urlGuard.ts, fpsMeter.ts, hotkeys.ts, focusRing.ts }
    styles/ { globals.css, tokens.css }
    index.tsx
```

---

## 6. Data & State Model

**Track**

```ts
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

**PlayerState**

```ts
type PlayerState = {
  queue: Track[]
  currentIndex: number
  isPlaying: boolean
  volume: number
  currentTimeSec: number
  deviceId?: string
  repeat: "off" | "one" | "all"
  shuffle: boolean
}
```

**VizState**

```ts
type VizState = {
  theme: "dark" | "system"
  params: {
    baseColor: string
    reactiveHue: string
    accent: string
    intensity: number
    particleCount: number
    bloom: number
    motionScale: number
    smooth: number
  }
}
```

---

## 7. Visual Design System

* **Palette:** Deep Indigo `#1A2B45`, Soft Lavender `#7F6A9F`, Radiant Aqua `#00F0FF`, Subtle Gold `#FFD700`.
* **Glass Tokens:**
  `background: rgba(255,255,255,0.12)`
  `backdrop-filter: blur(16px)`
  `border: 1px solid rgba(255,255,255,0.25)`
  `border-radius: 16px`
* **Typography:** Montserrat (700) for titles, Lato (400) for body.
* **Accessibility:** Aqua focus ring with 2px outer + 1px contrast inner; reduced-motion variants.

---

## 8. Performance Strategy

* **Cold Start:** < 2 seconds to first interactive on desktop Chrome.
* **Frame Rate:** Maintain 55–60 FPS with adaptive ladder (reduce bloom, particles, buffer scale).
* **Lazy Loading:** Visualizer code (Three.js + shaders) deferred until playback starts.
* **Diagnostics:** Perf overlay, tiering probe, adaptive guard.

---

## 9. Accessibility & Input

* **Keyboard Shortcuts:**
  Space (play/pause), ←/→ (seek), ↑/↓ (volume), M (mute), R (repeat), S (shuffle), T (theme), P (preset).
* **Screen Readers:** All controls labeled with ARIA roles.
* **WCAG AA:** 4.5:1 text contrast enforced against glass surfaces.

---

## 10. Security & Privacy

* **Secure Origins:** Only HTTPS streams allowed.
* **Metadata Sanitization:** Strip unsafe content from ID3/sidecar metadata before rendering.
* **Local-First:** All data stored locally (IndexedDB, localStorage).
* **Telemetry:** Opt-in only; collects performance tier, avg FPS, adaptive actions, anonymized errors.

---

## 11. Error Handling & Resilience

* **ErrorBoundary & ErrorProvider:** Catch render/runtime errors, normalize thrown values, show recovery UI.
* **WebGL Fallback:** If context fails, show animated gradient instead of crashing.
* **Audio Errors:** Non-blocking toast with retry and device check suggestions.

---

## 12. Phased Delivery

1. **Phase 1: Foundation**

   * AppShell, TopBar, SidePanel, stores, diagnostics overlay.
   * Acceptance: cold start < 2s, keyboard focus cycle.

2. **Phase 2: Core Audio + Player UI**

   * AudioEngine, TrackLoader, PlaybackController, EQ, Transport controls.
   * Acceptance: play local file or HTTPS stream, smooth seek/volume.

3. **Phase 3: Visualizer**

   * WebGLCanvas, VisualizerScene, ParticlesField, HDR/dimmer toggles.
   * Acceptance: preset switching works, 55–60 FPS maintained.

4. **Phase 4: Library + Settings**

   * LibraryView, TrackList, PlaylistList, SettingsModal, CacheControls.
   * Acceptance: import/export works at scale, cache UI accurate, What’s New modal shows once.

---

## 13. Risks & Mitigations

* **ALAC variability:** Fallback to HTMLMediaElement.
* **Safari WebGL differences:** Provide WebGL1 path and precision guards.
* **iOS autoplay:** Require first user gesture to resume AudioContext.
* **Mobile storage pressure:** Visible cache tiers, purge button.

---

## 14. Future Candidates (Post-V1)

* Additional EQ presets (Jazz, Classical).
* Crossfade and gapless playback.
* Casting (Chromecast, AirPlay, DLNA).
* Collaborative playlists and profiles.
* Mic/live input visualizer mode.

---

[← Back to Documentation Index](./README.md)
