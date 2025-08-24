# Ethereal Harmony Documentation Index

This folder contains all core documentation for the Ethereal Harmony project.  
Each file covers a specific domain, from vision and design to implementation, security, and QA.

---

## 1. High-Level Overview

- [MASTER_OVERVIEW.md](./MASTER_OVERVIEW.md)  
  Purpose, architecture, tech stack, repo structure, risks.

- [ROADMAP.md](./ROADMAP.md)  
  Phase plan (Foundation → Playback → Visualizer → Library/Settings → Polish), milestones, future features, risks.

---

## 2. Design & Branding

- [BRAND_GUIDELINES.md](./BRAND_GUIDELINES.md)  
  Color palette, typography, glass tokens, accessibility guardrails.

- [GLOSSARY.md](./GLOSSARY.md)  
  Domain-specific terms and acronyms (Track, Preset, Cache Tier, etc.).

---

## 3. Data & APIs

- [DATABASE.md](./DATABASE.md)  
  Data models (Track, Playlist, Settings, Player, Viz), local storage strategy.

- [STATE_MANAGEMENT.md](./STATE_MANAGEMENT.md) *(optional)*  
  Details on Zustand stores, state persistence, selectors.

- [API_REFERENCE.md](./API_REFERENCE.md)  
  Internal module APIs (AudioEngine, PlaybackController, AnalyserBus, VisualizerScene).

---

## 4. Engineering Quality

- [PERFORMANCE.md](./PERFORMANCE.md)  
  Bottlenecks, performance budgets, adaptive guard, test plan.

- [OBSERVABILITY.md](./OBSERVABILITY.md)  
  Logs, metrics, diagnostics overlay, SLOs.

- [TEST_PLAN.md](./TEST_PLAN.md)  
  Unit/component/E2E testing strategy, perf & accessibility testing.

- [WORKFLOWS.md](./WORKFLOWS.md)  
  Git branching, commit conventions, CI/CD, release strategy.

---

## 5. Accessibility & Security

- [ACCESSIBILITY.md](./ACCESSIBILITY.md)  
  Keyboard navigation, shortcuts, screen reader roles, focus styles, contrast rules.

- [SECURITY.md](./SECURITY.md)  
  Threat model, HTTPS enforcement, metadata sanitization, cache purge, telemetry rules.

---

## Quick Start for New Contributors

1. Read [MASTER_OVERVIEW.md](./MASTER_OVERVIEW.md) to understand the purpose and stack.  
2. Skim [BRAND_GUIDELINES.md](./BRAND_GUIDELINES.md) and [ACCESSIBILITY.md](./ACCESSIBILITY.md) to design/code correctly.  
3. Check [ROADMAP.md](./ROADMAP.md) to see current phase.  
4. Follow [WORKFLOWS.md](./WORKFLOWS.md) when opening PRs.  
5. Run tests as defined in [TEST_PLAN.md](./TEST_PLAN.md).  

---

## Status

- ✅ V1 Documentation scaffold complete  
- 🛠 Actively building V1 features (see [ROADMAP.md](./ROADMAP.md))  
- 📌 Future: V2 collaborative playlists, profiles, casting
