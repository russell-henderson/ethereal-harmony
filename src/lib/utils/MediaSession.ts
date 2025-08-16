// src/lib/utils/MediaSession.ts
/**
 * MediaSession helpers (Phase 2)
 * -----------------------------------------------------------------------------
 * Tiny, safe wrappers around the Media Session API.
 *
 * Responsibilities:
 *  - Update metadata (title/artist/album/artwork).
 *  - Register action handlers (play/pause/next/previous/seekto).
 *  - Update playback & position state for lock-screen/OS integrations.
 *
 * Design notes:
 *  - All functions are no-ops when Media Session is unavailable.
 *  - Defensively typed and guarded for SSR.
 *  - We keep the last applied metadata/handlers so callers can re-apply or
 *    update incrementally without juggling state.
 */

type ArtworkItem = { src: string; sizes?: string; type?: string };

export type MediaSessionActions = Partial<{
  play: () => void | Promise<void>;
  pause: () => void | Promise<void>;
  stop: () => void | Promise<void>;
  nexttrack: () => void | Promise<void>;
  previoustrack: () => void | Promise<void>;
  seekbackward: (seconds: number) => void | Promise<void>;
  seekforward: (seconds: number) => void | Promise<void>;
  seekto: (position: number) => void | Promise<void>;
}>;

export type UpdateMediaSessionPayload = {
  title: string;
  artist?: string;
  album?: string;
  artwork?: ArtworkItem[];
  actions?: MediaSessionActions;
};

type PositionState = {
  duration?: number; // seconds
  position?: number; // seconds
  playbackRate?: number; // 0.25..4
};

const hasWindow = typeof window !== "undefined";
const hasNavigator = typeof navigator !== "undefined";
const ms: () => MediaSession | null = () =>
  (hasNavigator && "mediaSession" in navigator ? (navigator as any).mediaSession : null);

const normalizeArtwork = (art?: ArtworkItem[] | null): ArtworkItem[] | undefined => {
  if (!Array.isArray(art) || art.length === 0) return undefined;
  // Deduplicate by src; ensure sizes are strings like "96x96"
  const seen = new Set<string>();
  const out: ArtworkItem[] = [];
  for (const a of art) {
    if (!a || !a.src || seen.has(a.src)) continue;
    seen.add(a.src);
    out.push({
      src: a.src,
      sizes: a.sizes && /^\d+x\d+$/.test(a.sizes) ? a.sizes : undefined,
      type: a.type,
    });
  }
  return out.length ? out : undefined;
};

// Keep last-applied state so we can reapply if needed
let lastMeta: UpdateMediaSessionPayload | null = null;
let lastPosition: PositionState | null = null;

/**
 * Register handlers. Replaces existing handlers by clearing first.
 */
export function setActionHandlers(actions: MediaSessionActions | undefined): void {
  const session = ms();
  if (!session || typeof session.setActionHandler !== "function") return;

  // Clear everything first to avoid dangling references
  clearActionHandlers();

  if (!actions) return;

  try {
    if (actions.play) session.setActionHandler("play", () => void actions.play!());
    if (actions.pause) session.setActionHandler("pause", () => void actions.pause!());
    if (actions.stop) session.setActionHandler("stop", () => void actions.stop!());
    if (actions.nexttrack) session.setActionHandler("nexttrack", () => void actions.nexttrack!());
    if (actions.previoustrack)
      session.setActionHandler("previoustrack", () => void actions.previoustrack!());
    if (actions.seekbackward)
      session.setActionHandler("seekbackward", (d: MediaSessionActionDetails) =>
        actions.seekbackward!(d.seekOffset ?? 10)
      );
    if (actions.seekforward)
      session.setActionHandler("seekforward", (d: MediaSessionActionDetails) =>
        actions.seekforward!(d.seekOffset ?? 10)
      );
    if (actions.seekto)
      session.setActionHandler("seekto", (d: MediaSessionActionDetails) => {
        if (typeof d.seekTime === "number") actions.seekto!(d.seekTime);
      });
  } catch {
    // Some handlers may throw in older engines; ignore.
  }
}

/** Remove all registered action handlers (safe no-op if unsupported). */
export function clearActionHandlers(): void {
  const session = ms();
  if (!session || typeof session.setActionHandler !== "function") return;
  try {
    const all: MediaSessionAction[] = [
      "play",
      "pause",
      "stop",
      "nexttrack",
      "previoustrack",
      "seekbackward",
      "seekforward",
      "seekto",
    ];
    for (const a of all) session.setActionHandler(a, null);
  } catch {
    // ignore
  }
}

/**
 * Update metadata (title/artist/album/artwork) and optionally actions.
 * This is the primary, convenient entry point used by the controller.
 */
export function updateMediaSession(payload: UpdateMediaSessionPayload): void {
  const session = ms();
  if (!session) return;

  const artwork = normalizeArtwork(payload.artwork);
  lastMeta = { ...payload, artwork };

  // Set metadata
  try {
    const meta = new (window as any).MediaMetadata({
      title: payload.title || "Unknown title",
      artist: payload.artist ?? "",
      album: payload.album ?? "",
      artwork,
    });
    session.metadata = meta;
  } catch {
    // On older browsers, metadata may not exist; ignore.
  }

  // Apply actions if provided
  if (payload.actions) {
    setActionHandlers(payload.actions);
  }
}

/** Update playback state ("none" | "paused" | "playing"). */
export function setPlaybackState(state: MediaSessionPlaybackState): void {
  const session = ms();
  if (!session) return;
  try {
    session.playbackState = state;
  } catch {
    // ignore
  }
}

/** Update position state (duration, position, playbackRate) when available. */
export function setPositionState(state: PositionState): void {
  const session = ms();
  if (!session || typeof (session as any).setPositionState !== "function") {
    lastPosition = { ...state };
    return;
  }
  // Clamp to safe numbers to avoid DOM exceptions
  const duration = isFiniteNumber(state.duration) ? Math.max(0, state.duration!) : undefined;
  const position = isFiniteNumber(state.position) ? Math.max(0, state.position!) : undefined;
  const playbackRate = isFiniteNumber(state.playbackRate) ? state.playbackRate! : undefined;

  try {
    (session as any).setPositionState({
      duration,
      position,
      playbackRate,
    });
    lastPosition = { duration, position, playbackRate };
  } catch {
    // ignore
  }
}

/** Reapply the last known metadata, actions, and position state (if any). */
export function reapply(): void {
  if (lastMeta) updateMediaSession(lastMeta);
  if (lastPosition) setPositionState(lastPosition);
}

/** Clear metadata and handlers (useful on teardown). */
export function reset(): void {
  const session = ms();
  if (!session) return;
  try {
    session.metadata = null as any;
  } catch {
    // ignore
  }
  clearActionHandlers();
  lastMeta = null;
  lastPosition = null;
}

/** Convenience: update everything in one go. */
export function updateAll(payload: UpdateMediaSessionPayload & PositionState & { playing?: boolean }) {
  updateMediaSession(payload);
  setPositionState({
    duration: payload.duration,
    position: payload.position,
    playbackRate: payload.playbackRate,
  });
  if (typeof payload.playing === "boolean") {
    setPlaybackState(payload.playing ? "playing" : "paused");
  }
}

// ---- Utilities --------------------------------------------------------------

function isFiniteNumber(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n);
}

// Minimal DOM type fallbacks for older TS lib versions
type MediaSessionAction =
  | "play"
  | "pause"
  | "stop"
  | "seekbackward"
  | "seekforward"
  | "seekto"
  | "previoustrack"
  | "nexttrack"
  | "skipad";

type MediaSessionActionDetails = {
  action: MediaSessionAction;
  seekTime?: number;
  seekOffset?: number;
  fastSeek?: boolean;
};

export default updateMediaSession;
