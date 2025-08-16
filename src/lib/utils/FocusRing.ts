/**
 * src/lib/utils/FocusRing.ts
 * Ethereal Harmony — Accessible Focus Ring Utilities (Phase 1 aligned, Phase 2-ready)
 *
 * Purpose in the project:
 *  - Provide a tiny, framework-friendly utility for rendering *consistent*,
 *    high-contrast focus indicators that satisfy WCAG 2.1 AA and match our
 *    glassmorphism aesthetic (Radiant Aqua glow, soft spread).
 *  - Avoid per-component boilerplate and ensure keyboard-only “focus-visible”
 *    behavior across browsers (with a safe polyfill for legacy engines).
 *
 * How it integrates:
 *  - UI components add the returned `className` from `withFocusRing()` or the
 *    hook `useFocusRingClass()` to any focusable element (button, slider thumb,
 *    card, custom role="button", etc). No state management required.
 *  - Global styles are injected once at runtime (SSR/rehydration safe).
 *  - We do not modify audio behavior or global resets. This is purely visual.
 *
 * Design system alignment:
 *  - Glass Tokens:
 *      radius          : 16px
 *      blur            : 16px
 *      background      : rgba(255,255,255,0.12)
 *      border          : 1px solid rgba(255,255,255,0.25)
 *  - Palette:
 *      Base (indigo)   : #1A2B45
 *      Accent (lavender): #7F6A9F
 *      Highlight (aqua): #00F0FF
 *  - The focus ring uses the highlight color with an outer soft halo for
 *    visibility on both dark base and glass surfaces.
 *
 * Accessibility:
 *  - Uses :focus-visible where supported to avoid showing focus on mouse click.
 *  - Polyfills the behavior by tracking input modality (keyboard vs pointer)
 *    and applying styles only when the modality is keyboard.
 *  - Meets AA contrast guidelines by using a solid inner outline + glow.
 *
 * Privacy/Safety:
 *  - No network calls. Local-only. SSR guarded.
 */

import * as React from "react";

/* ----------------------------------------------------------------------------
 * Tokens & Constants
 * ------------------------------------------------------------------------- */

export const FOCUS_TOKENS = {
  color: "#00F0FF", // Radiant Aqua
  innerPx: 2,       // crisp inner outline
  outerPx: 6,       // soft halo width
  radius: 16,       // default border radius
  offset: 0,        // visual offset (kept at 0 for our rounded cards)
};

const IS_BROWSER = typeof window !== "undefined" && typeof document !== "undefined";

/**
 * We install a single <style id="eh-focus-ring-styles"> tag with the core rules.
 * Components just use the utility class names.
 */
const STYLE_ID = "eh-focus-ring-styles";

/* ----------------------------------------------------------------------------
 * One-time style injection (SSR-safe)
 * ------------------------------------------------------------------------- */

let _stylesInstalled = false;

const installStylesOnce = () => {
  if (!IS_BROWSER || _stylesInstalled) return;
  if (document.getElementById(STYLE_ID)) {
    _stylesInstalled = true;
    return;
  }

  const style = document.createElement("style");
  style.id = STYLE_ID;

  // Using CSS variables allows runtime theming if needed.
  style.textContent = `
:root {
  --eh-focus-color: ${FOCUS_TOKENS.color};
  --eh-focus-inner: ${FOCUS_TOKENS.innerPx}px;
  --eh-focus-outer: ${FOCUS_TOKENS.outerPx}px;
  --eh-focus-radius: ${FOCUS_TOKENS.radius}px;
  --eh-focus-offset: ${FOCUS_TOKENS.offset}px;
}

/* Base utility class to attach on focusable elements */
.eh-focus-ring {
  outline: none;               /* avoid default outline to prevent double borders */
  -webkit-tap-highlight-color: transparent;
}

/* Variant to render the ring inside the element's bounds (useful for tight layouts) */
.eh-focus-inset {}

/* ---------------------------------------------
   Modern path: browsers with :focus-visible
   --------------------------------------------- */
.eh-focus-ring:focus-visible {
  box-shadow:
    0 0 0 var(--eh-focus-inner) var(--eh-focus-color),
    0 0 0 calc(var(--eh-focus-inner) + var(--eh-focus-outer)) color-mix(in oklab, var(--eh-focus-color) 40%, transparent);
  border-radius: var(--eh-focus-radius);
  outline: none;
}

/* Inset variant */
.eh-focus-inset:focus-visible {
  box-shadow:
    inset 0 0 0 var(--eh-focus-inner) var(--eh-focus-color),
    inset 0 0 0 calc(var(--eh-focus-inner) + var(--eh-focus-outer)) color-mix(in oklab, var(--eh-focus-color) 28%, transparent);
  border-radius: var(--eh-focus-radius);
  outline: none;
}

/* ---------------------------------------------
   Polyfill path: for browsers lacking :focus-visible
   We add [data-eh-modality="keyboard"] on <html>.
   Only show focus ring when the last input modality was keyboard.
   --------------------------------------------- */
html[data-eh-modality="keyboard"] .eh-focus-ring:focus {
  box-shadow:
    0 0 0 var(--eh-focus-inner) var(--eh-focus-color),
    0 0 0 calc(var(--eh-focus-inner) + var(--eh-focus-outer)) color-mix(in oklab, var(--eh-focus-color) 40%, transparent);
  border-radius: var(--eh-focus-radius);
  outline: none;
}

html[data-eh-modality="keyboard"] .eh-focus-inset:focus {
  box-shadow:
    inset 0 0 0 var(--eh-focus-inner) var(--eh-focus-color),
    inset 0 0 0 calc(var(--eh-focus-inner) + var(--eh-focus-outer)) color-mix(in oklab, var(--eh-focus-color) 28%, transparent);
  border-radius: var(--eh-focus-radius);
  outline: none;
}

/* Respect users who prefer reduced motion by slightly reducing shadow spread.
   (Not strictly "motion", but large glow changes can be distracting.) */
@media (prefers-reduced-motion: reduce) {
  :root {
    --eh-focus-outer: 4px;
  }
}
`.trim();

  document.head.appendChild(style);
  _stylesInstalled = true;
};

/* ----------------------------------------------------------------------------
 * Input modality tracking (lightweight :focus-visible polyfill)
 * ------------------------------------------------------------------------- */

/**
 * We track the last input source (keyboard vs pointer) and mirror it to
 * <html data-eh-modality="keyboard|pointer">. Rules above use this attribute in
 * browsers without :focus-visible.
 */
let _listenersBound = false;

const bindModalityListeners = () => {
  if (!IS_BROWSER || _listenersBound) return;
  _listenersBound = true;

  const root = document.documentElement;

  const setMod = (mod: "keyboard" | "pointer") => {
    // Avoid layout trashing; write only on change.
    if (root.getAttribute("data-eh-modality") !== mod) {
      root.setAttribute("data-eh-modality", mod);
    }
  };

  const onKeyDown = (e: KeyboardEvent) => {
    // Keys that typically move focus or interact without pointer.
    const keys = ["Tab", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Enter", " "];
    if (keys.includes(e.key)) setMod("keyboard");
  };

  const toPointer = () => setMod("pointer");

  window.addEventListener("keydown", onKeyDown, true);
  window.addEventListener("mousedown", toPointer, true);
  window.addEventListener("pointerdown", toPointer, true);
  window.addEventListener("touchstart", toPointer, { passive: true, capture: true } as any);

  // Initialize to pointer to avoid flashing rings on initial click.
  setMod("pointer");
};

/* ----------------------------------------------------------------------------
 * Runtime configuration API
 * ------------------------------------------------------------------------- */

export type FocusRingOptions = Partial<{
  /** Set custom color for this element or globally via install (hex or css color). */
  color: string;
  /** Border radius in px (defaults to 16). */
  radius: number;
  /** Inner solid outline width in px. */
  inner: number;
  /** Outer glow width in px. */
  outer: number;
  /** Use inset ring variant. */
  inset: boolean;
}>;

/**
 * Apply per-element overrides by returning a className string to append.
 * Adds the base `eh-focus-ring` class and optionally `eh-focus-inset`.
 *
 * Note: Color/size overrides here rely on CSS variables via inline style —
 *       pass the returned `style` object as well if you want overrides.
 */
export const withFocusRing = (
  className?: string,
  opts?: FocusRingOptions
): { className: string; style?: React.CSSProperties } => {
  installStylesOnce();
  bindModalityListeners();

  const classes = ["eh-focus-ring"];
  if (opts?.inset) classes.push("eh-focus-inset");
  if (className) classes.push(className);

  const style: React.CSSProperties = {};
  if (opts?.color) style["--eh-focus-color" as any] = opts.color;
  if (typeof opts?.radius === "number") style["--eh-focus-radius" as any] = `${opts.radius}px`;
  if (typeof opts?.inner === "number") style["--eh-focus-inner" as any] = `${opts.inner}px`;
  if (typeof opts?.outer === "number") style["--eh-focus-outer" as any] = `${opts.outer}px`;

  return { className: classes.join(" "), style: Object.keys(style).length ? style : undefined };
};

/**
 * Hook variant for React components.
 * Usage:
 *   const focus = useFocusRingClass({ inset: true });
 *   <button {...focus}>Play</button>
 */
export const useFocusRingClass = (opts?: FocusRingOptions) => {
  // Install once on mount (safe if called multiple times)
  React.useEffect(() => {
    installStylesOnce();
    bindModalityListeners();
  }, []);

  return React.useMemo(() => withFocusRing(undefined, opts), [opts?.color, opts?.radius, opts?.inner, opts?.outer, opts?.inset]);
};

/**
 * Globally override default tokens *for the entire app* at runtime.
 * Call early in app boot if you need different radii/widths.
 */
export const configureGlobalFocusRing = (tokens: Partial<typeof FOCUS_TOKENS>) => {
  if (!IS_BROWSER) return;
  installStylesOnce();
  const root = document.documentElement;

  if (tokens.color) root.style.setProperty("--eh-focus-color", tokens.color);
  if (typeof tokens.innerPx === "number") root.style.setProperty("--eh-focus-inner", `${tokens.innerPx}px`);
  if (typeof tokens.outerPx === "number") root.style.setProperty("--eh-focus-outer", `${tokens.outerPx}px`);
  if (typeof tokens.radius === "number") root.style.setProperty("--eh-focus-radius", `${tokens.radius}px`);
  if (typeof tokens.offset === "number") root.style.setProperty("--eh-focus-offset", `${tokens.offset}px`);
};

/* ----------------------------------------------------------------------------
 * Convenience helpers for common components
 * ------------------------------------------------------------------------- */

/**
 * Returns props for a standard glass button using our default ring.
 * Example:
 *   <button {...focusButtonProps()}>Play</button>
 */
export const focusButtonProps = (opts?: FocusRingOptions) => {
  const { className, style } = withFocusRing(undefined, opts);
  return { className, style, type: "button" as const };
};

/**
 * Returns props for a focusable non-native element (e.g., a div with role="button").
 * Ensures correct ARIA & keyboard focusability; adds the ring class.
 *
 * Example:
 *   <div {...focusRoleButtonProps({ pressed })} onClick={...}>Toggle</div>
 */
export const focusRoleButtonProps = (opts?: FocusRingOptions & { pressed?: boolean }) => {
  const { className, style } = withFocusRing(undefined, opts);
  return {
    className,
    style,
    role: "button" as const,
    tabIndex: 0,
    "aria-pressed": typeof opts?.pressed === "boolean" ? opts.pressed : undefined,
  };
};

/* ----------------------------------------------------------------------------
 * Minimal React helper component (optional)
 * ------------------------------------------------------------------------- */

/**
 * FocusRingScope ensures styles and modality listeners are present.
 * You can render it once near the root (e.g., inside App.tsx).
 */
export const FocusRingScope: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  React.useEffect(() => {
    installStylesOnce();
    bindModalityListeners();
  }, []);
  return <>{children}</>;
};

/* ----------------------------------------------------------------------------
 * Notes for maintainers:
 *  - We intentionally keep this file dependency-free and light so it can be
 *    imported anywhere (components, storybook, test scaffolding).
 *  - If we later add theming, prefer exposing a single `configureGlobalFocusRing`
 *    call from the app shell rather than multiplying per-component overrides.
 *  - For sliders/knobs where the focus outline may clip, prefer the `inset`
 *    variant or increase border radius via options.
 * ------------------------------------------------------------------------- */
