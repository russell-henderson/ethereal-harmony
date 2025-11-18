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

# Test Plan

This document defines the QA framework for Ethereal Harmony.

---

## Current State

> **As of 2025-01-27:**
> 
> - **Vitest and Playwright are configured** in `package.json` with test scripts (`npm run test`, `npm run test:ui`, `npm run e2e`)
> - **No meaningful tests exist yet.** There are no test files (`.test.ts`, `.test.tsx`, `.spec.ts`, `.spec.tsx`) in the repository
> - **Test infrastructure is ready** but needs implementation

The sections below describe the testing strategy and future goals. The "First Test Suites" section below outlines the concrete next steps to establish a testing baseline.

---

## First Test Suites to Implement

The following three test suites should be implemented first to establish a minimum viable testing baseline:

### 1. Core State Stores

**Location:** `src/lib/state/`

**Target Files:**
- `usePlayerStore.ts` - Playback state, queue, currentIndex, repeat, shuffle, volume
- `useVizStore.ts` - Visualizer parameters (intensity, bloom, motionScale, preset)
- `useSettingsStore.ts` - Theme, density, view routing, settings
- `useUIStore.ts` - Modals, toasts, layout flags, side panel visibility

**Test Coverage:**
- Default state and initial values
- Core actions (play, pause, queue operations, view changes, quality preset changes)
- State persistence (LocalStorage integration)
- Store selectors and computed values

**Example Test Cases:**
- `usePlayerStore` initializes with empty queue and paused state
- Adding tracks to queue updates state correctly
- Play/pause actions toggle `isPlaying` state
- Volume changes persist and update state
- Repeat and shuffle modes toggle correctly

---

### 2. Audio Engine and Playback Controller

**Location:** `src/lib/audio/`

**Target Files:**
- `AudioEngine.ts` - Core audio playback, state, and event handling
- `PlaybackController.ts` - Orchestrates playback, queue, repeat/shuffle, event forwarding
- `TrackLoader.ts` - Loads local files or streams (HTTPS/HLS)

**Test Coverage:**
- AudioEngine initialization and cleanup
- Track loading (local files and URLs)
- Playback control (play, pause, seek, next, prev)
- Queue management and repeat/shuffle logic
- Error handling for unsupported formats or network failures

**Example Test Cases:**
- AudioEngine initializes AudioContext correctly
- TrackLoader creates Track objects from file inputs
- PlaybackController handles queue navigation (next/prev)
- Repeat modes (off, one, all) work correctly
- Seek operations update currentTime accurately
- Error handling for invalid audio sources

---

### 3. Critical UI Flows

**Location:** `src/components/player/` and integration tests

**Target Components:**
- `PlayerCard.tsx` - Main player interface
- `TransportBar.tsx` - Playback controls
- `Timeline.tsx` - Progress and seek
- `LocalFileLoader.tsx` - File upload

**Test Coverage (E2E with Playwright):**
- Load track: User uploads a file, track appears in queue
- Play: User clicks play, audio starts, UI reflects playing state
- Pause: User clicks pause, audio stops, UI reflects paused state
- Seek: User drags timeline, audio seeks to new position

**Example Test Scenarios:**
1. **Load and Play Flow:**
   - Upload audio file via `LocalFileLoader`
   - Verify track appears in queue
   - Click play button
   - Verify `isPlaying` state is true
   - Verify play button icon changes to pause

2. **Seek Flow:**
   - Start playback
   - Click/drag on timeline to new position
   - Verify `currentTime` updates
   - Verify audio position matches timeline

3. **Pause Flow:**
   - While playing, click pause button
   - Verify `isPlaying` state is false
   - Verify pause button icon changes to play

---

## Testing Levels (Future Goals)

1. **Unit Tests** (Vitest)
   - Target: 100% coverage on `usePlayerStore`, `useVizStore`, `useSettingsStore`, `useUIStore`.
   - Pure utility functions (Hotkeys, UrlGuard, ContrastCheck).

2. **Component Tests** (React Testing Library)
   - Player UI: `PlayerCard`, `TransportBar`, `VolumeSlider`.
   - Library UI: `LibraryView`, `TrackList`, `SearchBar`.
   - Settings: `SettingsModal`, `CacheControls`, `EqPanel`.

3. **Integration Tests**
   - Playback pipeline: import → play → seek → pause.
   - Visualizer response to analyser data.

4. **End-to-End Tests** (Playwright)
   - Happy path: user imports a track, plays it, adjusts volume, switches preset.
   - Error cases: invalid stream URL rejected, WebGL fallback activated.

5. **Performance Tests**
   - Lighthouse runs on CI.
   - Target: TTI < 2s, FPS ≥ 55 on reference machine.

6. **Accessibility Tests**
   - aXe automated checks.
   - Storybook a11y snapshots.
   - Manual keyboard navigation test.

---

## Acceptance Gates

### Current Milestone (First Phase)

- ✅ Core state stores have unit tests covering default state and core actions
- ✅ Audio engine and playback controller have unit tests for critical paths
- ✅ At least one E2E smoke test for load → play → pause → seek flow
- ✅ All tests pass locally and in CI

### Future Goals (Post-First Phase)

- Unit + Component tests ≥ 95% coverage
- All E2E scenarios green on CI
- No critical accessibility violations
- Perf budget maintained (<2s cold start, sustained FPS)

---

[← Back to Documentation Index](./README.md)
