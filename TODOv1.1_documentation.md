# TODO.md — Documentation & Specification Setup (Ethereal Harmony)

> Project: **Ethereal Harmony**
> Goal: Establish a complete, standardized documentation suite before starting (or expanding) implementation.
> Audience: Developers, designers, stakeholders, and future maintainers.

---

## 0) Master Project Overview

* [ ] **MASTER\_OVERVIEW\.md** ✅ (exists)

  * Purpose: Ethereal Harmony is a modern, interactive music player and visualizer built with React, Vite, and Three.js
  * Capabilities: local + streaming playback, visualizations, device management, EQ, user controls
  * Tech Stack: React 19.1.1, Vite 7.1.2, Zustand 5.0.7, Three.js 0.179.1, Framer Motion 12.23.12
  * Architecture: single-page app, no backend; HLS via hls.js where needed
  * Dev commands: vite build/test/preview, vitest, playwright
  * Risks: iOS AudioContext, WebGL differences, storage pressure, HLS CORS

**Acceptance**: Reading this doc gives new contributors a 10-min crash course into purpose, tech, and repo layout.

---

## 1) Brand & Design Identity

* [ ] **BRAND\_GUIDELINES.md**

  * Palette: Deep Indigo #1A2B45, Soft Lavender #7F6A9F, Radiant Aqua #00F0FF, Subtle Gold #FFD700
  * Typography: Montserrat (700, titles), Lato (400, body)
  * Glass tokens: `background: rgba(255,255,255,0.12); backdrop-filter: blur(16px); border: 1px solid rgba(255,255,255,0.25); border-radius: 16px`
  * Motion: Framer Motion micro-interactions (press scale, ripple)
  * Accessibility guardrails: enforce 4.5:1 contrast with fallback darken layer

**Acceptance**: UI styling consistent across components; visual identity reproducible.

---

## 2) Glossary & Domain Language

* [ ] **GLOSSARY.md**

  * “Track”: object with id, title, artist, album, durationSec, src, artworkUrl, palette
  * “Visualizer Preset”: Nebula, Glass Waves, Strobe Pulse (V1); HDR toggle opt-in
  * “Cache Tier”: 100 MB, 250 MB (default), 500 MB, 1 GB
  * “Performance Ladder”: adaptive scaling down bloom/particles/buffer when FPS < 55

**Acceptance**: Shared vocabulary across docs, code, and design.

---

## 3) Data Model & Database Schema

* [ ] **DATABASE.md**

  * Entities: `Track`, `PlayerState`, `VizState`, `Playlist`
  * Persistence: IndexedDB for audio chunks + metadata; Cache API for artwork; Zustand persist for settings
  * Example:

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

  * Retention: local-only; manual purge via cache controls

**Acceptance**: ERD or schema diagram clear; matches implemented stores.

---

## 4) API & Integration Specs

* [ ] **API\_SPEC.md**

  * Internal APIs: TrackLoader (file/stream), PlaybackController (play, pause, seek), AnalyserBus (FFT), MediaSession API
  * External: none (except HLS streaming via hls.js, native Safari)
  * Security: enforce HTTPS, URL guard rejects non-HTTPS

**Acceptance**: Clear mapping of internal module APIs to their components; no ambiguity about integrations.

---

## 5) State & Logic Layer

* [ ] **STATE\_MANAGEMENT.md**

  * Store structure:

    * `usePlayerStore`: queue, currentIndex, isPlaying, volume, repeat, shuffle
    * `useVizStore`: visualizer params (intensity, bloom, motionScale, theme)
    * `useSettingsStore`: theme, density, telemetryOptIn, cacheSize
    * `useUIStore`: modals, toasts, layout flags

**Acceptance**: All features can extend stores without breaking architecture.

---

## 6) Accessibility & Compliance

* [ ] **ACCESSIBILITY.md**

  * Standard: WCAG 2.1 AA
  * Keyboard shortcuts: Space (play/pause), Left/Right (seek), Up/Down (volume), M (mute), R (repeat), S (shuffle), T (theme), P (preset)
  * Focus: Radiant Aqua visible ring + inner contrast outline
  * Reduced motion: clamp heavy viz animations

**Acceptance**: Keyboard parity confirmed; contrast and reduced motion validated with automated tools.

---

## 7) Security & Privacy

* [ ] **SECURITY\_POLICY.md**

  * HTTPS only for streams
  * Metadata sanitization before DOM render
  * No telemetry by default; opt-in only, anonymized metrics
  * Data deletion: purge button clears IndexedDB + Cache API

**Acceptance**: Mixed-content/XSS impossible; telemetry requires explicit consent.

---

## 8) Testing & QA Plan

* [ ] **TEST\_PLAN.md**

  * Unit tests: 100% coverage for stores/utils (Vitest)
  * Component tests: React Testing Library for Player UI, Library, Settings
  * E2E: Playwright smoke (import file → play → seek → adjust volume → toggle preset)
  * A11y tests: Storybook with aXe add-on
  * Perf tests: Lighthouse automated run on PR

**Acceptance**: CI green; coverage targets hit; no blocking a11y/perf issues.

---

## 9) Project Management & Workflow

* [ ] **WORKFLOWS.md**

  * Git: main + feature branches, PR reviews
  * Commit style: Conventional Commits (feat, fix, docs, chore)
  * CI: vite build/test, vitest, playwright in pipeline
  * Releases: semver, with “What’s New” modal shown once per version

**Acceptance**: Contributor can follow branching + PR rules without asking.

---

## 10) Roadmap & Parking Lot

* [ ] **ROADMAP.md**

  * Phases:

    * Phase 1: App shell + stores + probe/overlay
    * Phase 2: Audio engine + playback + EQ panel
    * Phase 3: Visualizer MVP + presets
    * Phase 4: Library + Settings + Share/Stream Wizard
  * V1.1: extra EQ presets, optional CDN release notes, crossfade
  * V2: profiles/follows, collaborative playlists, casting
  * Risks: ALAC decode, iOS gesture gate, WebGL precision, storage eviction, HLS CORS

**Acceptance**: Roadmap captures what’s in/out for V1, V1.1, V2.

---

### Deliverables Summary (Docs Phase Exit)

* [x] MASTER\_OVERVIEW\.md (done)
* [ ] BRAND\_GUIDELINES.md
* [ ] GLOSSARY.md
* [ ] DATABASE.md
* [ ] API\_SPEC.md
* [ ] STATE\_MANAGEMENT.md
* [ ] ACCESSIBILITY.md
* [ ] SECURITY\_POLICY.md
* [ ] TEST\_PLAN.md
* [ ] WORKFLOWS.md
* [ ] ROADMAP.md
