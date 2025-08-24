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

## Tracing

- Not applicable (no distributed system).

## Dashboards

- In-app overlays for performance and diagnostics.

## SLOs

- Not formally defined; app is best-effort for end-user experience.


---

[← Back to Documentation Index](./README.md)
