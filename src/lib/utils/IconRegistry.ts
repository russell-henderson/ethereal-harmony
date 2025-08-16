// File: src/lib/utils/IconRegistry.ts
//
// Purpose
// -------
// Central, typed registry for all icons used across Ethereal Harmony.
// This provides three benefits:
//   1) Single source of truth for which icons are allowed in UI
//   2) Easy refactors and consistent naming for teams
//   3) Tree-shakable imports from lucide-react
//
// Usage
// -----
// import { getIcon, Icon } from "@/lib/utils/IconRegistry";
//
// const LibraryIcon = getIcon("library");
// <LibraryIcon className="w-5 h-5" aria-hidden="true" />
//
// <Icon name="play" className="w-6 h-6" />
//
// Accessibility
// -------------
// - By default, <Icon> renders with aria-hidden unless an aria-label or title is provided.
// - If you want the icon to be read by a screen reader, pass one of:
//     aria-label="Play"
//     or title="Play" (which also adds a <title> child)
// - If purely decorative, do not pass labels and keep aria-hidden true.
//
// Design System Notes
// -------------------
// Keep icon sizes consistent using utility classes from your CSS layer.
// Example: w-5 h-5 for controls, w-4 h-4 for dense UI.
//
// Performance
// -----------
// We import specific icons from lucide-react. This allows bundlers to tree-shake
// unused icons. Do not use wildcard imports.

import type { LucideIcon } from "lucide-react";
import {
  // Navigation and sections
  Library,
  ListMusic,
  Music2,
  Radio,
  Search,
  Settings,
  // Transport and playback
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Repeat,
  Shuffle,
  // Audio controls
  Volume2,
  VolumeX,
  // System and UI
  SlidersHorizontal,
  Info,
} from "lucide-react";

/**
 * IconName
 * The only valid string keys for icons across the app.
 * Add new keys here when new icons are approved by design.
 */
export type IconName =
  | "library"
  | "playlists"
  | "discovery"
  | "search"
  | "settings"
  | "player"
  | "play"
  | "pause"
  | "next"
  | "prev"
  | "repeat"
  | "shuffle"
  | "volume"
  | "mute"
  | "eq"
  | "info";

/**
 * iconRegistry
 * Maps stable app-level names to Lucide icon components.
 * Fallback choice is Music2 which fits the domain when keys are unknown.
 */
export const iconRegistry: Record<IconName, LucideIcon> = {
  // Navigation
  library: Library,
  playlists: ListMusic,
  discovery: Radio,
  search: Search,
  settings: Settings,

  // Identity or section icon for the player
  player: Music2,

  // Transport
  play: Play,
  pause: Pause,
  next: SkipForward,
  prev: SkipBack,
  repeat: Repeat,
  shuffle: Shuffle,

  // Audio
  volume: Volume2,
  mute: VolumeX,
  eq: SlidersHorizontal,

  // System
  info: Info,
};

/**
 * fallbackIcon
 * Used when a key is not found in the registry.
 * Do not export to keep the public surface small.
 */
const fallbackIcon: LucideIcon = Music2;

/**
 * getIcon
 * Returns a Lucide icon component by registry key.
 * If the key is unknown, returns a sensible fallback.
 */
export const getIcon = (name: IconName | string): LucideIcon => {
  // Narrow unknown string to IconName when possible
  // and return fallback on miss
  return (iconRegistry as Record<string, LucideIcon>)[name] ?? fallbackIcon;
};

/**
 * listIcons
 * Utility to introspect available icon keys.
 * Useful for storybooks, internal docs, or debug menus.
 */
export const listIcons = (): IconName[] => Object.keys(iconRegistry) as IconName[];

/**
 * IconProps
 * Light wrapper around a Lucide icon with safer ARIA defaults.
 *
 * aria-hidden behavior:
 * - If aria-label or title is provided, aria-hidden is false to allow AT to read it.
 * - If no label is provided, we default to aria-hidden true for decorative use.
 *
 * size behavior:
 * - Do not hardcode size in code. Pass Tailwind or CSS classes like "w-5 h-5".
 * - The consumer controls visual size through className for flexibility.
 */
export type IconProps = Omit<React.ComponentProps<"svg">, "children"> & {
  name: IconName;
  title?: string; // Optional <title> element for accessibility tooltips
};

/**
 * Icon
 * Convenience component that fetches the Lucide component and renders it
 * with safe defaults. This is preferred for most UI usage.
 */
export const Icon: React.FC<IconProps> = ({
  name,
  className,
  title,
  // Allow consumers to override aria attributes explicitly if desired
  // We compute a default below when not provided
  ...rest
}) => {
  const Lucide = getIcon(name);

  // Compute default aria-hidden:
  // If user provided aria-label or title, expose to AT
  // Otherwise hide from AT
  const hasAriaLabel =
    typeof rest["aria-label"] === "string" && rest["aria-label"].trim().length > 0;

  const ariaHidden =
    rest["aria-hidden"] !== undefined
      ? rest["aria-hidden"]
      : !(hasAriaLabel || (title && title.trim().length > 0));

  // role="img" is implied for SVGs used as icons, but we set it for clarity
  // when the icon is not hidden from assistive tech
  const role =
    ariaHidden === true ? undefined : (rest.role ?? ("img" as React.AriaRole));

  return (
    <Lucide
      // Accessibility defaults
      aria-hidden={ariaHidden}
      role={role}
      // Visual size through classes, never inline styles by default
      className={className}
      // Forward remaining props (including data attributes)
      {...rest}
    >
      {/* Add <title> only when present so we do not create noisy nodes */}
      {title ? <title>{title}</title> : null}
    </Lucide>
  );
};

/**
 * assertIconAvailable
 * Development-time guard to catch typos early.
 * This is a no-op in production. Call it in places where icon names
 * are created dynamically from configuration or content.
 */
export const assertIconAvailable = (name: string): void => {
  if (import.meta.env?.MODE !== "production") {
    const exists = (iconRegistry as Record<string, unknown>)[name] != null;
    if (!exists) {
      // eslint-disable-next-line no-console
      console.warn(
        `[IconRegistry] Unknown icon "${name}". Falling back to "player". Valid keys: ${listIcons().join(
          ", "
        )}`
      );
    }
  }
};
