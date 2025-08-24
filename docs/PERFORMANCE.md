> Part of [Ethereal Harmony Documentation](./README.md)

**Quick Links**  
**Core**: [Overview](./MASTER_OVERVIEW.md) · [Roadmap](./ROADMAP.md) · [Brand](./BRAND_GUIDELINES.md) · [Glossary](./GLOSSARY.md)  
**Architecture**: [Frontend](./FRONTEND.md) · [Backend](./BACKEND.md) · [DevOps](./DEVOPS.md) · [Database](./DATABASE.md) · [API Ref](./API_REFERENCE.md)  
**Quality**: [Accessibility](./ACCESSIBILITY.md) · [Security](./SECURITY.md) · [Performance](./PERFORMANCE.md) · [Observability](./OBSERVABILITY.md) · [Test Plan](./TEST_PLAN.md) · [Workflows](./WORKFLOWS.md)  
**People**: [Onboarding](./ONBOARDING.md) · [Contributing](./CONTRIBUTING.md)  
**Deep Links**: [ADRs](./ADR) · [Diagrams](./diagrams) · [Security Reviews](./security) · [Ops/Runbooks](./ops) · [Reports](./reports) · [Images](./images/ui-overview.png)

# Performance & Scalability

## Bottlenecks & Hotspots

- Visualizer rendering (WebGL/Three.js) is the main performance hotspot.
- Audio playback is lightweight; bottlenecks are rare.

## Caching Layers

- No HTTP or CDN caching; all assets are static and loaded via Vite.

## Load/Soak Test Plan

- Manual browser testing on a range of devices and browsers.
- Use in-app FPS and performance overlays to monitor.

## Performance Budgets

- Target 60 FPS on modern hardware.
- Bundle size kept minimal by lazy-loading heavy dependencies (e.g., hls.js).

## Autoscaling Policies

- Not applicable (static SPA, no backend).


---

[← Back to Documentation Index](./README.md)
