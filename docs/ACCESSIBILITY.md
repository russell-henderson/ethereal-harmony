> Part of [Ethereal Harmony Documentation](./README.md)

**Quick Links**  
**Core**: [Overview](./MASTER_OVERVIEW.md) · [Roadmap](./ROADMAP.md) · [Brand](./BRAND_GUIDELINES.md) · [Glossary](./GLOSSARY.md)  
**Architecture**: [Frontend](./FRONTEND.md) · [Backend](./BACKEND.md) · [DevOps](./DEVOPS.md) · [Database](./DATABASE.md) · [API Ref](./API_REFERENCE.md)  
**Quality**: [Accessibility](./ACCESSIBILITY.md) · [Security](./SECURITY.md) · [Performance](./PERFORMANCE.md) · [Observability](./OBSERVABILITY.md) · [Test Plan](./TEST_PLAN.md) · [Workflows](./WORKFLOWS.md)  
**People**: [Onboarding](./ONBOARDING.md) · [Contributing](./CONTRIBUTING.md)  
**Deep Links**: [ADRs](./ADR) · [Diagrams](./diagrams) · [Security Reviews](./security) · [Ops/Runbooks](./ops) · [Reports](./reports) · [Images](./images/ui-overview.png)

# Accessibility Documentation

> Part of [Ethereal Harmony Documentation](./README.md)

**Quick Links:**  
[Overview](./MASTER_OVERVIEW.md) · [Database](./DATABASE.md) · [API Reference](./API_REFERENCE.md) · [Accessibility](./ACCESSIBILITY.md) · [Roadmap](./ROADMAP.md)

Ethereal Harmony is designed to comply with **WCAG 2.1 AA**. Accessibility is intrinsic, not an afterthought.

---

## Keyboard Navigation

- **Tab/Shift+Tab**: Cycle through focusable elements in logical order (TopBar → SidePanel → Player → Settings).
- **Enter/Space**: Activate focused controls.
- **Keyboard Shortcuts**:
  - Space: Play/Pause
  - Left/Right: Seek backward/forward
  - Up/Down: Adjust volume
  - M: Mute
  - R: Repeat cycle
  - S: Shuffle toggle
  - T: Theme cycle
  - P: Preset cycle

---

## Screen Reader Support

- All interactive elements have **ARIA roles**:
  - Buttons: `role="button"`, `aria-pressed` for toggles.
  - Sliders: `role="slider"` with `aria-valuemin`, `aria-valuemax`, `aria-valuenow`.
  - Dialogs: `role="dialog"`, `aria-modal="true"`, labelled by `aria-labelledby`.
- Live regions announce:
  - Playback state changes (e.g., “Paused”).
  - Volume changes (e.g., “Volume 65%”).
  - Repeat/Shuffle mode updates.

---

## Focus Visibility

- All focusable elements show a **Radiant Aqua (#00F0FF) ring** with inner contrast outline.
- Custom focus ring enforced via utility (`FocusRing.ts`).

---

## Color & Contrast

- Minimum text contrast: **4.5:1** against dynamic glass backgrounds.
- Semi-transparent surfaces include a subtle solid fallback layer to maintain legibility.
- Backdrop blur ≥16px to neutralize dynamic background shifts.

---

## Reduced Motion

- Motion-heavy effects (e.g., particle intensity, camera sway) are clamped when “Reduced Motion” OS setting is detected.
- Transitions prefer opacity/fade instead of large-scale transforms.

---

## Testing & Validation

- aXe and Lighthouse automated checks in CI.
- Storybook a11y add-on used for component-level audits.
- Manual keyboard audit before release.

**Acceptance**: All critical flows are operable with keyboard + screen reader, contrast validated, reduced motion respected.

---

[← Back to Documentation Index](./README.md)
