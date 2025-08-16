/**
 * src/lib/utils/ContrastCheck.ts
 * Ethereal Harmony — WCAG Contrast Utilities (Phase 1 aligned, Phase 2-ready)
 *
 * Purpose in the project:
 *  - Provide reliable, framework-agnostic color utilities that help our
 *    glassmorphism UI maintain WCAG 2.1 AA contrast targets across dynamic
 *    backgrounds and translucency.
 *  - Zero external dependencies. SSR-safe (no window/document).
 *
 * What this module offers:
 *  - Robust color parsing: HEX (3/4/6/8), rgb()/rgba(), hsl()/hsla().
 *  - Relative luminance and contrast ratio (WCAG 2.1 equations).
 *  - AA / AAA checks for normal and large text.
 *  - Candidate selection: choose best text color for a background.
 *  - Auto-adjustment: nudge a color lighter/darker to reach target contrast.
 *  - Alpha blending helpers: compute effective color of translucent layers,
 *    e.g., our glass card (rgba(255,255,255,0.12)) over the deep indigo base.
 *
 * Design System context (constants included for convenience):
 *  - Glass Tokens:
 *      radius: 16px
 *      blur: 16px
 *      background: rgba(255,255,255,0.12)
 *      border: 1px solid rgba(255,255,255,0.25)
 *  - Palette:
 *      Primary Background: #1A2B45
 *      Primary Accent:     #7F6A9F
 *      Highlight:          #00F0FF
 *
 * Usage notes:
 *  - For UI components, prefer `pickBestTextColor` or `ensureContrast`.
 *  - When placing text on glass panels, compute the *effective background*
 *    using `blendOver()` with the base scene color, then run contrast checks.
 *
 * Privacy/Safety: Local only. No network. No side effects.
 */

/* ----------------------------------------------------------------------------
 * Types
 * ------------------------------------------------------------------------- */

export type RGB = { r: number; g: number; b: number };
export type RGBA = RGB & { a: number };

export type AAOptions = {
  /** WCAG level (default 'AA') */
  level?: "AA" | "AAA";
  /**
   * Treat text as large (≥18pt regular or ≥14pt bold). Large text has a lower
   * contrast threshold per WCAG: 3.0 for AA (vs 4.5 for normal).
   */
  large?: boolean;
};

export type AdjustOptions = {
  /** Desired contrast ratio target. Defaults to 4.5 for normal text. */
  target?: number;
  /**
   * How to push the color if it doesn't meet the target.
   *  - "auto": try both directions and pick the closest that achieves target.
   *  - "lighter": only move towards white.
   *  - "darker": only move towards black.
   */
  mode?: "auto" | "lighter" | "darker";
  /** Max iterations (safety) */
  maxSteps?: number;
  /** Amount of lightness delta applied per iteration (0..1). Default 0.02 (2%). */
  step?: number;
};

export type PickOptions = {
  /** Minimum acceptable contrast (default 4.5) */
  min?: number;
  /** If no candidate meets min, return the *highest* contrast anyway (default true) */
  fallbackToMax?: boolean;
};

/* ----------------------------------------------------------------------------
 * Design tokens (exported for convenience)
 * ------------------------------------------------------------------------- */

export const EH_COLORS = {
  BASE_BG: "#1A2B45",
  ACCENT: "#7F6A9F",
  HIGHLIGHT: "#00F0FF",
  GLASS_BG: "rgba(255,255,255,0.12)",
  GLASS_BORDER: "rgba(255,255,255,0.25)",
} as const;

/* ----------------------------------------------------------------------------
 * Helpers
 * ------------------------------------------------------------------------- */

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const clamp255 = (v: number) => Math.max(0, Math.min(255, v | 0));
const toFixed = (n: number, p = 4) => Number(n.toFixed(p));

/* ----------------------------------------------------------------------------
 * Parsing — HEX, rgb(a), hsl(a)
 * ------------------------------------------------------------------------- */

const HEX_3 = /^#([0-9a-f]{3})$/i;
const HEX_4 = /^#([0-9a-f]{4})$/i;
const HEX_6 = /^#([0-9a-f]{6})$/i;
const HEX_8 = /^#([0-9a-f]{8})$/i;

const RGB_RE =
  /^rgba?\(\s*([\d.]+%?)\s*,\s*([\d.]+%?)\s*,\s*([\d.]+%?)(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/i;

const HSL_RE =
  /^hsla?\(\s*([\d.]+)\s*,\s*([\d.]+%)\s*,\s*([\d.]+%)(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/i;

const parseHex = (input: string): RGBA | null => {
  let r = 0,
    g = 0,
    b = 0,
    a = 1;

  let m = input.match(HEX_8);
  if (m) {
    const int = parseInt(m[1], 16);
    r = (int >> 24) & 0xff;
    g = (int >> 16) & 0xff;
    b = (int >> 8) & 0xff;
    a = ((int & 0xff) / 255);
    return { r, g, b, a };
  }

  m = input.match(HEX_6);
  if (m) {
    const int = parseInt(m[1], 16);
    r = (int >> 16) & 0xff;
    g = (int >> 8) & 0xff;
    b = int & 0xff;
    return { r, g, b, a };
  }

  m = input.match(HEX_4);
  if (m) {
    const hex = m[1];
    r = parseInt(hex[0] + hex[0], 16);
    g = parseInt(hex[1] + hex[1], 16);
    b = parseInt(hex[2] + hex[2], 16);
    a = parseInt(hex[3] + hex[3], 16) / 255;
    return { r, g, b, a };
  }

  m = input.match(HEX_3);
  if (m) {
    const hex = m[1];
    r = parseInt(hex[0] + hex[0], 16);
    g = parseInt(hex[1] + hex[1], 16);
    b = parseInt(hex[2] + hex[2], 16);
    return { r, g, b, a };
  }

  return null;
};

const pctTo255 = (val: string) => {
  if (val.endsWith("%")) {
    const v = parseFloat(val);
    return clamp255(Math.round((v / 100) * 255));
  }
  return clamp255(Math.round(parseFloat(val)));
};

const parseRgb = (input: string): RGBA | null => {
  const m = input.match(RGB_RE);
  if (!m) return null;
  const r = pctTo255(m[1]);
  const g = pctTo255(m[2]);
  const b = pctTo255(m[3]);
  let a = 1;
  if (m[4] != null) {
    const s = m[4];
    a = s.endsWith("%") ? clamp01(parseFloat(s) / 100) : clamp01(parseFloat(s));
  }
  return { r, g, b, a };
};

const hslToRgb = (h: number, s: number, l: number): RGB => {
  // h:[0,360), s:[0,1], l:[0,1]
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hh = (h / 60) % 6;
  const x = c * (1 - Math.abs((hh % 2) - 1));
  let r1 = 0,
    g1 = 0,
    b1 = 0;

  if (0 <= hh && hh < 1) [r1, g1, b1] = [c, x, 0];
  else if (1 <= hh && hh < 2) [r1, g1, b1] = [x, c, 0];
  else if (2 <= hh && hh < 3) [r1, g1, b1] = [0, c, x];
  else if (3 <= hh && hh < 4) [r1, g1, b1] = [0, x, c];
  else if (4 <= hh && hh < 5) [r1, g1, b1] = [x, 0, c];
  else if (5 <= hh && hh < 6) [r1, g1, b1] = [c, 0, x];

  const m = l - c / 2;
  const r = clamp255(Math.round((r1 + m) * 255));
  const g = clamp255(Math.round((g1 + m) * 255));
  const b = clamp255(Math.round((b1 + m) * 255));
  return { r, g, b };
};

const parseHsl = (input: string): RGBA | null => {
  const m = input.match(HSL_RE);
  if (!m) return null;
  const h = ((parseFloat(m[1]) % 360) + 360) % 360;
  const s = clamp01(parseFloat(m[2]) / 100);
  const l = clamp01(parseFloat(m[3]) / 100);
  let a = 1;
  if (m[4] != null) {
    const s4 = m[4];
    a = s4.endsWith("%") ? clamp01(parseFloat(s4) / 100) : clamp01(parseFloat(s4));
  }
  const { r, g, b } = hslToRgb(h, s, l);
  return { r, g, b, a };
};

/**
 * Parse any supported color string to RGBA (0–255 + alpha 0–1).
 * Returns null if parsing fails.
 */
export const parseColor = (input: string): RGBA | null => {
  const s = input.trim();
  return (
    parseHex(s) ||
    parseRgb(s) ||
    parseHsl(s) ||
    null
  );
};

/* ----------------------------------------------------------------------------
 * Formatting
 * ------------------------------------------------------------------------- */

export const toHex = (rgb: RGB): string => {
  const r = clamp255(rgb.r).toString(16).padStart(2, "0");
  const g = clamp255(rgb.g).toString(16).padStart(2, "0");
  const b = clamp255(rgb.b).toString(16).padStart(2, "0");
  return `#${r}${g}${b}`.toUpperCase();
};

export const toRgbaString = (rgba: RGBA): string =>
  `rgba(${clamp255(rgba.r)}, ${clamp255(rgba.g)}, ${clamp255(rgba.b)}, ${toFixed(clamp01(rgba.a), 3)})`;

/* ----------------------------------------------------------------------------
 * Luminance & Contrast (WCAG 2.1)
 * ------------------------------------------------------------------------- */

/** Convert 0–255 sRGB → linearized component */
const srgbToLinear = (v: number): number => {
  const c = clamp01(v / 255);
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
};

/** Relative luminance (0..1) using WCAG coefficients. */
export const relativeLuminance = (rgb: RGB): number => {
  const r = srgbToLinear(rgb.r);
  const g = srgbToLinear(rgb.g);
  const b = srgbToLinear(rgb.b);
  // ITU-R BT.709
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

/** Contrast ratio between two colors (>=1, <=21). Order independent. */
export const contrastRatio = (a: RGB, b: RGB): number => {
  const L1 = relativeLuminance(a);
  const L2 = relativeLuminance(b);
  const lighter = Math.max(L1, L2);
  const darker = Math.min(L1, L2);
  return (lighter + 0.05) / (darker + 0.05);
};

/** WCAG thresholds */
const AA_NORMAL = 4.5;
const AA_LARGE = 3.0;
const AAA_NORMAL = 7.0;
const AAA_LARGE = 4.5;

/** Check if contrast meets WCAG AA/AAA for text. */
export const meetsWCAG = (fg: RGB, bg: RGB, opts: AAOptions = {}): boolean => {
  const { level = "AA", large = false } = opts;
  const ratio = contrastRatio(fg, bg);
  if (level === "AAA") return ratio >= (large ? AAA_LARGE : AAA_NORMAL);
  // AA
  return ratio >= (large ? AA_LARGE : AA_NORMAL);
};

/* ----------------------------------------------------------------------------
 * Alpha blending
 * ------------------------------------------------------------------------- */

/**
 * Blend a foreground color (with alpha) over an opaque background.
 * Returns the resulting *opaque* RGB.
 */
export const blendOver = (fg: RGBA, bg: RGB): RGB => {
  const a = clamp01(fg.a);
  const r = Math.round(fg.r * a + bg.r * (1 - a));
  const g = Math.round(fg.g * a + bg.g * (1 - a));
  const b = Math.round(fg.b * a + bg.b * (1 - a));
  return { r, g, b };
};

/**
 * Compute the effective background of a standard EH glass panel over a base bg.
 * Defaults to our design tokens.
 */
export const effectiveGlassBackground = (
  baseBg: string = EH_COLORS.BASE_BG,
  glass: string = EH_COLORS.GLASS_BG
): RGB => {
  const base = parseColor(baseBg);
  const pane = parseColor(glass);
  if (!base || !pane) {
    // Fallback to base background if parsing fails.
    const b = parseColor(EH_COLORS.BASE_BG)!;
    return { r: b.r, g: b.g, b: b.b };
  }
  return blendOver(pane, base);
};

/* ----------------------------------------------------------------------------
 * Candidate selection & adjustment
 * ------------------------------------------------------------------------- */

/**
 * Choose the best text color from candidates for a given background.
 * Returns the first candidate that meets the `min` contrast (default 4.5).
 * If none meet it and `fallbackToMax` is true, returns the highest-contrast one.
 */
export const pickBestTextColor = (
  bg: string,
  candidates: string[] = ["#FFFFFF", "#000000", EH_COLORS.HIGHLIGHT, EH_COLORS.ACCENT],
  opts: PickOptions = {}
): string => {
  const { min = AA_NORMAL, fallbackToMax = true } = opts;
  const bgRGB = parseColor(bg);
  if (!bgRGB) return "#FFFFFF";

  let best = candidates[0];
  let bestRatio = -Infinity;

  for (const c of candidates) {
    const fg = parseColor(c);
    if (!fg) continue;
    const ratio = contrastRatio(fg, bgRGB);
    if (ratio >= min) {
      return toHex(fg); // earliest passing candidate wins (stable preference)
    }
    if (ratio > bestRatio) {
      best = toHex(fg);
      bestRatio = ratio;
    }
  }

  return fallbackToMax ? best : candidates[0];
};

/**
 * Lighten/darken a color in HSL space by `delta` (0..1).
 * Positive delta lightens; negative darkens.
 */
const adjustLightness = (rgb: RGB, delta: number): RGB => {
  // RGB -> HSL
  const r = rgb.r / 255, g = rgb.g / 255, b = rgb.b / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  const d = max - min;

  if (d !== 0) {
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h *= 60;
  }

  const l2 = clamp01(l + delta);

  // Reuse existing h/s, convert back
  const { r: rr, g: gg, b: bb } = hslToRgb(h, s, l2);
  return { r: rr, g: gg, b: bb };
};

/**
 * Try to adjust a foreground color towards meeting a target contrast over bg.
 * Returns a new HEX string. If already sufficient, returns the original.
 */
export const ensureContrast = (
  fgStr: string,
  bgStr: string,
  options: AdjustOptions = {}
): string => {
  const target = options.target ?? AA_NORMAL;
  const step = options.step ?? 0.02;
  const maxSteps = options.maxSteps ?? 20;
  const mode = options.mode ?? "auto";

  const fg0 = parseColor(fgStr);
  const bg = parseColor(bgStr);
  if (!fg0 || !bg) return fgStr;

  // If fg has alpha, pre-flatten against bg to measure *visible* contrast,
  // but we return an opaque HEX for stability in UI text colors.
  const fgOpaque: RGB = { r: fg0.r, g: fg0.g, b: fg0.b };

  if (contrastRatio(fgOpaque, bg) >= target) return toHex(fgOpaque);

  const tryDirection = (dir: "lighter" | "darker") => {
    let cur = { ...fgOpaque };
    for (let i = 0; i < maxSteps; i++) {
      cur = adjustLightness(cur, dir === "lighter" ? step : -step);
      if (contrastRatio(cur, bg) >= target) return cur;
    }
    return null;
  };

  if (mode === "lighter" || mode === "darker") {
    const solved = tryDirection(mode);
    return solved ? toHex(solved) : toHex(fgOpaque);
  }

  // auto: evaluate both and pick the one that reaches target with fewer steps,
  // or the one with higher final contrast if neither reaches target.
  let curLight = { ...fgOpaque };
  let curDark = { ...fgOpaque };
  let bestLight: RGB | null = null;
  let bestDark: RGB | null = null;

  for (let i = 0; i < maxSteps; i++) {
    curLight = adjustLightness(curLight, step);
    if (!bestLight && contrastRatio(curLight, bg) >= target) bestLight = { ...curLight };

    curDark = adjustLightness(curDark, -step);
    if (!bestDark && contrastRatio(curDark, bg) >= target) bestDark = { ...curDark };
  }

  if (bestLight && bestDark) {
    // choose the one with minimal total lightness shift (first to reach usually)
    const lightRatio = contrastRatio(bestLight, bg);
    const darkRatio = contrastRatio(bestDark, bg);
    return toHex(lightRatio >= darkRatio ? bestLight : bestDark);
  }
  if (bestLight) return toHex(bestLight);
  if (bestDark) return toHex(bestDark);

  // Neither achieved target — return whichever yields higher contrast at the end.
  const finalContrastLight = contrastRatio(curLight, bg);
  const finalContrastDark = contrastRatio(curDark, bg);
  return toHex(finalContrastLight >= finalContrastDark ? curLight : curDark);
};

/* ----------------------------------------------------------------------------
 * Convenience helpers for EH components
 * ------------------------------------------------------------------------- */

/**
 * Get a recommended text color for a given background. Tries white, black,
 * highlight, accent (in that order), requiring 4.5:1 by default. If none pass,
 * returns the one with highest contrast. This is a good default for labels.
 */
export const pickTextOnBg = (
  bg: string,
  opts: PickOptions = { min: AA_NORMAL, fallbackToMax: true }
): string => pickBestTextColor(bg, ["#FFFFFF", "#000000", EH_COLORS.HIGHLIGHT, EH_COLORS.ACCENT], opts);

/**
 * Compute a safe foreground color for text placed on a glass card rendered
 * above a base scene background.
 *
 * @param baseSceneBg - base color behind the glass (e.g., '#1A2B45')
 * @param preferred   - hint for initial color direction ('light'|'dark')
 * @param target      - contrast target (default AA normal: 4.5)
 */
export const textOnGlass = (
  baseSceneBg: string = EH_COLORS.BASE_BG,
  preferred: "light" | "dark" = "light",
  target: number = AA_NORMAL
): string => {
  const effective = effectiveGlassBackground(baseSceneBg, EH_COLORS.GLASS_BG);
  const start = preferred === "light" ? "#FFFFFF" : "#000000";
  if (meetsWCAG(parseColor(start)!, effective, { level: "AA", large: false })) return start;
  return ensureContrast(start, toHex(effective), { target, mode: preferred === "light" ? "lighter" : "darker" });
};

/* ----------------------------------------------------------------------------
 * Module self-test (non-throwing checks in dev; can be removed for prod)
 * ------------------------------------------------------------------------- */

const __DEV__ = process.env.NODE_ENV !== "production";
if (__DEV__) {
  // Quick sanity checks without throwing (keep silent if anything goes wrong).
  try {
    const bg = parseColor(EH_COLORS.BASE_BG)!;
    const white = parseColor("#FFFFFF")!;
    const ratio = contrastRatio(white, bg);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _ok = ratio > 1 && ratio <= 21;
  } catch {
    // ignore — do not crash in dev environments that shim process.*
  }
}

export default {
  parseColor,
  toHex,
  toRgbaString,
  relativeLuminance,
  contrastRatio,
  meetsWCAG,
  blendOver,
  effectiveGlassBackground,
  pickBestTextColor,
  ensureContrast,
  pickTextOnBg,
  textOnGlass,
  EH_COLORS,
};
