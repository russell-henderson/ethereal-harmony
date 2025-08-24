# Ethereal Harmony — Master Overview

## System at a Glance

- **Purpose:** Ethereal Harmony is a modern, interactive music player and visualizer built with React, Vite, and Three.js. It provides advanced playback, visualization, and device management features in a single-page application.
- **Business Capabilities:** Local and streaming audio playback, real-time visualizations, device selection, equalizer, and user-friendly controls.
- **High‑level diagram(s):** (See /docs/diagrams)

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
