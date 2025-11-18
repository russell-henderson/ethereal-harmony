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

# Accessibility Documentation

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

Ethereal Harmony respects the `prefers-reduced-motion` CSS media query and provides user controls to override system preferences.

### System Detection

The app detects reduced motion preferences via:
- **CSS Media Query**: `(prefers-reduced-motion: reduce)` 
- **Utility**: `src/lib/utils/ReducedMotion.ts` provides `onReducedMotionChange()` callback
- **Settings Override**: Users can manually enable/disable reduced motion in Settings, overriding system preference

### Visualizer Behavior

When reduced motion is active:

1. **ParticlesField** (`src/lib/three/components/ParticlesField.ts`):
   - Camera motion (subtle sway) is **completely disabled** (`rmFactor = 0`)
   - Particle shader motion continues but is scaled by `motionScale` parameter
   - Audio-reactive particle displacement is reduced proportionally

2. **SceneController** (`src/lib/visualizer/SceneController.ts`):
   - Camera wobble is scaled by quality preset's `motionScaleMax` (0.6-1.0 range)
   - Lower quality tiers have lower `motionScaleMax` values, naturally reducing motion
   - **Note**: SceneController does not directly check reduced motion; it relies on quality presets

3. **Quality Presets** (`src/lib/visualizer/QualityPresets.ts`):
   - Each tier has a `motionScaleMax` value:
     - Ultra: 1.0 (full motion)
     - High: 0.9
     - Medium: 0.8
     - Low: 0.7
     - Fallback: 0.6 (minimal motion)
   - These values cap camera and particle motion regardless of user settings

### Interaction with Performance Guards

- **AdaptiveGuard** may reduce quality tier when performance is poor, which automatically reduces `motionScaleMax`
- Reduced motion preference does **not** trigger quality tier changes
- Both systems work independently: reduced motion for accessibility, quality tiers for performance

### UI Animations

- **Framer Motion** (`src/app/providers/MotionProvider.tsx`):
  - Configured with `reducedMotion="user"` to automatically respect system preference
  - All Framer Motion animations (modals, toggles, transitions) automatically reduce when preference is active

- **CSS Transitions**:
  - `@media (prefers-reduced-motion: reduce)` rules in `globals.css` disable or reduce animation durations
  - Focus rings and other UI elements use reduced-duration transitions

### Settings Integration

- **Settings Store** (`src/lib/state/useSettingsStore.ts`):
  - `reducedMotion: boolean | undefined`
  - `undefined` = follow system preference
  - `true` = force reduced motion on
  - `false` = force reduced motion off
  - Accessible via Settings modal toggle

### Testing Reduced Motion

To verify reduced motion behavior:

1. **System Level**: Enable "Reduce motion" in OS accessibility settings
2. **App Level**: Toggle "Reduced Motion" in Settings modal
3. **Expected Behavior**:
   - Camera sway in visualizer should stop (ParticlesField)
   - Particle motion should be reduced (shader displacement scaled)
   - UI animations should be minimal or disabled
   - Quality tier changes should still work independently

---

## Testing & Validation

- aXe and Lighthouse automated checks in CI.
- Storybook a11y add-on used for component-level audits.
- Manual keyboard audit before release.

**Acceptance**: All critical flows are operable with keyboard + screen reader, contrast validated, reduced motion respected.

---

[← Back to Documentation Index](./README.md)
