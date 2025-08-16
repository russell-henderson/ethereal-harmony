// src/lib/utils/IconRegistry.ts
// Central icon registry with a tiny alias layer for back-compat.
// If you see "[IconRegistry] Unknown icon key", either fix the call-site to a semantic key
// or add a one-line alias below.

import React from "react";
import {
  Waves,
  Library,
  ListMusic,
  Compass,
  SkipBack,
  SkipForward,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Disc3,
  AudioWaveform,
  Settings,
  Search
} from "lucide-react";

export type IconKey =
  | "app"
  | "search"
  | "settings"
  | "nav.library"
  | "nav.playlists"
  | "nav.discovery"
  | "transport.prev"
  | "transport.play"
  | "transport.pause"
  | "transport.next"
  | "media.disc"
  | "media.waveform"
  | "volume.on"
  | "volume.mute";

export const iconMap: Record<IconKey, React.ComponentType<any>> = {
  app: Waves,
  search: Search,
  settings: Settings,

  "nav.library": Library,
  "nav.playlists": ListMusic,
  "nav.discovery": Compass,

  "transport.prev": SkipBack,
  "transport.play": Play,
  "transport.pause": Pause,
  "transport.next": SkipForward,

  "media.disc": Disc3,
  "media.waveform": AudioWaveform,

  "volume.on": Volume2,
  "volume.mute": VolumeX
};

/**
 * Back-compat aliases. Map any legacy/"loose" names to the semantic keys above.
 * NOTE: Keep this minimal and delete entries once you’ve updated call-sites.
 */
const aliasMap: Record<string, IconKey> = {
  // Old generic names we’ve seen in the codebase:
  music: "media.disc",
  note: "media.disc",
  prev: "transport.prev",
  next: "transport.next",
  play: "transport.play",
  pause: "transport.pause",
  library: "nav.library",
  playlists: "nav.playlists",
  discovery: "nav.discovery",
  waveform: "media.waveform",
  volume: "volume.on",
  mute: "volume.mute",
  settings: "settings",
  search: "search",
  app: "app"
};

const normalize = (key: string): IconKey | undefined => {
  // Exact match to a semantic key?
  if ((iconMap as any)[key]) return key as IconKey;
  // Resolve alias (case-insensitive, tolerate stray spaces)
  const k = key.trim().toLowerCase();
  return aliasMap[k];
};

export const getIcon = (key: IconKey | string): React.ComponentType<any> => {
  const normalized = normalize(String(key));
  if (!normalized) {
    throw new Error(`[IconRegistry] Unknown icon key: "${key}"`);
  }
  return iconMap[normalized];
};

export const Icon: React.FC<
  { name: IconKey | string } & React.ComponentProps<"svg">
> = ({ name, ...svgProps }) => {
  const Comp = getIcon(name);
  return <Comp aria-hidden focusable="false" {...svgProps} />;
};

// Back-compat default export (you can remove once all imports are named).
const IconRegistry = { getIcon, Icon, iconMap };
export default IconRegistry;
