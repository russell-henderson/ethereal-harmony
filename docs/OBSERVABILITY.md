> Part of [Ethereal Harmony Documentation](./README.md)

**Quick Links**  
**Core**: [Overview](./MASTER_OVERVIEW.md) · [Roadmap](./ROADMAP.md) · [Brand](./BRAND_GUIDELINES.md) · [Glossary](./GLOSSARY.md)  
**Architecture**: [Frontend](./FRONTEND.md) · [Backend](./BACKEND.md) · [DevOps](./DEVOPS.md) · [Database](./DATABASE.md) · [API Ref](./API_REFERENCE.md)  
**Quality**: [Accessibility](./ACCESSIBILITY.md) · [Security](./SECURITY.md) · [Performance](./PERFORMANCE.md) · [Observability](./OBSERVABILITY.md) · [Test Plan](./TEST_PLAN.md) · [Workflows](./WORKFLOWS.md)  
**People**: [Onboarding](./ONBOARDING.md) · [Contributing](./CONTRIBUTING.md)  
**Deep Links**: [ADRs](./ADR) · [Diagrams](./diagrams) · [Security Reviews](./security) · [Ops/Runbooks](./ops) · [Reports](./reports) · [Images](./images/ui-overview.png)

# Observability Documentation

## Logging

- No server-side logging; browser console is used for diagnostics.
- Performance and error overlays available in-app.

## Metrics

- FPS, frame time, and memory usage sampled in-browser (see `src/lib/diagnostics/PerfEvents.ts`).
- No external metrics or dashboards.

### Performance Guard Architecture

Ethereal Harmony uses a two-layer performance guard system to maintain smooth 55-60 FPS:

#### 1. AdaptiveGuard (Primary System)
- **Location:** `src/lib/diagnostics/AdaptiveGuard.ts`
- **Purpose:** High-level quality tier management based on sustained performance metrics
- **How it works:**
  - Listens to `PerfEvents.onTick()` for FPS, long-frame ratio, and busy-percent signals
  - Applies quality tier changes (ultra → high → balanced → low → minimal) with hysteresis
  - Degrades quickly on sustained issues (2s threshold), upgrades slowly after sustained headroom (5s threshold)
  - Persists tier preference in LocalStorage
  - Emits CustomEvents (`eh:adaptive:apply`, `eh:viz:quality`) for visualizer integration
- **Integration:** Works with `useVizStore` to apply quality presets, or falls back to CustomEvent broadcasting

#### 2. FpsGuard (Component-Level)
- **Location:** `src/lib/utils/FpsGuard.ts` (simple) and `src/lib/diagnostics/FpsGuard.ts` (advanced)
- **Purpose:** Component-specific FPS monitoring and adjustment
- **How it works:**
  - Simple version (`utils/FpsGuard.ts`): Basic EMA-based FPS tracking with up/down callbacks
  - Advanced version (`diagnostics/FpsGuard.ts`): Quality ladder system that adjusts:
    1. Bloom on/off
    2. Anti-aliasing on/off
    3. Particle count (12.5% steps)
    4. Buffer scale (0.05 steps)
  - Used by visualizer components (e.g., `ParticlesField`) for local quality adjustments
- **Relationship:** Works alongside AdaptiveGuard but operates at a more granular, component-specific level

#### Decision Model

- **AdaptiveGuard** is the primary system for app-wide quality management
- **FpsGuard** (diagnostics version) provides fine-grained visualizer controls
- **FpsGuard** (utils version) is used by individual components for local adjustments
- Both systems use hysteresis to avoid thrashing
- Quality adjustments respect reduced motion preferences (see `src/lib/utils/ReducedMotion.ts`)

## Tracing

- Not applicable (no distributed system).

## Dashboards

- In-app overlays for performance and diagnostics.

## SLOs

- Not formally defined; app is best-effort for end-user experience.

---

[← Back to Documentation Index](./README.md)
