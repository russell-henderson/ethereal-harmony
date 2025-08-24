> Part of [Ethereal Harmony Documentation](./README.md)

**Quick Links**  
**Core**: [Overview](./MASTER_OVERVIEW.md) · [Roadmap](./ROADMAP.md) · [Brand](./BRAND_GUIDELINES.md) · [Glossary](./GLOSSARY.md)  
**Architecture**: [Frontend](./FRONTEND.md) · [Backend](./BACKEND.md) · [DevOps](./DEVOPS.md) · [Database](./DATABASE.md) · [API Ref](./API_REFERENCE.md)  
**Quality**: [Accessibility](./ACCESSIBILITY.md) · [Security](./SECURITY.md) · [Performance](./PERFORMANCE.md) · [Observability](./OBSERVABILITY.md) · [Test Plan](./TEST_PLAN.md) · [Workflows](./WORKFLOWS.md)  
**People**: [Onboarding](./ONBOARDING.md) · [Contributing](./CONTRIBUTING.md)  
**Deep Links**: [ADRs](./ADR) · [Diagrams](./diagrams) · [Security Reviews](./security) · [Ops/Runbooks](./ops) · [Reports](./reports) · [Images](./images/ui-overview.png)

---

# Ethereal Harmony — Brand Guidelines

## 1. Brand Identity

**Ethereal Harmony** is a premium web music player that fuses **immersive visuals** with **intentional design**.
Our brand identity reflects **calm, clarity, and atmosphere** — always supporting music without distraction.

### Core Principles

* **Immersion, Not Noise** — visuals enhance the audio experience without overwhelming it.
* **Glass as Medium** — all surfaces use a layered, translucent aesthetic.
* **Performance as Design** — everything feels fluid, polished, and precise.
* **Accessibility First** — inclusivity is not optional; WCAG AA compliance is mandatory.

---

## 2. Color Palette

### Primary Colors

| Name              | Hex       | Use Case                         |
| ----------------- | --------- | -------------------------------- |
| **Deep Indigo**   | `#1A2B45` | Primary background, brand anchor |
| **Soft Lavender** | `#7F6A9F` | Accent, gradients, highlights    |
| **Radiant Aqua**  | `#00F0FF` | Interactive states, focus ring   |
| **Subtle Gold**   | `#FFD700` | Occasional highlight/accent      |

### Neutrals

| Name            | Hex       | Use Case                                |
| --------------- | --------- | --------------------------------------- |
| **Clean White** | `#FFFFFF` | Text on dark glass, high-contrast icons |
| **Light Gray**  | `#E0E0E0` | Secondary text, subtle UI dividers      |

### Gradient

* **Brand Gradient:** Left → Deep Indigo `#1A2B45`, Right → Soft Lavender `#7F6A9F`
* Used in hero surfaces and optional theme flourishes.

---

## 3. Glassmorphism Tokens

All UI surfaces (cards, panels, modals) follow the locked glass recipe:

```css
background: rgba(255, 255, 255, 0.12);
backdrop-filter: blur(16px) saturate(120%);
border: 1px solid rgba(255, 255, 255, 0.25);
border-radius: 16px;
box-shadow:
  0 8px 24px rgba(0, 0, 0, 0.28),
  inset 0 1px 0 rgba(255, 255, 255, 0.2);
```

### Rules

* **Never flatten:** All primary surfaces must be glass panels.
* **Layer depth:** Use blur and shadows to create separation without clutter.
* **Consistency:** Tokens must be applied from `styles/tokens.css` only (no inline overrides).

---

## 4. Typography

* **Titles & Headings:** Montserrat, weight 700
* **Body & UI Text:** Lato, weight 400
* **Scale Root:** 16px base, modular scale applied via CSS variables.

### Usage

* **Headings (h1–h3):** Montserrat, bold, tracking slightly reduced.
* **Body (p, span, UI labels):** Lato, regular, balanced line-height.
* **Contrast:** Always check against dynamic backgrounds using WCAG AA (≥ 4.5:1).

---

![Ethereal Harmony Music App](https://github.com/russell-henderson/ethereal-harmony/blob/master/src/docs/images/ui-overview.png?raw=true)

---

## 5. Iconography

* **Source:** Central registry (`src/lib/utils/IconRegistry.ts`).
* **Style:** Simple, 24px line-based icons with clear affordances.
* **States:** Default (soft lavender/white), hover (radiant aqua), disabled (reduced opacity).
* **Rules:** No ad-hoc icons; all must be added to the registry for consistency.

---

## 6. Motion & Interaction

* **Library:** Framer Motion.
* **Micro Interactions:**

  * Tap/press: scale down to 0.98, ripple feedback.
  * Hover: subtle glow shift toward Radiant Aqua.
* **System:** Animations must be performant, under 200ms, with easing curves from design tokens.
* **Reduced Motion:** Respect OS/user reduced motion settings — provide instant transitions where enabled.

---

## 7. Accessibility Standards

* **Focus Ring:** 2px Radiant Aqua outer + 1px high-contrast inner.
* **Keyboard Navigation:** Every control must be accessible with Tab/Shift+Tab + Enter.
* **ARIA Roles:** All interactive elements labeled.
* **Contrast:** Maintain ≥ 4.5:1 for text, ≥ 3:1 for icons.
* **Reduced Motion Path:** Provide non-animated fallbacks when system prefers reduced motion.

---

## 8. Tone & Brand Voice

* **Tone:** Calm, modern, precise.
* **Voice:** Supportive, clear, never verbose.
* **Messaging:** Always focused on *enhancing the music*, not on technical jargon.

---

## 9. Do’s & Don’ts

**✅ Do:**

* Use the locked palette and tokens exclusively.
* Keep UI surfaces glass with consistent layering.
* Provide clear visual hierarchy (contrast, spacing, typography).
* Test all text against dynamic backgrounds for contrast compliance.

**❌ Don’t:**

* Introduce off-brand colors.
* Break token consistency with ad-hoc CSS.
* Add distracting animations or overuse glow effects.
* Use icons outside the central registry.

---

## 10. Future Extensions (Post-V1)

* Light theme variant.
* Expanded accent palette (teal, rose, silver).
* Social/brand identity extensions (avatars, profile themes).

---

📖 **This document must live at `/docs/BRAND_GUIDELINES.md`** and be versioned alongside design tokens. All contributors must reference it before adding UI components, assets, or styles.

---

[← Back to Documentation Index](./README.md)
