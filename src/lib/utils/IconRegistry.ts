// src/lib/utils/IconRegistry.ts
/**
 * Ethereal Harmony — Icon Registry (Phase 1 aligned, Phase 2-ready)
 *
 * Purpose in the project:
 * - Provide a tiny, dependency-free, *central* source of truth for all SVG
 *   icons used across the SPA so we avoid ad-hoc imports and keep styling,
 *   sizing, and accessibility consistent with our design system.
 * - The registry exposes a `<Icon name="play" />` React component and
 *   low-level helpers for non-React contexts (e.g., generating an inline SVG
 *   string for a canvas overlay, etc.).
 *
 * Design constraints:
 * - React 18 + TypeScript. No external icon libraries to keep bundle lean.
 * - “CurrentColor” driven: icons inherit color from CSS (text color), which
 *   makes them automatically theme-aware. Use our palette tokens in CSS.
 * - Glassmorphism-friendly: default stroke/opacity values look crisp on
 *   translucent surfaces; AA contrast remains controllable via color.
 * - Accessibility: role="img", aria-hidden when no `title`, or labeled with
 *   a <title> (ID-linked) when `title` is provided.
 * - Performance: icons are defined with compact path data; the registry
 *   avoids re-allocations and supports SSR safely.
 *
 * Privacy: Local-only; no network.
 */

import * as React from "react";

/* ----------------------------------------------------------------------------
 * Tokens (kept minimal; use our design system in component styles)
 * ------------------------------------------------------------------------- */

const ICON_VIEWBOX = "0 0 24 24";

/** Default sizes (px). Components can pass a number or string for size. */
export const ICON_SIZES = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 20,
  xl: 24,
} as const;

export type IconSizeKey = keyof typeof ICON_SIZES;

/* ----------------------------------------------------------------------------
 * Icon Definitions
 * ------------------------------------------------------------------------- */

/** An icon can be pure stroke, pure fill, or a mix. */
export type IconDef =
  | { viewBox?: string; stroke: string[]; fill?: string[] }
  | { viewBox?: string; fill: string[]; stroke?: string[] };

/**
 * Registry store. We keep it mutable so teams can register app-specific icons
 * at runtime (e.g., feature flags) without changing the core bundle.
 */
const REGISTRY = new Map<string, IconDef>();

/** Helper to define a stroke path array quickly. */
const S = (...d: string[]): IconDef => ({ viewBox: ICON_VIEWBOX, stroke: d });

/** Helper to define a fill path array quickly. */
const F = (...d: string[]): IconDef => ({ viewBox: ICON_VIEWBOX, fill: d });

/**
 * Built-in icons (subset tailored to Ethereal Harmony).
 * All paths target a 24x24 viewbox. They are intentionally simple / hand-tuned.
 * NOTE: These are bespoke paths (not copied from a licensed set).
 */
const BUILT_INS: Record<string, IconDef> = {
  // Transport
  play: F("M8 5.5v13l10-6.5-10-6.5Z"),
  pause: S("M7 5h4v14H7z", "M13 5h4v14h-4z"), // rectangles drawn with stroke for consistency
  stop: F("M6 6h12v12H6z"),
  prev: S("M6 12V6l7 6-7 6V12Z", "M17 6v12"), // left-facing (triangle + bar)
  next: S("M18 12V6l-7 6 7 6V12Z", "M7 6v12"), // right-facing (triangle + bar)
  repeat: S(
    "M7 7h9a4 4 0 0 1 0 8h-1",
    "M9 17l-3-3 3-3",
    "M17 7l-3-3"
  ),
  "repeat-one": S(
    "M7 7h9a4 4 0 0 1 0 8h-1",
    "M9 17l-3-3 3-3",
    "M13 11v4",
    "M13 11l-1 1"
  ),
  shuffle: S("M4 7h3l10 10h3", "M20 7h-3l-1.5 1.5", "M4 17h3l4-4", "M17 4l3 3-3 3"),
  // Volume
  volume: S("M5 10v4h3l4 3V7l-4 3H5Z", "M16 9a3 3 0 0 1 0 6", "M18 7a6 6 0 0 1 0 10"),
  mute: S("M5 10v4h3l4 3V7l-4 3H5Z", "M18 9l-4 4", "M14 9l4 4"),
  // Timeline / seek
  seek: S("M4 12h16", "M10 8l-4 4 4 4"),
  // Player UI / Info
  info: S("M12 8.5a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z", "M11 10h2v6h-2z", "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z"),
  eq: S("M7 4v16", "M12 8v8", "M17 6v12", "M7 8h4", "M12 12h5"), // sliders stylized
  settings: S(
    "M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z",
    "M4 12h2",
    "M18 12h2",
    "M12 4v2",
    "M12 18v2",
    "M6 6l1.5 1.5",
    "M16.5 16.5L18 18",
    "M6 18l1.5-1.5",
    "M16.5 7.5L18 6"
  ),
  // Visualizer toggles
  hdr: S("M5 12h3l2-3 2 6 2-3h3", "M4 4h16v16H4z"),
  dimmer: S("M12 5v14", "M5 12h14"), // plus; used with state to indicate dimmer strength
  stats: S("M6 18V9", "M12 18V6", "M18 18v-4"),
  wireframe: S("M4 8h16", "M4 16h16", "M8 4v16", "M16 4v16"),
  bounds: S("M5 5h14v14H5z", "M9 9h6v6H9z"),
  // Media / library
  album: S("M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16Z", "M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z"),
  track: S("M8 7h8v10H8z", "M12 7v10"), // simple cassette motif
  queue: S("M5 7h14", "M5 12h9", "M5 17h14"),
  // UI chrome
  close: S("M6 6l12 12", "M18 6l-12 12"),
  menu: S("M4 7h16", "M4 12h16", "M4 17h16"),
  chevron_left: S("M15 6l-6 6 6 6"),
  chevron_right: S("M9 6l6 6-6 6"),
  chevron_up: S("M6 15l6-6 6 6"),
  chevron_down: S("M6 9l6 6 6-6"),
  external: S("M14 4h6v6", "M20 4l-9 9", "M20 14v6H4V4h6"),
  download: S("M12 4v12", "M8 12l4 4 4-4", "M5 20h14"),
  upload: S("M12 20V8", "M8 12l4-4 4 4", "M5 20h14"),
  heart: S("M12 20s-7-4.35-7-10a4 4 0 0 1 7-2 4 4 0 0 1 7 2c0 5.65-7 10-7 10Z"),
  // Dev/diagnostics
  dev: S("M8 6l-6 6 6 6", "M16 6l6 6-6 6", "M10 20h4"),
};

/** Preload built-ins into the registry. */
for (const [k, def] of Object.entries(BUILT_INS)) REGISTRY.set(k, def);

/* ----------------------------------------------------------------------------
 * Public API: registry management
 * ------------------------------------------------------------------------- */

export type IconName = keyof typeof BUILT_INS | (string & {});

/** Register/override an icon at runtime. */
export const registerIcon = (name: IconName, def: IconDef): void => {
  REGISTRY.set(name, def);
};

/** Remove an icon from the registry. */
export const unregisterIcon = (name: IconName): void => {
  REGISTRY.delete(name);
};

/** Test helper / reset to built-in set. */
export const resetRegistry = (): void => {
  REGISTRY.clear();
  for (const [k, def] of Object.entries(BUILT_INS)) REGISTRY.set(k, def);
};

/** Retrieve an icon definition (read-only). */
export const getIconDef = (name: IconName): IconDef | undefined => REGISTRY.get(name);

/* ----------------------------------------------------------------------------
 * React component
 * ------------------------------------------------------------------------- */

export type IconProps = React.SVGProps<SVGSVGElement> & {
  /** Icon registry name. */
  name: IconName;
  /**
   * Optional accessible label. If provided, a <title> will be rendered and the
   * SVG will be role="img" with aria-labelledby. If omitted, aria-hidden="true".
   */
  title?: string;
  /** Size in px or token key (defaults to 16). */
  size?: number | string | IconSizeKey;
  /** Stroke width for stroke icons (defaults to 1.8). */
  strokeWidth?: number;
  /** Rounded line caps/joins for friendlier visuals (default 'round'). */
  rounded?: boolean;
};

/**
 * `<Icon />` renders an SVG from the registry.
 * - Colors inherit from `currentColor`.
 * - Stroke icons: stroke="currentColor", fill="none".
 * - Fill icons: fill="currentColor".
 * - Mixed icons: both are rendered in order (stroke behind fill by default).
 */
export const Icon: React.FC<IconProps> = ({
  name,
  title,
  size = ICON_SIZES.md,
  strokeWidth = 1.8,
  rounded = true,
  ...rest
}) => {
  const def = getIconDef(name);
  // SSR-safety: render nothing if icon is unknown to avoid hydration mismatch.
  if (!def) return null;

  // Resolve size token → px
  const px =
    typeof size === "number"
      ? size
      : typeof size === "string" && size in ICON_SIZES
      ? ICON_SIZES[size as IconSizeKey]
      : size;

  // Accessibility wiring
  const titleId = React.useId();
  const labelled = !!title;

  const common: React.SVGProps<SVGSVGElement> = {
    width: px,
    height: px,
    viewBox: def.viewBox || ICON_VIEWBOX,
    role: "img",
    "aria-hidden": labelled ? undefined : true,
    "aria-labelledby": labelled ? titleId : undefined,
    focusable: false,
    ...rest,
  };

  // Line aesthetics consistent with our design system
  const line = {
    stroke: "currentColor",
    fill: "none",
    strokeWidth,
    strokeLinecap: rounded ? "round" : "butt",
    strokeLinejoin: rounded ? "round" : "miter",
    vectorEffect: "non-scaling-stroke" as const,
  };

  return (
    <svg {...common}>
      {labelled && <title id={titleId}>{title}</title>}
      {"stroke" in def &&
        def.stroke!.map((d, i) => <path key={`s${i}`} d={d} {...line} />)}
      {"fill" in def &&
        def.fill!.map((d, i) => <path key={`f${i}`} d={d} fill="currentColor" />)}
    </svg>
  );
};

/* ----------------------------------------------------------------------------
 * Convenience: IconButton helper (glassmorphism friendly)
 * ------------------------------------------------------------------------- */

export type IconButtonProps = {
  name: IconName;
  label: string; // accessible label
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  size?: IconProps["size"];
  strokeWidth?: number;
  rounded?: boolean;
};

/**
 * Returns accessible props for a standard icon-only button. Styling should be
 * applied in CSS using our design system tokens (glass background, border, etc.).
 *
 * Example:
 *   <button {...iconButton({ name: 'play', label: 'Play' })} />
 */
export const iconButton = ({
  name,
  label,
  onClick,
  size = ICON_SIZES.lg,
  strokeWidth,
  rounded,
}: IconButtonProps) => {
  return {
    type: "button" as const,
    "aria-label": label,
    onClick,
    children: <Icon name={name} title={label} size={size} strokeWidth={strokeWidth} rounded={rounded} />,
  };
};

/* ----------------------------------------------------------------------------
 * Non-React helpers
 * ------------------------------------------------------------------------- */

/**
 * Generate a minimal inline SVG string for environments where React elements
 * are not desirable (e.g., injecting into a canvas overlay DOM node).
 */
export const iconToSvgString = (
  name: IconName,
  opts: { size?: number; strokeWidth?: number; rounded?: boolean; color?: string } = {}
): string | null => {
  const def = getIconDef(name);
  if (!def) return null;
  const size = opts.size ?? ICON_SIZES.md;
  const color = opts.color ?? "currentColor";
  const strokeWidth = opts.strokeWidth ?? 1.8;
  const rounded = opts.rounded ?? true;

  const strokeAttrs = `stroke="${color}" fill="none" stroke-width="${strokeWidth}" stroke-linecap="${
    rounded ? "round" : "butt"
  }" stroke-linejoin="${rounded ? "round" : "miter"}" vector-effect="non-scaling-stroke"`;

  const stroke = "stroke" in def ? def.stroke!.map((d) => `<path d="${d}" ${strokeAttrs}/>`).join("") : "";
  const fill = "fill" in def ? def.fill!.map((d) => `<path d="${d}" fill="${color}"/>`).join("") : "";

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="${
    def.viewBox || ICON_VIEWBOX
  }" aria-hidden="true" focusable="false">${stroke}${fill}</svg>`;
};

/* ----------------------------------------------------------------------------
 * Example usage (documentation):
 * ---------------------------------------------------------------------------
 * import { Icon, iconButton, registerIcon } from "@/lib/utils/IconRegistry";
 *
 * // In a component:
 * <Icon name="play" size="xl" title="Play" />
 *
 * // Icon-only button:
 * <button {...iconButton({ name: "next", label: "Next track" })} />
 *
 * // Register a custom icon at runtime:
 * registerIcon("my-badge", { fill: ["M4 4h16v16H4z", "M8 8h8v8H8z"] });
 * <Icon name="my-badge" size={18} title="Beta" />
 * ------------------------------------------------------------------------- */

export default Icon;
