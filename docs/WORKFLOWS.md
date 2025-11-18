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

# Development Workflows

Defines repo workflow, branching, commits, CI/CD, and release strategy.

---

## Git Strategy

- **Branches**:
  - `master`: stable, production-ready (current default branch)
  - `feature/*`: per-feature development
- **PRs**:
  - Manual review process (no CI configured yet)
  - Code review before merge

---

## Commit Conventions

- Use **Conventional Commits**:
  - `feat: add VolumeSlider`
  - `fix: correct preset selector flicker`
  - `chore: bump dependencies`
- Automated changelog generation possible.

---

## CI/CD

### Current State (Manual)
- **No CI/CD configured yet**
- Manual testing before commits:
  - Run `npm run lint` to check code style
  - Run `npm test` for unit tests (when implemented)
  - Run `npm run build` to verify build succeeds
  - Run `npm run preview` to test production build locally

### Future CI/CD (Planned)
- Automated checks on PRs:
  - Lint (`npm run lint`)
  - Type check (`tsc --noEmit`)
  - Unit tests (`npm test`)
  - E2E tests (`npm run e2e`)
  - Build verification (`npm run build`)
- Automated deployment:
  - Deploy preview builds for PRs
  - Deploy to production on merge to `master`
  - Platform: TBD (Vercel, Netlify, or similar)

---

## Release Process

### Current Process (Manual)
1. **Update version** in `package.json` (semantic versioning: MAJOR.MINOR.PATCH)
2. **Update changelog**: Run `npm run changelog` or manually update `CHANGELOG.md`
3. **Build**: Run `npm run build`
4. **Test**: Run `npm run preview` and verify locally
5. **Deploy**: Upload `dist/` folder to static hosting service
6. **Tag release** (optional): `git tag v1.0.0 && git push --tags`

### Scripts Available
- `npm run changelog`: Generate/update CHANGELOG.md from commits
- `npm run changelog:dry`: Preview changelog changes without writing
- `npm run release`: Update changelog and create git tag (requires manual version bump)

### Future Automation
- Automated version bumping via `npm version`
- Automated changelog generation
- Automated deployment on version tags

---

[← Back to Documentation Index](./README.md)
