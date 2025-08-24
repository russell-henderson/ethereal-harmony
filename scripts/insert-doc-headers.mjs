import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve("docs");

const blocks = {
  root: `> Part of [Ethereal Harmony Documentation](./README.md)

**Quick Links**  
**Core**: [Overview](./MASTER_OVERVIEW.md) · [Roadmap](./ROADMAP.md) · [Brand](./BRAND_GUIDELINES.md) · [Glossary](./GLOSSARY.md)  
**Architecture**: [Frontend](./FRONTEND.md) · [Backend](./BACKEND.md) · [DevOps](./DEVOPS.md) · [Database](./DATABASE.md) · [API Ref](./API_REFERENCE.md)  
**Quality**: [Accessibility](./ACCESSIBILITY.md) · [Security](./SECURITY.md) · [Performance](./PERFORMANCE.md) · [Observability](./OBSERVABILITY.md) · [Test Plan](./TEST_PLAN.md) · [Workflows](./WORKFLOWS.md)  
**People**: [Onboarding](./ONBOARDING.md) · [Contributing](./CONTRIBUTING.md)  
**Deep Links**: [ADRs](./ADR) · [Diagrams](./diagrams) · [Security Reviews](./security) · [Ops/Runbooks](./ops) · [Reports](./reports) · [Images](./images/ui-overview.png)
`,
  security: `> Part of [Ethereal Harmony Documentation](../README.md)

**Quick Links**  
**Core**: [Overview](../MASTER_OVERVIEW.md) · [Roadmap](../ROADMAP.md) · [Brand](../BRAND_GUIDELINES.md) · [Glossary](../GLOSSARY.md)  
**Architecture**: [Frontend](../FRONTEND.md) · [Backend](../BACKEND.md) · [DevOps](../DEVOPS.md) · [Database](../DATABASE.md) · [API Ref](../API_REFERENCE.md)  
**Quality**: [Accessibility](../ACCESSIBILITY.md) · [Security (root)](../SECURITY.md) · [Performance](../PERFORMANCE.md) · [Observability](../OBSERVABILITY.md) · [Test Plan](../TEST_PLAN.md) · [Workflows](../WORKFLOWS.md)  
**This Folder**: [Threat Model](./threat-model.md) · [Security Review](./security-review.md)  
**Deep Links**: [ADRs](../ADR) · [Diagrams](../diagrams) · [Ops/Runbooks](../ops) · [Reports](../reports)
`,
  diagrams: `> Part of [Ethereal Harmony Documentation](../README.md)

**Quick Links**  
**Core**: [Overview](../MASTER_OVERVIEW.md) · [Roadmap](../ROADMAP.md)  
**Architecture**: [Frontend](../FRONTEND.md) · [Backend](../BACKEND.md) · [DevOps](../DEVOPS.md) · [Database](../DATABASE.md) · [API Ref](../API_REFERENCE.md)  
**Quality**: [Accessibility](../ACCESSIBILITY.md) · [Security](../SECURITY.md) · [Performance](../PERFORMANCE.md) · [Observability](../OBSERVABILITY.md) · [Test Plan](../TEST_PLAN.md)  
**This Folder**: [Architecture](./architecture-overview.mmd) · [Cross‑Cutting](./cross-cutting-concerns.mmd) · [Deployment](./deployment-topology.mmd) · [Sequence (Auth)](./sequence-auth.mmd) · [Services Context](./services-context.mmd)
`,
  ops: `> Part of [Ethereal Harmony Documentation](../README.md)

**Quick Links**  
[Overview](../MASTER_OVERVIEW.md) · [Roadmap](../ROADMAP.md) · [DevOps](../DEVOPS.md) · [Security](../SECURITY.md) · [Observability](../OBSERVABILITY.md) · [Workflows](../WORKFLOWS.md)  
**This Folder**: [Runbooks](./runbooks.md) · [Backup/Restore](./backup-restore.md) · [SOPS Policy](./sops-policy.md)
`,
  adr: `> Part of [Ethereal Harmony Documentation](../README.md)

**Quick Links**  
[Overview](../MASTER_OVERVIEW.md) · [Roadmap](../ROADMAP.md) · [Frontend](../FRONTEND.md) · [Backend](../BACKEND.md) · [Database](../DATABASE.md) · [API Ref](../API_REFERENCE.md)  
**This Folder**: [ADR Index](../ADR) · [ADR‑0001](./0001-record-architecture-decision.md)
`,
  reports: `> Part of [Ethereal Harmony Documentation](../README.md)

**Quick Links**  
[Overview](../MASTER_OVERVIEW.md) · [Roadmap](../ROADMAP.md) · [Workflows](../WORKFLOWS.md) · [Security](../SECURITY.md)  
**This Folder**: [SBOM](./sbom.json) · [CLOC](./cloc.txt) · [File List](./filelist.txt)
`,
  footerRoot: `

---

[← Back to Documentation Index](./README.md)
`,
  footerSub: `

---

[← Back to Documentation Index](../README.md)
`,
};

const isMarkdown = f => f.endsWith(".md") || f.endsWith(".mmd");

// idempotent insert (if header already exists, skip)
function ensureHeader(filePath, header, footer) {
  let text = fs.readFileSync(filePath, "utf8");
  if (text.startsWith("> Part of [Ethereal Harmony Documentation]")) return; // already has header
  const newText = `${header}\n${text.trim()}\n${footer}`;
  fs.writeFileSync(filePath, newText, "utf8");
  console.log("✔ inserted header:", filePath);
}

// root files
for (const f of fs.readdirSync(ROOT)) {
  const p = path.join(ROOT, f);
  if (fs.statSync(p).isFile() && isMarkdown(f) && f !== "README.md") {
    ensureHeader(p, blocks.root, blocks.footerRoot);
  }
}

// subfolders
const folders = [
  ["security", blocks.security, blocks.footerSub],
  ["diagrams", blocks.diagrams, blocks.footerSub],
  ["ops", blocks.ops, blocks.footerSub],
  ["ADR", blocks.adr, blocks.footerSub],
  ["reports", blocks.reports, blocks.footerSub],
];

for (const [folder, header, footer] of folders) {
  const dir = path.join(ROOT, folder);
  if (!fs.existsSync(dir)) continue;
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isFile() && isMarkdown(f)) {
      ensureHeader(p, header, footer);
    }
  }
}
