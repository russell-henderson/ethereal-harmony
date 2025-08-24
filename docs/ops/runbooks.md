> Part of [Ethereal Harmony Documentation](../README.md)

**Quick Links**  
[Overview](../MASTER_OVERVIEW.md) · [Roadmap](../ROADMAP.md) · [DevOps](../DEVOPS.md) · [Security](../SECURITY.md) · [Observability](../OBSERVABILITY.md) · [Workflows](../WORKFLOWS.md)  
**This Folder**: [Runbooks](./runbooks.md) · [Backup/Restore](./backup-restore.md) · [SOPS Policy](./sops-policy.md)

# Runbooks

## Common Operational Tasks

- **Clear LocalStorage:**
  - Open browser dev tools > Application > LocalStorage > Clear site data.
- **Reset App State:**
  - Use in-app settings or clear LocalStorage as above.
- **Update Dependencies:**
  - Run `npm update` and `npm audit fix`.
- **Build for Production:**
  - Run `npm run build`.
- **Test Locally:**
  - Run `npm run dev` and `npm run test`.

## Incident Response

- **UI/Playback Bug:**
  - Check browser console for errors.
  - Try clearing LocalStorage and reloading.
- **Dependency Vulnerability:**
  - Run `npm audit` and update as needed.

---

[← Back to Documentation Index](../README.md)
