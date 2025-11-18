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

# Glossary & Acronyms

## Domain Terms

- **Track**: A music item that can be played by the player. Contains metadata such as `title`, `artist`, `album`, `duration`, `artworkUrl`, and optional `palette`.
- **Playlist**: A user-defined collection of tracks, persisted locally (JSON export/import).
- **Visualizer Preset**: A predefined configuration of the WebGL scene (Nebula, Glass Waves, Strobe Pulse).
- **EQ (Equalizer)**: 10-band graphic equalizer with presets (Flat, Rock, Pop, Electronic, Jazz, Classical).
- **Cache Tier**: Size limits for artwork/media caching (100MB, 250MB default, 500MB, 1GB).
- **Performance Ladder**: Adaptive system that scales down bloom, particles, and buffer size when FPS < 55 for >2 seconds.
- **Telemetry**: Opt-in, anonymized performance/error metrics (FPS, tier, adaptive interventions).
- **MediaSession**: Web API that integrates playback controls with OS-level media keys and notifications.
- **Hotkeys**: Keyboard shortcuts (Space = Play/Pause, Arrows = Seek/Volume, M = Mute, R = Repeat, S = Shuffle, T = Theme, P = Presets).

## Acronyms

- **SPA**: Single Page Application  
- **PWA**: Progressive Web App  
- **FPS**: Frames per second (target: 55–60)  
- **HLS**: HTTP Live Streaming (used for stream playback)  
- **WCAG**: Web Content Accessibility Guidelines  
- **XSS**: Cross-Site Scripting (security threat mitigated via sanitization)

---

[← Back to Documentation Index](./README.md)
