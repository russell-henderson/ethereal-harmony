> Part of [Ethereal Harmony Documentation](./README.md)

**Quick Links**  
**Core**: [Overview](./MASTER_OVERVIEW.md) · [Roadmap](./ROADMAP.md) · [Brand](./BRAND_GUIDELINES.md) · [Glossary](./GLOSSARY.md)  
**Architecture**: [Frontend](./FRONTEND.md) · [Backend](./BACKEND.md) · [DevOps](./DEVOPS.md) · [Database](./DATABASE.md) · [API Ref](./API_REFERENCE.md)  
**Quality**: [Accessibility](./ACCESSIBILITY.md) · [Security](./SECURITY.md) · [Performance](./PERFORMANCE.md) · [Observability](./OBSERVABILITY.md) · [Test Plan](./TEST_PLAN.md) · [Workflows](./WORKFLOWS.md)  
**People**: [Onboarding](./ONBOARDING.md) · [Contributing](./CONTRIBUTING.md)  
**Deep Links**: [ADRs](./ADR) · [Diagrams](./diagrams) · [Security Reviews](./security) · [Ops/Runbooks](./ops) · [Reports](./reports) · [Images](./images/ui-overview.png)

# TODO.md — Ethereal Harmony V1 “Ready‑to‑Ship” Checklist

> Stack: React 18 + TypeScript + Vite • Zustand domain stores • Three.js WebGLRenderer • Framer Motion • Web Audio API • PWA. Visual style: glassmorphism (radius 16px, blur 16px, rgba(255,255,255,0.12), 1px rgba(255,255,255,0.25)) with the core palette Deep Indigo, Soft Lavender, Radiant Aqua.

---

## 0) Ship Gates (must all be ✅ before release)

* [ ] Cold start to interactive ≤ \~2s on desktop Chrome; app installable as PWA.
* [ ] Visualizer holds 55–60 FPS on Tier‑2 desktop; adaptive guard engages under load.
* [ ] Keyboard parity + WCAG AA contrast on glass; reduced‑motion respected.
* [ ] HTTPS streams only; HLS works on Chromium (hls.js) and Safari (native).
* [ ] MediaSession integration (title/art, hardware keys).
* [ ] Library import/export stable at scale; cache meter accurate with purge.

---

## 1) App Shell & State (Foundation)

* [ ] **App shell** with regions: `TopBar`, `SidePanel`, `Main`, `PlayerCard` (store‑driven view switcher in V1).
* [ ] **Providers** loaded early (theme, motion, error). Files exist as in blueprint.
* [ ] **Stores**: `usePlayerStore`, `useVizStore`, `useSettingsStore`, `useUIStore` with persist for theme, density, volume, viz params, repeat, shuffle, deviceId.
* [ ] **Diagnostics**: first‑launch probe assigns device tier; overlay toggle (Ctrl+Shift+D).

**Acceptance**: Tab order TopBar → SidePanel → PlayerCard; focus ring visible; rehydration before first paint.

---

## 2) Core Audio & Transport

* [ ] `AudioEngine` graph: `AudioContext` → master `GainNode` → limiter → analyser.
* [ ] `TrackLoader`: local Files + HTTPS URL + HLS via `HlsController`.
* [ ] `PlaybackController`: `play/pause/seek/next/prev`, repeat (“off|one|all”), shuffle.
* [ ] `DeviceManager`: enumerate/switch output device (where supported).
* [ ] MediaSession metadata + hardware keys.

**Acceptance**: MP3/AAC file + HTTPS stream + HLS play smoothly; limiter on by default toggleable in Settings.

---

## 3) Player UI (Accessible Controls)

* [ ] `PlayerCard` hosts `AlbumArt`, `TrackInfo`, `TransportBar`, `Timeline`, `VolumeSlider`.
* [ ] `PlaybackButtons`: Prev / Play‑Pause / Next / Shuffle / Repeat with `aria-pressed`. Shortcuts: Space, M, R, S.
* [ ] `Timeline`: smooth progress + keyboard scrub (Left/Right).
* [ ] `VolumeSlider`: 0–1, live percent to SR; Up/Down adjust; M mute.
* [ ] `EqPanel`: 10‑band graph with presets Flat, Rock, Pop, Electronic (V1).

**Acceptance**: Touch targets ≥44px; no clicks/pops switching EQ; Space toggles play; SR announces state.

---

## 4) Visualizer MVP

* [ ] `WebGLCanvas` lifecycle + context loss handler; lazy‑loaded Three.js.
* [ ] Scene: `ParticlesField`, `MistLayers`, `PostProcessing` (SMAA/FXAA, bloom).
* [ ] Wire analyser bands (low/mid/high) as uniforms; motion/intensity params.
* [ ] Presets: Nebula, Glass Waves, Strobe Pulse; HDR toggle (opt‑in); “Dimmer” (caps bloom/exposure).

**Acceptance**: Preset switch instant; FPS ≥55; reduced‑motion path clamps large moves.

---

## 5) Library, Playlists, Discovery

* [ ] `LibraryView` + virtualized `TrackList`; shared debounced `SearchBar`.
* [ ] Import dialog: Files/folders; parse metadata (title/artist/album/duration/artwork).
* [ ] Playlists: create/rename/delete/add/remove; M3U/PLS import; JSON export.
* [ ] Discovery smart crates: Recently Added / Most Played / Not Played.

**Acceptance**: 1k+ items scroll at 55–60 FPS; search filters library/playlists; export includes full metadata.

---

## 6) Settings, Cache, What’s New

* [ ] `SettingsModal` tabs: Theme & Density; Visualizer Controls; Audio Device; Cache Controls; Telemetry (opt‑in).
* [ ] Cache tiers UI: 100 MB / 250 MB (default) / 500 MB / 1 GB + purge.
* [ ] “What’s New” modal shows once per version; reachable via Settings.

**Acceptance**: Meter accurate; purge clears artwork/sidecars safely; telemetry remains off by default.

---

## 7) Streaming & Share

* [ ] **Stream Test Wizard**: URL, CORS, MIME, redirects, latency; clear toasts.
* [ ] **Share Dialog** for track/playlist metadata.

**Acceptance**: Wizard validates HLS readiness; share sheet copies rich data.

---

## 8) Accessibility (AA) Pass

* [ ] Visible Radiant‑Aqua focus ring + inner contrast outline across all controls.
* [ ] Dialogs: proper roles, labelled, focus‑trapped, Esc closes.
* [ ] Lists: roving tabindex; Enter plays; Menu key opens “more”.
* [ ] Contrast on glass validated with darken layer where needed.

**Acceptance**: aXe shows no critical issues; manual keyboard audit passes.

---

## 9) Performance Guardrails

* [ ] First‑launch probe (≈2s) assigns tier; adaptive ladder reduces bloom/particles/buffer scale to hold frame budget.
* [ ] Lazy‑load Three/shaders; memoized Zustand selectors; debounce search.
* [ ] Palette extraction in Web Worker.

**Acceptance**: Average FPS within target during playback and UI interactions.

---

## 10) Security & Resilience

* [ ] Enforce HTTPS for remote audio; URL guard + MIME checks.
* [ ] Sanitize metadata strings before rendering.
* [ ] ErrorBoundary wraps app; WebGL fallback to CSS gradient if init fails.

**Acceptance**: Failures produce non‑blocking toasts; app remains usable.

---

## 11) QA & CI

* [ ] Unit tests for stores/utils (Vitest); RTL for Player/Settings; Playwright smoke: import → play → seek → volume → settings → preset swap.
* [ ] Lighthouse perf & a11y budgets in CI.
* [ ] Storybook for primitives/PlayerCard with a11y addon.

**Acceptance**: CI green; budgets respected; smoke passes on PR.

---

## 12) Release Pack

* [ ] Versioned build; “What’s New” JSON updated; modal shown once per version.
* [ ] Product sheet and quick‑start docs under `/docs`.

---

## Parking‑Lot for V1.1 / V2 (don’t block V1)

* Panel Layout Manager with unlockable/resizable panels.
* Additional EQ presets (Jazz, Classical), crossfade, casting, CDN release notes.
* Profiles/follows, collaborative playlists, voice search/mic visualizer.

---

### Quick Run-of-Show (Cursor order)

1. App shell + stores + probe/overlay → 2) Audio engine + transport → 3) Player UI →
2. Visualizer MVP → 5) Library/Playlists/Import → 6) Settings/Cache/What’s New →
3. Streaming wizard/share → 8) A11y & perf hardening → 9) QA/CI → 10) Release.

> This checklist aligns with the locked blueprint and build plan. Checking every box yields a V1 that meets the performance, accessibility, privacy, and feature targets we set.


---

[← Back to Documentation Index](./README.md)
