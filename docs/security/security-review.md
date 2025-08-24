# Security Review

## Auth Mechanisms
- No authentication or authorization; all features are local to the browser.

## Sensitive Data Flows
- No PII, PHI, or PCI data is stored or processed.
- All data is local to the browser (LocalStorage, in-memory state).

## Storage Protections
- No server-side storage; browser LocalStorage is used for non-sensitive settings only.

## Common CWE Vectors
- XSS: Minimal risk; no user-generated content or remote data fetching.
- CSRF: Not applicable (no backend).
- SSRF, RCE, Path Traversal, Injections: Not applicable.
- Dependency risk: Mitigated by using trusted, up-to-date packages.

## Risks & Mitigations
- **Dependency vulnerabilities:** Use `npm audit` and keep dependencies updated.
- **Browser storage exposure:** Only non-sensitive data is stored; users can clear at any time.
- **No secrets in repo:** `.gitignore` covers common patterns; no `.env` or secret files found.

## Threat Model
- Main threat is supply chain (dependency) risk.
- No attack surface for network-based exploits.

---

See `docs/security/threat-model.mmd` for diagram.
