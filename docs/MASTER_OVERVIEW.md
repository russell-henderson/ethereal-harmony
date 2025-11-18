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

# Ethereal Harmony — Master Overview

## System at a Glance

- **Purpose:** Ethereal Harmony is a modern, interactive music player and visualizer built with React, Vite, and Three.js. It provides advanced playback, visualization, and device management features in a single-page application.
- **Business Capabilities:** Local and streaming audio playback, real-time visualizations, device selection, equalizer, and user-friendly controls.
- **High‑level diagram(s):** See [`./diagrams/architecture-overview.mmd`](./diagrams/architecture-overview.mmd) and [`./diagrams/services-context.mmd`](./diagrams/services-context.mmd) for component and system context diagrams.

---

### Repository Discovery & Inventory

**Entrypoints (by language):**

- TypeScript/React SPA:
  - Main entry: `src/index.tsx` (invoked by Vite)
  - App root: `src/app/App.tsx`
  - No backend/server entrypoints detected (frontend-only app)

**Detected Frameworks/Libraries & Versions:**

| Library/Framework      | Version      |
|------------------------|-------------|
| React                  | 19.1.1      |
| Vite                   | 7.1.2       |
| Zustand (state)        | 5.0.7       |
| Three.js (3D)          | 0.179.1     |
| Framer Motion (anim)   | 12.23.12    |
| ESLint                 | 9.33.0      |
| Vitest (test)          | 3.2.4       |
| Playwright (e2e)       | 1.54.2      |

**Build/Test/Lint/Start Commands:**

| Task   | Command                                 |
|--------|-----------------------------------------|
| dev    | `vite`                                  |
| build  | `vite build`                            |
| preview| `vite preview`                          |
| test   | `vitest`                                |
| test:ui| `vitest --ui`                           |
| lint   | `eslint "src/**/*.{ts,tsx}"`            |
| e2e    | `playwright test`                       |

**Environment/Secrets Files:**

- No `.env*`, `config/*`, `settings.*`, or `application.*` files found.
- `.gitignore` covers common secrets and local config patterns.

**Feature Flags/Toggles:**

- Feature toggles are present, mostly for UI/visualizer (e.g., `HdrToggle`, `DimmerToggle`, settings flags).
- No external feature flag service detected; toggles are implemented in code (see `src/components/visualizer/HdrToggle.tsx`, `src/lib/visualizer/QualityPresets.ts`).

**Monorepo Tooling:**

- No monorepo tools detected (Turborepo, Nx, Lerna, etc.).

**Build Tools:**

- Vite, TypeScript, ESLint, Vitest, Playwright.

**Branches/Tags/Commits:**

- 1 branch: `master`
- 0 tags
- 13 commits

**Candidate `/docs` Structure:**

- Already created as per TODO.md (see previous step).

---

## Stack Summary

- Languages, frameworks, hosting, datastores

## Key Flows

- Auth, critical user journeys, batch/cron

## Services

- Table with service name, repo path, owners, SLAs

All services are implemented as frontend modules. There are no backend microservices or external APIs.

## Integrations & External Services

- **No third-party integrations** (payments, email, auth, storage, analytics, search, geo, ML, etc.)
- All features are implemented client-side, with the exception of optional HLS streaming via `hls.js` (loaded dynamically for non-Safari browsers).

## Data

- ERD link, sensitive fields, retention/backup summary

## APIs

- REST/GraphQL/gRPC overview with links to specs

## Security & Compliance

- AuthN/Z, threat model summary, compliance notes

## DevOps

- CI jobs, deploy strategy, environments, feature flags

## Observability

- Logs/metrics/traces, dashboards, SLOs

## Testing

- Levels, coverage, gate policies

## Runbooks & On‑Call

- Links to /docs/ops

## Roadmap & Risks

- Known gaps, tech debt, ADR links

---

## Documentation Maintenance

This section defines the maintenance policies and ownership for all documentation in the Ethereal Harmony project.

### Version Field

The `Version` field in document headers follows semantic versioning (MAJOR.MINOR.PATCH):

- **MAJOR** (X.0.0): Bump when there are breaking changes to the documented architecture, significant restructuring, or removal of major sections.
- **MINOR** (x.Y.0): Bump when adding new sections, significant content updates, or changes to documented workflows that don't break existing information.
- **PATCH** (x.y.Z): Bump for typo fixes, clarifications, link updates, or minor corrections that don't change meaning.

**When to bump:**
- Update `Version` whenever you make substantive changes to a document.
- Update `Last Updated` date to the current date (YYYY-MM-DD format).
- If multiple documents are updated together, consider coordinating version bumps.

### Status Field

The `Status` field indicates the maturity and review state of documentation:

- **Draft**: Initial creation, work in progress, or needs significant review. Content may be incomplete or inaccurate.
- **Review**: Content is complete but awaiting peer review or stakeholder approval. Ready for feedback.
- **Active**: Document has been reviewed and approved. It accurately reflects the current state of the system and is the authoritative source.

**Status transitions:**
- Start with `Draft` when creating new documentation.
- Move to `Review` when content is complete and ready for feedback.
- Move to `Active` after review and approval.
- Revert to `Draft` if major changes are needed or the document becomes outdated.

### Review Cadence

Core documentation should be re-validated periodically to ensure accuracy:

- **High-frequency docs** (ARCHITECTURE.md, FRONTEND.md, API_REFERENCE.md): Review quarterly or when major features are added.
- **Medium-frequency docs** (DATABASE.md, SECURITY.md, DEVOPS.md): Review semi-annually or when related systems change.
- **Low-frequency docs** (BRAND_GUIDELINES.md, GLOSSARY.md, ROADMAP.md): Review annually or when explicitly needed.

**Review process:**
1. Owner reviews document against current codebase.
2. Updates content, version, and `Last Updated` date.
3. Changes status to `Review` if significant updates were made.
4. Moves to `Active` after verification.

### CHANGELOG.md Relationship

**Decision:** CHANGELOG.md tracks code changes only. Documentation updates are not logged in CHANGELOG.md.

**Rationale:**
- Documentation versioning is handled via the `Version` field in each document header.
- The `Last Updated` field provides a timestamp for when documentation was modified.
- Keeping code and documentation changes separate reduces noise in the changelog.
- Major documentation restructures or new documentation initiatives can be mentioned in release notes if needed, but not in the changelog itself.

If a major documentation milestone occurs (e.g., complete documentation overhaul, new documentation system), it may be noted in release notes or project announcements, but not in CHANGELOG.md.

---

## Documentation Owner Matrix

| Document | Owner | Review Cadence | Last Review |
|----------|-------|----------------|-------------|
| MASTER_OVERVIEW.md | Russell Henderson | Quarterly | 2025-01-27 |
| ARCHITECTURE.md | Russell Henderson | Quarterly | 2025-01-27 |
| PRD.md | Russell Henderson | Quarterly | 2025-01-27 |
| FRONTEND.md | Russell Henderson | Quarterly | 2025-01-27 |
| BACKEND.md | Russell Henderson | Semi-annually | 2025-01-27 |
| DATABASE.md | Russell Henderson | Semi-annually | 2025-01-27 |
| API_REFERENCE.md | Russell Henderson | Quarterly | 2025-01-27 |
| STATE_MANAGEMENT.md | Russell Henderson | Quarterly | 2025-01-27 |
| SECURITY.md | Russell Henderson | Semi-annually | 2025-01-27 |
| ACCESSIBILITY.md | Russell Henderson | Semi-annually | 2025-01-27 |
| PERFORMANCE.md | Russell Henderson | Semi-annually | 2025-01-27 |
| OBSERVABILITY.md | Russell Henderson | Semi-annually | 2025-01-27 |
| TEST_PLAN.md | Russell Henderson | Quarterly | 2025-01-27 |
| DEVOPS.md | Russell Henderson | Semi-annually | 2025-01-27 |
| WORKFLOWS.md | Russell Henderson | Semi-annually | 2025-01-27 |
| ONBOARDING.md | Russell Henderson | Quarterly | 2025-01-27 |
| CONTRIBUTING.md | Russell Henderson | Semi-annually | 2025-01-27 |
| BRAND_GUIDELINES.md | Russell Henderson | Annually | 2025-01-27 |
| GLOSSARY.md | Russell Henderson | Annually | 2025-01-27 |
| ROADMAP.md | Russell Henderson | Quarterly | 2025-01-27 |
| README.md | Russell Henderson | Quarterly | 2025-01-27 |

**Note:** As the project grows, ownership should be distributed to domain experts. Update this matrix when ownership changes.

---

[← Back to Documentation Index](./README.md)
