// src/lib/utils/IconRegistry.ts
/**
 * Central icon mapping + safe <Icon/> wrapper.
 * - Supports both canonical keys and legacy dotted aliases (e.g., "transport.play").
 * - Logs once for unknown names and renders a harmless <span> instead of crashing.
 */

import React from "react";
import {
  // Core UI
  Menu,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Cog,
  Search,
  EllipsisVertical,
  X,
  User,
  ArrowRight,
  Upload,
  // Player / transport
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Repeat,
  Shuffle,
  // Volume
  Volume2,
  VolumeX,
  // App / nav metaphors
  AppWindow,
  Library as LibraryIcon,
  ListMusic,
  Compass,
  Waves,
} from "lucide-react";

/** Canonical (preferred) keys */
type CanonicalIconName =
  | "menu"
  | "chevronLeft"
  | "chevronRight"
  | "chevronUp"
  | "chevronDown"
  | "settings"
  | "search"
  | "kebab"
  | "close"
  | "user"
  | "enter"
  | "upload"
  | "play"
  | "pause"
  | "next"
  | "prev"
  | "transport.play"
  | "transport.pause"
  | "transport.next"
  | "transport.prev"
  | "repeat"
  | "shuffle"
  | "volume"       // on
  | "mute"         // off
  | "app"
  | "library"
  | "playlists"
  | "discovery"
  | "waves";

/** Primary canonical registry */
const canonical: Record<CanonicalIconName, React.ComponentType<React.ComponentPropsWithoutRef<'svg'>>> = {
  // Core UI
  menu: Menu,
  chevronLeft: ChevronLeft,
  chevronRight: ChevronRight,
  chevronUp: ChevronUp,
  chevronDown: ChevronDown,
  settings: Cog,
  search: Search,
  kebab: EllipsisVertical,
  close: X,
  user: User,
  enter: ArrowRight,
  upload: Upload,

  // Player / transport
  play: Play,
  pause: Pause,
  next: SkipForward,
  prev: SkipBack,
  "transport.play": Play,
  "transport.pause": Pause,
  "transport.next": SkipForward,
  "transport.prev": SkipBack,
  repeat: Repeat,
  shuffle: Shuffle,

  // Volume
  volume: Volume2,
  mute: VolumeX,
  "volume.on": Volume2,
  "volume.off": VolumeX,

  // App / nav metaphors
  app: AppWindow,
  library: LibraryIcon,
  playlists: ListMusic,
  discovery: Compass,
  waves: Waves,
};

/**
 * Aliases for legacy/dotted names still present in some components
 * e.g. "transport.play", "volume.on".
 */
const aliases: Record<string, React.ComponentType<React.ComponentPropsWithoutRef<'svg'>>> = {
  // Transport namespace
  "transport.play": canonical.play,
  "transport.pause": canonical.pause,
  "transport.next": canonical.next,
  "transport.prev": canonical.prev,
  "transport.repeat": canonical.repeat,
  "transport.shuffle": canonical.shuffle,

  // Volume namespace
  "volume.on": canonical.volume,
  "volume.off": canonical.mute,

  // App/nav namespace (if any legacy usage exists)
  "app.logo": canonical.app,
  "nav.library": canonical.library,
  "nav.playlists": canonical.playlists,
  "nav.discovery": canonical.discovery,
};

export const iconRegistry: Record<string, React.ComponentType<React.ComponentPropsWithoutRef<'svg'>>> = {
  ...canonical,
  ...aliases,
};

export type IconProps = {
  name: string;                 // allow any string; we guard at runtime
  size?: number;
  width?: number;
  height?: number;
  className?: string;
  strokeWidth?: number;
  "aria-hidden"?: boolean;
  role?: string;
  title?: string;
};

/** Safe <Icon/> that won’t crash on unknown names */
const unknownWarned = new Set<string>();

export const Icon: React.FC<IconProps> = ({
  name,
  size = 20,
  width,
  height,
  className,
  strokeWidth = 1.75,
  ...rest
}) => {
  const Cmp = iconRegistry[name];
  if (!Cmp) {
    if (!unknownWarned.has(name)) {
      // eslint-disable-next-line no-console
      console.error(
        `[IconRegistry] Unknown icon "${name}". Add it to iconRegistry or update usages. Rendering a placeholder.`
      );
      unknownWarned.add(name);
    }
    return React.createElement("span", { className, "aria-hidden": "true", ...rest });
  }
  return React.createElement(Cmp, {
    width: width || size,
    height: height || size,
    strokeWidth,
    className,
    ...rest,
  });
};

export default Icon;
