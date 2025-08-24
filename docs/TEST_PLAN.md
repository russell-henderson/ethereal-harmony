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

## Testing Levels

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

- Unit + Component tests ≥ 95% coverage.
- All E2E scenarios green on CI.
- No critical accessibility violations.
- Perf budget maintained (<2s cold start, sustained FPS).

---

[← Back to Documentation Index](./README.md)
