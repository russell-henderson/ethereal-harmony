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

# Roadmap

This document tracks Ethereal Harmony’s phases, milestones, and future enhancements.

---

## Phase Plan

### Phase 1 — Foundation

- App shell (TopBar, SidePanel, PlayerCard).
- Zustand stores with persist.
- Hotkeys + error handling.
- Perf probe + overlay.

**Checkpoint**: App loads, basic queue and playback controls work.

---

### Phase 2 — Core Audio & Playback

- Audio engine (AudioEngine, TrackLoader, PlaybackController).
- EQ engine + presets (Flat, Rock, Pop, Electronic).
- Volume, mute, shuffle, repeat.

**Checkpoint**: MP3 + HTTPS/HLS playback with EQ changes and hotkeys.

---

### Phase 3 — Visualizer MVP

- WebGLCanvas with VisualizerScene.
- Presets: Nebula, Glass Waves, Strobe Pulse.
- HDR toggle, Dimmer toggle, intensity/bloom controls.

**Checkpoint**: Visualizer responds to audio with FPS ≥ 55.

---

### Phase 4 — Library & Settings

- LibraryView with TrackList virtualization.
- Import/Export (M3U, PLS, JSON).
- Settings modal (theme, viz, audio device, cache).
- Stream Test Wizard + Share dialog.

**Checkpoint**: Large library import, settings persist, telemetry opt-in works.

---

## Roadmap Beyond V1

- **V1.1**:
  - More EQ presets (Jazz, Classical).
  - Optional CDN release notes.
  - Crossfade playback.

- **V2**:
  - Profiles and follows.
  - Collaborative playlists.
  - Casting integrations (Chromecast, DLNA).
  - Voice search and mic-driven visualizer.

---

## Risk Register

- iOS gesture requirement (resume AudioContext on interaction).
- WebGL compatibility (WebGL1 fallback).
- Storage eviction on mobile (cache controls visible).
- HLS CORS/MIME issues (Stream Test Wizard ensures checks).

---

## KPIs

- Cold start < 2s on Tier 1 desktop Chrome.
- Sustained 55–60 FPS on Tier 2 hardware.
- Accessibility parity (keyboard, contrast).
- Import throughput for 1k+ tracks.
- Playback error rate < 2%.

---

[← Back to Documentation Index](./README.md)
