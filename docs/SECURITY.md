> Part of [Ethereal Harmony Documentation](./README.md)

**Quick Links**  
**Core**: [Overview](./MASTER_OVERVIEW.md) · [Roadmap](./ROADMAP.md) · [Brand](./BRAND_GUIDELINES.md) · [Glossary](./GLOSSARY.md)  
**Architecture**: [Frontend](./FRONTEND.md) · [Backend](./BACKEND.md) · [DevOps](./DEVOPS.md) · [Database](./DATABASE.md) · [API Ref](./API_REFERENCE.md)  
**Quality**: [Accessibility](./ACCESSIBILITY.md) · [Security](./SECURITY.md) · [Performance](./PERFORMANCE.md) · [Observability](./OBSERVABILITY.md) · [Test Plan](./TEST_PLAN.md) · [Workflows](./WORKFLOWS.md)  
**People**: [Onboarding](./ONBOARDING.md) · [Contributing](./CONTRIBUTING.md)  
**Deep Links**: [ADRs](./ADR) · [Diagrams](./diagrams) · [Security Reviews](./security) · [Ops/Runbooks](./ops) · [Reports](./reports) · [Images](./images/ui-overview.png)

# 📘 SECURITY.md


## 🪪 Security Documentation

> Part of [Ethereal Harmony Documentation](./README.md)

**Quick Links:**  
[Overview](./MASTER_OVERVIEW.md) · [Database](./DATABASE.md) · [API Reference](./API_REFERENCE.md) · [Accessibility](./ACCESSIBILITY.md) · [Roadmap](./ROADMAP.md)

## 🔐 Auth Mechanisms

- None (frontend-only SPA).
- No login, signup, or tokens required.
- All data is local-first; no PII, PCI, or PHI is stored.

## 🗃️ Sensitive Data Flows

- **Audio sources**: Local file system (via File API) or HTTPS remote streams.
- **Metadata**: Parsed from local files (ID3, FLAC tags). Sanitized before DOM insertion.
- **Cache**: IndexedDB + Cache API store artwork, sidecars, and stream chunks.
- **Telemetry**: Disabled by default. If enabled, only anonymized perf/error data is sent.

## ⭐ eStorage Protections

- `.gitignore` ensures no secrets committed.
- Cache purge control available in Settings.
- IndexedDB & LocalStorage wiped on uninstall/PWA reset.

## ⭐ Common CWE Vectors

- **XSS**: Mitigated by sanitizing metadata and user input.
- **Mixed Content (CWE-345)**: Prevented by enforcing HTTPS-only URLs.
- **Denial of Service**: Adaptive ladder prevents GPU/CPU overload from visualizer.
- **Unsafe URL Injection**: UrlGuard ensures only HTTPS + valid MIME streams load.

## 🌀 Threat Model

- **User device is the trust boundary.**  
- Risks: malicious metadata in audio tags, unsafe external stream injection.  
- Mitigations: strict sanitization, URL allowlist, HTTPS enforcement.  
- No server or multi-user attack surface.


---

[← Back to Documentation Index](./README.md)
