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

# DevOps Documentation

## Current State

Ethereal Harmony is a **frontend-only application** with no backend infrastructure. All deployment is static file hosting.

## Build Process

### Build Command
```bash
npm run build
```

### Build Output
- Output directory: `dist/`
- Contains: Static HTML, CSS, JavaScript bundles, and assets
- Format: Standard Vite production build optimized for static hosting

### Preview Build Locally
```bash
npm run preview
```
- Serves the `dist/` folder locally (default: `http://localhost:4173`)
- Useful for testing production builds before deployment

## Deployment

### Current Process (Manual)
1. Run `npm run build` to create production bundle
2. Upload `dist/` folder contents to static hosting service
3. Configure hosting service to serve `index.html` for all routes (SPA routing)

### Static Hosting Options
- **Vercel**: Automatic deployments from Git, zero-config
- **Netlify**: Drag-and-drop or Git-based deployments
- **GitHub Pages**: Free hosting for public repos
- **Cloudflare Pages**: Fast global CDN
- **Any static file server**: Nginx, Apache, etc.

### Future CI/CD (Planned)
- Automated builds on push to `main` branch
- Automated deployment to hosting service
- Preview deployments for pull requests
- Automated testing before deployment

## Environment Configuration

- **No environment variables required** for basic operation
- All configuration is client-side (browser storage)
- No secrets or API keys needed

## Release Process

### Current (Manual)
1. Update version in `package.json`
2. Run `npm run build`
3. Test locally with `npm run preview`
4. Deploy `dist/` to hosting service
5. Update `CHANGELOG.md` (code changes only, not documentation)

### Future (Automated)
- Semantic versioning via `npm version` or CI
- Automated changelog generation
- Tagged releases in Git
- Automated deployment on version tags

---

[← Back to Documentation Index](./README.md)
