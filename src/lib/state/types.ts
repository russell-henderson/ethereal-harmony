// src/lib/state/types.ts
/**
 * Shared state types (Phase 1/2)
 * -----------------------------------------------------------------------------
 * This module centralizes the **canonical** shapes used across our Zustand
 * stores and UI. It also exposes compatibility helpers for legacy shapes from
 * early prototypes (so we can safely map old data into the new structures).
 *
 * Design notes:
 * - `Track` here matches the loader/engine contracts in Phase 2 (TrackLoader /
 *   AudioEngine / PlaybackController). It is the single source of truth for the
 *   player UI (PlayerCard, Timeline, etc.).
 * - We keep a `LegacyTrackV1` type that reflects the Phase 0/early-Phase 1
 *   prototype so persisted data (or tests) can be migrated in a predictable way.
 * - The player/viz/settings store interfaces are intentionally *minimal* and
 *   forward-compatible: actions are typed as function signatures but optional,
 *   because slices are composed gradually and tests sometimes stub them out.
 */


/* ----------------------------------------------------------------------------
 * Tracks
 * ------------------------------------------------------------------------- */

/** Where a track originates. */
export type TrackSource = "local" | "remote";

/**
 * Canonical Track (Phase 2+)
 * - Consumed by the player store & UI.
 * - Produced by TrackLoader (from File or URL).
 * - Understood by AudioEngine/PlaybackController.
 */
export type Track = {
  /** Stable identifier for lists/queue. */
  id: string;

  /** Display metadata (may be empty if unknown). */
  title: string;
  artist?: string;
  album?: string;

  /** Optional artwork URL (object URL or remote), if available. */
  artworkUrl?: string;

  /** Playable URL (object URL for local Files, normalized remote URL otherwise). */
  url: string;

  /** Duration in seconds (if known). Streams/HLS may leave this undefined. */
  duration?: number;

  /** Best-effort MIME hint (e.g., "audio/mpeg", "application/vnd.apple.mpegurl"). */
  mime?: string;

  /** True if this is a stream or has no fixed duration (e.g., HLS). */
  isStream?: boolean;

  /** Origin of the media (local File or remote). */
  source: TrackSource;

  /** Internal: object URL for local tracks (to revoke on cleanup). */
  _objectUrl?: string;
  /** Number of times played (for discovery/sorting). */
  playCount?: number;
  /** Timestamp when added to library/queue. */
  addedAt?: number;
};

export type VizParams = {
  /** Stable identifier for lists/queue. */
  id: string;
  /** Display metadata (may be empty if unknown). */
  title: string;
  artist?: string;
  album?: string;
  /** Optional artwork URL (object URL or remote), if available. */
  artworkUrl?: string;
  /** Playable URL (object URL for local Files, normalized remote URL otherwise). */
  url: string;
  /** Duration in seconds (if known). Streams/HLS may leave this undefined. */
  duration?: number;
  /** Best-effort MIME hint (e.g., "audio/mpeg", "application/vnd.apple.mpegurl"). */
  mime?: string;
  /** True if this is a stream or has no fixed duration (e.g., HLS). */
  isStream?: boolean;
  /** Origin of the media (local File or remote). */
  source: TrackSource;
  /** Internal: object URL for local tracks (to revoke on cleanup). */
  _objectUrl?: string;
  /** Number of times played (for discovery/sorting). */
  playCount?: number;
  /** Timestamp when added to library/queue. */
  addedAt?: number;
};

// Playlist type for player store

/**
 * Legacy Track shape from prototypes (Phase 0/early Phase 1).
 * Kept for migration of older persisted state.
 */
export type LegacyTrackV1 = {
  id: string;
  title: string;
  artist: string;
  album?: string;
  /** Duration in seconds (required in legacy). */
  durationSec: number;
  /** Source discriminated union. */
  src: { kind: "file" | "stream"; url: string };
  artworkUrl?: string;
};

/** Type guard: detect legacy track objects at runtime. */
export function isLegacyTrackV1(x: unknown): x is LegacyTrackV1 {
  const t = x as LegacyTrackV1;
  return !!t && typeof t === "object" && typeof t.id === "string" && typeof t.title === "string" && !!t.src && typeof t.src.url === "string";
}

/**
 * Migration helper: convert LegacyTrackV1 -> Track (Phase 2).
 * - Maps `src.kind` to `source`/`isStream`.
 * - Copies duration and metadata.
 * - Normalizes field names (`url`, `duration`).
 */
export function mapLegacyTrackToCurrent(t: LegacyTrackV1): Track {
  const source: TrackSource =
    t.src.kind === "file"
      ? (t.src.url.startsWith("blob:") || t.src.url.startsWith("file:") ? "local" : "remote")
      : "remote";

  const isStream = t.src.kind === "stream" || /\.m3u8(\?.*)?$/i.test(t.src.url);

  return {
    id: t.id,
    title: t.title,
    artist: t.artist,
    album: t.album,
    artworkUrl: t.artworkUrl,
    url: t.src.url,
    duration: Number.isFinite(t.durationSec) ? t.durationSec : undefined,
    mime: isStream ? "application/vnd.apple.mpegurl" : undefined,
    isStream,
    source,
  };
}

/* ----------------------------------------------------------------------------
 * Player store (shared subset)
 * ------------------------------------------------------------------------- */

/** Discrete playback states for UI/logic clarity. */
export type PlaybackState = "idle" | "loading" | "playing" | "paused" | "error";

/** Actions exposed by the player slice (intentionally optional for flexibility). */
export type PlayerActions = Partial<{
  /** Load a single track (replaces the queue). */
  loadFromUrl: (url: string, autoplay?: boolean) => Promise<void> | void;
  loadFromFile: (file: File, autoplay?: boolean) => Promise<void> | void;

  /** Queue management */
  setQueue: (tracks: Track[], startIndex?: number) => Promise<void> | void;
  addToQueue: (track: Track, atEnd?: boolean) => void;
  removeFromQueue: (index: number) => void;
  clearQueue: () => void;
  next: () => Promise<void> | void;
  prev: () => Promise<void> | void;

  /** Transport */
  play: () => Promise<void> | void;
  pause: () => Promise<void> | void;
  toggle: () => Promise<void> | void;
  seek: (seconds: number) => void;
  nudgeSeek: (deltaSeconds: number) => void;

  /** Volume / rate / mute */
  setVolume: (v: number) => void;
  nudgeVolume: (delta: number) => void;
  toggleMute: () => void;
  setRate: (r: number) => void;
}>;

/** Core state exposed by the player slice. */
export type PlayerCoreState = {
  /** Current, duration, and derived flags for UI. */
  current: Track | null;
  queue: Track[];
  index: number;

  playbackState: PlaybackState;
  isPlaying: boolean;

  /** Position and duration (seconds). */
  position: number;
  duration: number;

  /** Volume/mute/rate */
  volume: number; // 0..1
  muted: boolean;
  playbackRate: number; // 0.25..4
};

/** Full player store type (state + actions + playlists). */
export type PlayerStore = PlayerCoreState & PlayerActions & {
  playlists: Playlist[];
  hasHydrated?: boolean;
};

/* ----------------------------------------------------------------------------
 * Visualizer store (subset mirror of useVizStore to avoid cross-import cycles)
 * ------------------------------------------------------------------------- */

/** Visualizer preset IDs we support in V1/V2. */
export type VizPresetId = "nebula" | "glass-waves" | "strobe-pulse";

/** Curated visualizer parameters sent to Three.js uniforms. */
export type VizTrack = {
  intensity: number;     // 0..1
  bloom: number;         // 0..0.5
  motionScale: number;   // 0..1
  smooth: number;        // 0..1 analyser smoothing
  baseColor: string;     // CSS color
  reactiveHue: string;   // CSS color
  accent: string;        // CSS color
  particleCount: number; // target particles; scene clamps by tier/hardware
};

export type VizStore = {
  theme: "dark" | "system";
  hdr: boolean;
  dimmer: boolean;
  presetId: VizPresetId;
  params: VizParams;
};

/* ----------------------------------------------------------------------------
 * Settings/navigation (Phase 1 router)
 * ------------------------------------------------------------------------- */

// Playlist type for player store
export type Playlist = {
  id: string;
  name: string;
  trackIds: string[];
};

/** App views (mirrors src/app/routes.tsx without importing to avoid cycles). */
export type AppView = "player" | "settings" | "stream";

export type ThemeMode = "dark" | "system";

export type SettingsStore = {
  theme: ThemeMode;
  view: AppView;
  reducedMotion?: boolean;
};

/* ----------------------------------------------------------------------------
 * Diagnostics / analyser types (small mirrors for consumers)
 * ------------------------------------------------------------------------- */

/** Compact band energy snapshot used by visualizer & meters. */
export type BandEnergies = { low: number; mid: number; high: number; rms: number };

/* ----------------------------------------------------------------------------
 * End of types
 * ------------------------------------------------------------------------- */
