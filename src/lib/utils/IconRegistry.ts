/**
 * IconRegistry — central, typed registry for all icons used in Ethereal Harmony.
 *
 * ✅ Provides a single source of truth for icons:
 *    - Import a component wrapper:   import { Icon } from "@/lib/utils/IconRegistry";
 *    - Get a raw component:          import { getIcon } from "@/lib/utils/IconRegistry";
 *    - Import the map (legacy):      import iconRegistry from "@/lib/utils/IconRegistry";
 *
 * This ensures consistent iconography across the app and avoids scattered `lucide-react` imports.
 */

import React from "react";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Repeat,
  Repeat1,
  Shuffle,
  Volume2,
  VolumeX,
  Music2,
  SunMedium,
  Moon,
  MonitorSmartphone,
  Settings2,
  Loader2,
} from "lucide-react";

/**
 * Union of all allowed icon keys.
 * Adding/removing icons? Update this type + registry below.
 */
export type IconName =
  | "play"
  | "pause"
  | "prev"
  | "next"
  | "repeat"
  | "repeatOne"
  | "shuffle"
  | "volume"
  | "mute"
  | "music"
  | "hdr"
  | "dimmer"
  | "devices"
  | "settings"
  | "spinner";

/** Aliases for lucide-react components */
type IconComponent = React.ComponentType<React.SVGProps<SVGSVGElement>>;

/** Canonical registry: maps `IconName` → Lucide component */
export const iconRegistry: Record<IconName, IconComponent> = {
  play: Play,
  pause: Pause,
  prev: SkipBack,
  next: SkipForward,
  repeat: Repeat,
  repeatOne: Repeat1,
  shuffle: Shuffle,
  volume: Volume2,
  mute: VolumeX,
  music: Music2,
  hdr: SunMedium,
  dimmer: Moon,
  devices: MonitorSmartphone,
  settings: Settings2,
  spinner: Loader2,
};

/**
 * Helper: safely fetch an icon component by name.
 * Falls back to `Music2` if unknown — prevents runtime crashes.
 */
export const getIcon = (name: IconName): IconComponent => {
  return iconRegistry[name] ?? Music2;
};

/**
 * <Icon /> — tiny wrapper component that renders an icon by name.
 * Used in TopBar, PlaybackButtons, and anywhere else.
 */
export type IconProps = React.SVGProps<SVGSVGElement> & {
  name: IconName;
  title?: string; // optional accessible title
};
export const Icon: React.FC<IconProps> = ({ name, title, ...svgProps }) => {
  const Cmp = getIcon(name);
  return <Cmp aria-hidden={!title} aria-label={title} {...svgProps} />;
};

/** Default export kept for legacy imports */
export default iconRegistry;
