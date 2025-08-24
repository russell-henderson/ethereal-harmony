> Part of [Ethereal Harmony Documentation](./README.md)

**Quick Links**  
**Core**: [Overview](./MASTER_OVERVIEW.md) · [Roadmap](./ROADMAP.md) · [Brand](./BRAND_GUIDELINES.md) · [Glossary](./GLOSSARY.md)  
**Architecture**: [Frontend](./FRONTEND.md) · [Backend](./BACKEND.md) · [DevOps](./DEVOPS.md) · [Database](./DATABASE.md) · [API Ref](./API_REFERENCE.md)  
**Quality**: [Accessibility](./ACCESSIBILITY.md) · [Security](./SECURITY.md) · [Performance](./PERFORMANCE.md) · [Observability](./OBSERVABILITY.md) · [Test Plan](./TEST_PLAN.md) · [Workflows](./WORKFLOWS.md)  
**People**: [Onboarding](./ONBOARDING.md) · [Contributing](./CONTRIBUTING.md)  
**Deep Links**: [ADRs](./ADR) · [Diagrams](./diagrams) · [Security Reviews](./security) · [Ops/Runbooks](./ops) · [Reports](./reports) · [Images](./images/ui-overview.png)

# Development Workflows

Defines repo workflow, branching, commits, CI/CD, and release strategy.

---

## Git Strategy

- **Branches**:
  - `main`: stable, production-ready.
  - `dev`: integration branch.
  - `feature/*`: per-feature development.
- **PRs**:
  - Must pass CI before merge.
  - Require 1 reviewer approval.

---

## Commit Conventions

- Use **Conventional Commits**:
  - `feat: add VolumeSlider`
  - `fix: correct preset selector flicker`
  - `chore: bump dependencies`
- Automated changelog generation possible.

---

## CI/CD

- CI runs on all PRs:
  - Lint (`eslint`).
  - Type check (`tsc`).
  - Unit + component tests (`vitest`).
  - E2E tests (`playwright`).
  - Lighthouse perf & a11y budget check.
- CD: Deploy via {{platform}} (e.g., Vercel, Netlify) on merge to `main`.

---

## Release Process

- Semantic versioning (MAJOR.MINOR.PATCH).
- On release:
  - Update version in `package.json`.
  - “What’s New” modal JSON updated.
  - Publish build artifact (PWA bundle).


---

[← Back to Documentation Index](./README.md)
