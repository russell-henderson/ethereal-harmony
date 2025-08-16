// src/lib/audio/PlaybackController.ts
/**
 * PlaybackController (Phase 2)
 * -----------------------------------------------------------------------------
 * High-level transport + queue orchestration layer for Ethereal Harmony.
 *
 * Goals
 * - Provide a small, framework-agnostic API to control playback and manage a queue.
 * - Glue `AudioEngine` to UI (stores, hotkeys) without leaking Web Audio details.
 * - Forward engine events + raise queue/track lifecycle events for subscribers.
 * - Optionally reflect Media Session metadata/actions (dynamic import).
 *
 * Design
 * - Pure TypeScript module, safe to import anywhere (no React).
 * - Minimal state: queue (Track[]), index, repeat/shuffle/autoplay flags.
 * - Defensive around async media operations; never throw on user actions.
 *
 * Integrations
 * - GlobalHotkeys should invoke the public controller methods (play/pause/prev/next/seek).
 * - UI components subscribe via `on('trackchange'|'queuechange'|...)` for updates.
 * - Settings or diagnostics can read engine time/duration via getters.
 */

import audioEngine, { AudioEngine } from "./AudioEngine";
import {
  Track,
  loadTrackFromFile,
  loadTrackFromUrl,
  revokeTrackResources,
} from "./TrackLoader";

/* =============================================================================
 * Types
 * ========================================================================== */

/** Events emitted by the controller. */
type PlaybackEventMap = {
  /** Fired when a new track is loaded into the engine (or cleared). */
  trackchange: { track: Track | null; index: number; queueLength: number };

  /** Queue was replaced/reordered/modified. */
  queuechange: { queueLength: number };

  /** Forwarded events from AudioEngine. */
  play: void;
  pause: void;
  ended: void;
  error: { error?: unknown };
  timeupdate: { currentTime: number };
  durationchange: { duration: number };
  ratechange: { rate: number };
  volumechange: { volume: number; muted: boolean };
  loadedmetadata: { duration: number };
};

type Listener<T> = (ev: T) => void;

export type RepeatMode = "off" | "one" | "all";

/* =============================================================================
 * Tiny Emitter (no deps)
 * ========================================================================== */

class Emitter<M extends Record<string, any>> {
  private map = new Map<keyof M, Set<Listener<any>>>();
  on<K extends keyof M>(type: K, fn: Listener<M[K]>) {
    if (!this.map.has(type)) this.map.set(type, new Set());
    this.map.get(type)!.add(fn as any);
    return () => this.off(type, fn);
  }
  off<K extends keyof M>(type: K, fn: Listener<M[K]>) {
    this.map.get(type)?.delete(fn as any);
  }
  emit<K extends keyof M>(type: K, payload: M[K]) {
    const set = this.map.get(type);
    if (!set || set.size === 0) return;
    for (const fn of set) (fn as Listener<M[K]>)(payload);
  }
}

/* =============================================================================
 * Helpers
 * ========================================================================== */

const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n);

/** Fisher–Yates in-place shuffle (returns new array). */
function shuffled<T>(arr: T[]): T[] {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/* =============================================================================
 * PlaybackController
 * ========================================================================== */

export class PlaybackController {
  private engine: AudioEngine;
  private events = new Emitter<PlaybackEventMap>();

  // Queue state
  private queue: Track[] = [];
  private index = -1; // -1 => empty queue

  // Behavior flags
  private autoplayNext = true;
  private repeat: RepeatMode = "off";
  private shuffle = false;

  // When shuffle is enabled we keep a derived play order to navigate deterministically.
  private playOrder: number[] = []; // array of queue indices in play order
  private orderPos = -1; // position within playOrder that corresponds to `index`

  constructor(engine: AudioEngine = audioEngine) {
    this.engine = engine;

    // Bridge engine events forward; apply controller behavior when ended.
    this.engine.on("play", () => this.events.emit("play", undefined));
    this.engine.on("pause", () => this.events.emit("pause", undefined));
    this.engine.on("ended", () => {
      this.events.emit("ended", undefined);
      void this.handleNaturalEnd();
    });
    this.engine.on("error", (e) => this.events.emit("error", e));
    this.engine.on("timeupdate", (e) => this.events.emit("timeupdate", e));
    this.engine.on("durationchange", (e) => this.events.emit("durationchange", e));
    this.engine.on("ratechange", (e) => this.events.emit("ratechange", e));
    this.engine.on("volumechange", (e) => this.events.emit("volumechange", e));
    this.engine.on("loadedmetadata", (e) => this.events.emit("loadedmetadata", e));
  }

  /* ----------------------------------------------------------------------------
   * Subscription API
   * -------------------------------------------------------------------------- */

  on<K extends keyof PlaybackEventMap>(type: K, fn: Listener<PlaybackEventMap[K]>) {
    return this.events.on(type, fn);
  }

  /* ----------------------------------------------------------------------------
   * Queue management
   * -------------------------------------------------------------------------- */

  /**
   * Replace the whole queue and optionally select the starting item.
   * Frees blob/object URLs of the old queue to avoid leaks.
   */
  setQueue(tracks: Track[], startIndex = 0) {
    // Cleanup previous queue resources
    this.queue.forEach((t) => revokeTrackResources(t));

    this.queue = tracks.slice();
    this.index = Math.min(Math.max(0, startIndex), this.queue.length - 1);

    // Rebuild play order
    this.rebuildPlayOrder();
    this.events.emit("queuechange", { queueLength: this.queue.length });

    return this.loadCurrent(true);
  }

  /** Append or insert a track. */
  addToQueue(track: Track, atEnd = true) {
    if (atEnd) this.queue.push(track);
    else this.queue.splice(Math.max(0, this.index), 0, track);

    this.rebuildPlayOrder(); // track indices changed
    this.events.emit("queuechange", { queueLength: this.queue.length });
  }

  /** Remove a track by index (with resource cleanup). */
  removeFromQueue(removeIndex: number) {
    if (removeIndex < 0 || removeIndex >= this.queue.length) return;
    const [removed] = this.queue.splice(removeIndex, 1);
    revokeTrackResources(removed);

    // Adjust current index & order position
    if (this.queue.length === 0) {
      this.index = -1;
      this.orderPos = -1;
      this.playOrder = [];
      this.events.emit("queuechange", { queueLength: 0 });
      this.emitTrackchange();
      return;
    }

    if (removeIndex < this.index) this.index -= 1;
    if (this.index >= this.queue.length) this.index = this.queue.length - 1;

    this.rebuildPlayOrder();
    this.events.emit("queuechange", { queueLength: this.queue.length });
    this.emitTrackchange();
  }

  /** Clear queue entirely. */
  clearQueue() {
    this.queue.forEach((t) => revokeTrackResources(t));
    this.queue = [];
    this.index = -1;
    this.playOrder = [];
    this.orderPos = -1;

    this.events.emit("queuechange", { queueLength: 0 });
    this.emitTrackchange();
  }

  /** Reorder a track from one position to another. */
  moveInQueue(from: number, to: number) {
    if (from === to) return;
    const len = this.queue.length;
    if (from < 0 || from >= len || to < 0 || to >= len) return;

    const [item] = this.queue.splice(from, 1);
    this.queue.splice(to, 0, item);

    // Update index depending on movement
    if (this.index === from) this.index = to;
    else if (from < this.index && to >= this.index) this.index -= 1;
    else if (from > this.index && to <= this.index) this.index += 1;

    this.rebuildPlayOrder();
    this.events.emit("queuechange", { queueLength: this.queue.length });
    this.emitTrackchange();
  }

  /** Return a copy of the queue. */
  getQueue() {
    return this.queue.slice();
  }

  get currentIndex() {
    return this.index;
  }

  getCurrentTrack(): Track | null {
    if (this.index < 0 || this.index >= this.queue.length) return null;
    return this.queue[this.index] || null;
  }

  hasNext() {
    if (this.queue.length === 0) return false;
    if (this.repeat === "one") return true; // will repeat same index
    if (this.shuffle) {
      return this.orderPos >= 0 && this.orderPos < this.playOrder.length - 1;
    }
    return this.index < this.queue.length - 1;
  }

  hasPrev() {
    if (this.queue.length === 0) return false;
    if (this.repeat === "one") return true;
    if (this.shuffle) {
      return this.orderPos > 0;
    }
    return this.index > 0;
  }

  /* ----------------------------------------------------------------------------
   * Navigation
   * -------------------------------------------------------------------------- */

  async nextTrack(autoplay = true) {
    if (this.queue.length === 0) return;

    if (this.repeat === "one") {
      // Same index
      await this.loadCurrent(autoplay);
      return;
    }

    if (this.shuffle) {
      if (this.orderPos < this.playOrder.length - 1) {
        this.orderPos += 1;
        this.index = this.playOrder[this.orderPos];
        await this.loadCurrent(autoplay);
      } else if (this.repeat === "all") {
        // Regenerate play order to avoid repeating the same sequence back-to-back
        this.rebuildPlayOrder(/* keepIndex */ true);
        this.orderPos = 0;
        this.index = this.playOrder[this.orderPos];
        await this.loadCurrent(autoplay);
      }
      return;
    }

    // Linear
    if (this.index < this.queue.length - 1) {
      this.index += 1;
      await this.loadCurrent(autoplay);
    } else if (this.repeat === "all") {
      this.index = 0;
      await this.loadCurrent(autoplay);
    }
  }

  async prevTrack(autoplay = true) {
    if (this.queue.length === 0) return;

    // If near the start of current track, restart it; else go to previous.
    if (this.engine.currentTime > 2) {
      this.seek(0);
      if (autoplay && !this.engine.isPlaying) await this.play();
      return;
    }

    if (this.repeat === "one") {
      await this.loadCurrent(autoplay);
      return;
    }

    if (this.shuffle) {
      if (this.orderPos > 0) {
        this.orderPos -= 1;
        this.index = this.playOrder[this.orderPos];
        await this.loadCurrent(autoplay);
      } else if (this.repeat === "all") {
        this.orderPos = this.playOrder.length - 1;
        this.index = this.playOrder[this.orderPos];
        await this.loadCurrent(autoplay);
      }
      return;
    }

    // Linear
    if (this.index > 0) {
      this.index -= 1;
      await this.loadCurrent(autoplay);
    } else if (this.repeat === "all") {
      this.index = this.queue.length - 1;
      await this.loadCurrent(autoplay);
    }
  }

  /** Jump to an arbitrary index in the queue. */
  async jumpTo(index: number, autoplay = true) {
    if (index < 0 || index >= this.queue.length) return;
    this.index = index;

    // Keep playOrder/orderPos consistent with the selected index.
    if (this.shuffle) {
      const pos = this.playOrder.indexOf(index);
      if (pos >= 0) this.orderPos = pos;
    } else {
      this.orderPos = this.index;
    }

    await this.loadCurrent(autoplay);
  }

  /* ----------------------------------------------------------------------------
   * Core loading
   * -------------------------------------------------------------------------- */

  private async loadCurrent(autoplay = true) {
    const track = this.getCurrentTrack();
    if (!track) {
      this.emitTrackchange();
      return;
    }

    try {
      await this.engine.load(track.url);
    } catch (err) {
      // Forward error and try to continue to next if autoplayNext is enabled
      this.events.emit("error", { error: err });
      if (this.autoplayNext) {
        await this.nextTrack(true);
        return;
      }
    }

    this.emitTrackchange();

    // Media Session (optional)
    this.updateMediaSession(track).catch(() => {});

    if (autoplay) {
      try {
        await this.engine.play();
      } catch {
        // Autoplay might be blocked; swallow
      }
    }
  }

  private emitTrackchange() {
    this.events.emit("trackchange", {
      track: this.getCurrentTrack(),
      index: this.index,
      queueLength: this.queue.length,
    });
  }

  /* ----------------------------------------------------------------------------
   * File/URL helpers
   * -------------------------------------------------------------------------- */

  /** Create a Track from a local File and replace the queue with it. */
  async loadFromFile(file: File, autoplay = true) {
    const track = await loadTrackFromFile(file);
    await this.setQueue([track], 0);
    if (!autoplay) await this.pause();
  }

  /** Create a Track from a URL and replace the queue with it. */
  async loadFromUrl(url: string, autoplay = true) {
    const track = await loadTrackFromUrl(url);
    await this.setQueue([track], 0);
    if (!autoplay) await this.pause();
  }

  /** Replace the current track with a new one (keeps position in queue). */
  async replaceCurrent(track: Track, autoplay = true) {
    if (this.index < 0) {
      this.queue = [track];
      this.index = 0;
      this.rebuildPlayOrder();
    } else {
      revokeTrackResources(this.queue[this.index]);
      this.queue[this.index] = track;
    }
    this.events.emit("queuechange", { queueLength: this.queue.length });
    await this.loadCurrent(autoplay);
  }

  /* ----------------------------------------------------------------------------
   * Transport passthrough
   * -------------------------------------------------------------------------- */

  play() {
    return this.engine.play();
  }
  pause() {
    return this.engine.pause();
  }
  toggle() {
    return this.engine.toggle();
  }

  /** Seek to an absolute time (seconds). */
  seek(seconds: number) {
    this.engine.seek(seconds);
  }

  /** Seek relative by delta seconds (negative for backwards). */
  seekBy(deltaSec: number) {
    const next = clamp01((this.engine.currentTime + deltaSec) / Math.max(this.engine.duration || 1, 1));
    this.engine.seek(next * (this.engine.duration || 0));
  }

  setRate(rate: number) {
    this.engine.setRate(rate);
  }
  setVolume(vol: number) {
    this.engine.setVolume(vol);
  }
  setMuted(m: boolean) {
    this.engine.setMuted(m);
  }

  get currentTime() {
    return this.engine.currentTime;
  }
  get duration() {
    return this.engine.duration;
  }
  get isPlaying() {
    return this.engine.isPlaying;
  }

  /** Progress in [0..1], guarded for NaN/Infinity. */
  get progress(): number {
    const d = this.duration || 0;
    if (d <= 0) return 0;
    const p = this.currentTime / d;
    return p < 0 ? 0 : p > 1 ? 1 : p;
  }

  /* ----------------------------------------------------------------------------
   * Devices / Analyser
   * -------------------------------------------------------------------------- */

  /** Best-effort output device switch via sinkId (Chromium/secure origin). */
  setOutputDevice(deviceId: string) {
    return this.engine.setOutputDevice(deviceId);
  }

  /** Expose analyser for visualizers/meters (AnalyserBus consumer). */
  getAnalyser() {
    return this.engine.getAnalyser();
  }

  /* ----------------------------------------------------------------------------
   * Behavior flags
   * -------------------------------------------------------------------------- */

  setAutoplayNext(enabled: boolean) {
    this.autoplayNext = !!enabled;
  }

  setRepeatMode(mode: RepeatMode) {
    this.repeat = mode === "one" || mode === "all" ? mode : "off";
  }

  setShuffle(enabled: boolean) {
    const next = !!enabled;
    if (next === this.shuffle) return;
    this.shuffle = next;
    this.rebuildPlayOrder(/* keepIndex */ true);
  }

  getRepeatMode(): RepeatMode {
    return this.repeat;
  }
  getShuffle(): boolean {
    return this.shuffle;
  }
  getAutoplayNext(): boolean {
    return this.autoplayNext;
  }

  /* ----------------------------------------------------------------------------
   * Media Session (optional)
   * -------------------------------------------------------------------------- */

  private async updateMediaSession(track: Track | null) {
    // Optional/soft dependency; avoid hard import for Phase 2
    try {
      const mod = await import("@/lib/utils/MediaSession").catch(() => null);
      if (!mod) return;

      const update =
        (mod as any).updateMediaSession ||
        (mod as any).default ||
        null;

      if (typeof update === "function") {
        update({
          title: track?.title ?? "Unknown title",
          artist: track?.artist ?? "",
          album: track?.album ?? "",
          artwork: track?.artworkUrl ? [{ src: track.artworkUrl, sizes: "512x512", type: "image/png" }] : [],
          actions: {
            play: () => this.play(),
            pause: () => this.pause(),
            nexttrack: () => this.nextTrack(true),
            previoustrack: () => this.prevTrack(true),
            seekto: (pos: number) => this.seek(pos),
            seekforward: (delta = 10) => this.seekBy(delta),
            seekbackward: (delta = 10) => this.seekBy(-delta),
          },
        });
      }
    } catch {
      // ignore
    }
  }

  /* ----------------------------------------------------------------------------
   * Natural end handling
   * -------------------------------------------------------------------------- */

  private async handleNaturalEnd() {
    if (!this.autoplayNext) return;

    // Repeat one → restart same track
    if (this.repeat === "one") {
      await this.seek(0);
      try {
        await this.play();
      } catch {}
      return;
    }

    // Advance to next based on shuffle/repeat rules
    if (this.hasNext()) {
      await this.nextTrack(true);
      return;
    }

    // At end of queue
    if (this.repeat === "all" && this.queue.length > 0) {
      if (this.shuffle) {
        this.rebuildPlayOrder(/* keepIndex */ false);
        this.orderPos = 0;
        this.index = this.playOrder[this.orderPos];
      } else {
        this.index = 0;
      }
      await this.loadCurrent(true);
    }
  }

  /* ----------------------------------------------------------------------------
   * Play order (shuffle support)
   * -------------------------------------------------------------------------- */

  /**
   * Build or rebuild the `playOrder` array according to shuffle setting.
   * - When shuffle is ON, we generate a shuffled list of queue indices.
   * - When shuffle is OFF, playOrder is linear [0..n-1].
   * - `keepIndex` keeps the current `index` and aligns `orderPos` to it.
   */
  private rebuildPlayOrder(keepIndex = true) {
    const n = this.queue.length;
    if (n === 0) {
      this.playOrder = [];
      this.orderPos = -1;
      return;
    }

    if (this.shuffle) {
      const indices = Array.from({ length: n }, (_, i) => i);
      const order = shuffled(indices);

      // Ensure current index appears at the current order position if we are keeping it.
      if (keepIndex && this.index >= 0) {
        const pos = order.indexOf(this.index);
        if (pos > 0) {
          // Swap so that current index is at position `orderPos` (or compute new orderPos)
          this.playOrder = order;
          this.orderPos = pos;
          return;
        }
      }

      this.playOrder = order;
      this.orderPos = Math.max(0, this.playOrder.indexOf(this.index));
    } else {
      this.playOrder = Array.from({ length: n }, (_, i) => i);
      this.orderPos = Math.min(Math.max(0, this.index), n - 1);
    }
  }

  /* ----------------------------------------------------------------------------
   * Cleanup
   * -------------------------------------------------------------------------- */

  async destroy() {
    this.clearQueue();
    await this.engine.destroy();
  }
}

/* =============================================================================
 * Singleton export (app-wide controller)
 * ========================================================================== */

export const playbackController = new PlaybackController();
export default playbackController;
