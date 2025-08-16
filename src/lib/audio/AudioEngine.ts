// src/lib/audio/AudioEngine.ts
/**
 * AudioEngine (Phase 2)
 * -----------------------------------------------------------------------------
 * Ownership:
 * - A single <audio> element (not necessarily in the DOM)
 * - A lazily-initialized AudioContext (to satisfy autoplay policies)
 *
 * Processing graph (stable, minimal latency):
 *   MediaElementSource -> [EQ?] -> [Limiter?] -> Gain (master) -> Destination
 *                                         \--> Analyser (post-fader tap)
 *
 * Responsibilities:
 * - Load and play local files and HTTPS URLs (with optional HLS handling)
 * - Provide transport controls: play/pause/toggle/seek/rate
 * - Provide volume/mute and (best-effort) output device switching (sinkId)
 * - Expose an AnalyserNode for visualizers/meters (AnalyserBus consumer)
 * - Offer optional EQ and Limiter integration (dynamic import, no hard dep)
 * - Emit lightweight events for stores/components to react to
 * - Be safe to import from anywhere (no React), with minimal side-effects
 *
 * Performance & UX:
 * - Lazy node creation (context, nodes) on first use
 * - Visibility-aware AudioContext power saving:
 *      • If tab becomes hidden and audio is NOT playing: suspend ctx
 *      • If tab becomes visible again: resume ctx
 *   (We do NOT auto-suspend while playing to avoid audible glitches.)
 *
 * Accessibility & Platform quirks:
 * - iOS/Safari user-gesture requirement: `play()` attempts to resume ctx first
 * - CrossOrigin='anonymous' is set to allow analyser and CORS-friendly streams
 *
 * Non-goals:
 * - This module intentionally does not manage queueing or Media Session metadata.
 *   That belongs in PlaybackController/MediaSession utility per the build plan.
 */

type Listener = (ev?: any) => void;

type EventMap = {
  play: void;
  pause: void;
  ended: void;
  error: { error?: unknown };
  timeupdate: { currentTime: number };
  durationchange: { duration: number };
  ratechange: { rate: number };
  volumechange: { volume: number; muted: boolean };
  loadedmetadata: { duration: number };
  loaded: { url: string };
  contextstate: { state: AudioContextState };
};

type OptionalEqGraph = {
  readonly bands: { freq: number; gain: number }[];
  setGain: (index: number, gain: number) => void;
  setBypassed: (b: boolean) => void;
  /** Output node of the EQ graph. Input is connected to it by AudioEngine. */
  node: AudioNode;
};

type OptionalLimiter = {
  node: AudioNode;
  setCeiling?: (db: number) => void;
};

type OptionalHlsController = {
  attach: (audio: HTMLMediaElement, url: string) => Promise<void> | void;
  destroy: () => void;
};

const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n);
const isHlsUrl = (u: string) => /\.m3u8(\?.*)?$/i.test(u);

/** Tiny event emitter (no deps). */
class Emitter<T extends Record<string, any>> {
  private map = new Map<keyof T, Set<Listener>>();
  on<K extends keyof T>(type: K, fn: (arg: T[K]) => void) {
    if (!this.map.has(type)) this.map.set(type, new Set());
    const set = this.map.get(type)!;
    set.add(fn as Listener);
    return () => set.delete(fn as Listener);
  }
  emit<K extends keyof T>(type: K, payload: T[K]) {
    const set = this.map.get(type);
    if (!set || set.size === 0) return;
    for (const fn of set) fn(payload);
  }
}

/**
 * AudioEngine
 * Singleton, framework-agnostic.
 */
export class AudioEngine {
  // ---- Singleton ------------------------------------------------------------
  private static _instance: AudioEngine | null = null;
  static get instance(): AudioEngine {
    if (!AudioEngine._instance) AudioEngine._instance = new AudioEngine();
    return AudioEngine._instance;
  }

  // ---- DOM/Media/AudioContext ----------------------------------------------
  private readonly audio: HTMLAudioElement;
  private ctx: AudioContext | null = null;
  private source: MediaElementAudioSourceNode | null = null;

  // ---- Nodes (lazy) ---------------------------------------------------------
  private gain: GainNode | null = null; // master volume (post limiter)
  private limiter: OptionalLimiter | null = null; // optional dynamics
  private limiterEnabled = true;
  private eq: OptionalEqGraph | null = null; // optional EQ
  private analyser: AnalyserNode | null = null;

  // ---- Playback / Device state ---------------------------------------------
  private _volume = 1;
  private _muted = false;
  private _rate = 1;
  private currentUrl: string | null = null;

  // ---- Optional integrations ------------------------------------------------
  private hls: OptionalHlsController | null = null; // only when using .m3u8

  // ---- Lifecycle helpers ----------------------------------------------------
  private visibilityHandlersAttached = false;
  private suspendedByVisibility = false;

  // ---- Emitter --------------------------------------------------------------
  private readonly events = new Emitter<EventMap>();

  // ---- Construction ---------------------------------------------------------
  private constructor() {
    // NOTE: we create the <audio> element immediately, but DO NOT create
    // the AudioContext until it's needed to satisfy autoplay policies.
    this.audio = document.createElement("audio");
    this.audio.preload = "metadata";
    this.audio.crossOrigin = "anonymous";
    this.audio.playsInline = true; // iOS

    // Proxy DOM media events to our emitter
    this.audio.addEventListener("play", () => this.events.emit("play", undefined));
    this.audio.addEventListener("pause", () => this.events.emit("pause", undefined));
    this.audio.addEventListener("ended", () => this.events.emit("ended", undefined));
    this.audio.addEventListener("error", () =>
      this.events.emit("error", { error: this.audio.error ?? new Error("Media error") })
    );
    this.audio.addEventListener("timeupdate", () =>
      this.events.emit("timeupdate", { currentTime: this.audio.currentTime || 0 })
    );
    this.audio.addEventListener("durationchange", () =>
      this.events.emit("durationchange", { duration: this.duration })
    );
    this.audio.addEventListener("loadedmetadata", () =>
      this.events.emit("loadedmetadata", { duration: this.duration })
    );
    this.audio.addEventListener("ratechange", () =>
      this.events.emit("ratechange", { rate: this.audio.playbackRate || 1 })
    );
    this.audio.addEventListener("volumechange", () =>
      this.events.emit("volumechange", { volume: this.audio.volume, muted: this.audio.muted })
    );
  }

  // ---- Public subscription API ---------------------------------------------
  on<K extends keyof EventMap>(type: K, fn: (ev: EventMap[K]) => void) {
    return this.events.on(type, fn);
  }

  // ---- Element accessors ----------------------------------------------------
  /** Returns the internal <audio> element (you may append it to the DOM). */
  get media(): HTMLAudioElement {
    return this.audio;
  }

  // ---- Core state accessors -------------------------------------------------
  get isPlaying() {
    return !this.audio.paused && !this.audio.ended;
  }
  get currentTime() {
    return this.audio.currentTime || 0;
  }
  get duration() {
    return Number.isFinite(this.audio.duration) ? this.audio.duration : 0;
  }
  get volume() {
    return this._volume;
  }
  get muted() {
    return this._muted;
  }
  get playbackRate() {
    return this._rate;
  }
  /** Exposes the AudioContext (created on demand). */
  get context(): AudioContext {
    if (!this.ctx) this.ensureContext();
    return this.ctx!;
  }

  // ---- Lazy context creation / graph wiring --------------------------------
  private ensureContext() {
    if (this.ctx) return this.ctx;

    const Ctor: typeof AudioContext = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!Ctor) throw new Error("Web Audio API not supported in this browser.");

    const ctx = new Ctor();
    this.ctx = ctx;

    // Master gain
    const gain = ctx.createGain();
    gain.gain.value = this._muted ? 0 : this._volume;
    this.gain = gain;

    // Limiter (gentle safety net)
    this.limiter = this.createLimiter(ctx);
    this.limiterEnabled = true;

    // Analyser (post-fader for consistent metering)
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0.8;
    this.analyser = analyser;

    // Build tail of chain now (head will be connected when we create source)
    this.connectChain(null, analyser, this.limiterEnabled ? this.limiter?.node ?? null : null, gain, ctx.destination);

    // Visibility-aware power saving (attach once)
    this.attachVisibilityHandlers();

    // Bubble context state to consumers (useful for diagnostics overlay)
    ctx.onstatechange = () => this.events.emit("contextstate", { state: ctx.state });

    return ctx;
  }

  private connectChain(
    head: AudioNode | null,
    analyser: AudioNode | null,
    limiter: AudioNode | null,
    gain: AudioNode,
    destination: AudioNode
  ) {
    // Defensive disconnects (ignore failures)
    try {
      gain.disconnect();
    } catch {}
    try {
      limiter?.disconnect();
    } catch {}
    try {
      analyser?.disconnect();
    } catch {}

    // NOTE: We construct a linear path head -> [EQ?] -> [Limiter?] -> Gain -> Destination
    // and also tap Analyser from the Gain (post-fader).
    let last: AudioNode | null = head;

    const eqNode = this.eq?.node ?? null;

    const link = (from: AudioNode | null, to: AudioNode) => {
      if (from) from.connect(to);
      last = to;
    };

    if (last && eqNode) {
      link(last, eqNode);
      last = eqNode;
    }

    if (last && limiter) {
      link(last, limiter);
      last = limiter;
    }

    if (last) {
      link(last, gain);
    }

    // Gain -> Destination
    gain.connect(destination);

    // Gain -> Analyser (parallel)
    if (analyser) {
      gain.connect(analyser);
    }
  }

  private createSource() {
    if (!this.ctx) this.ensureContext();
    if (!this.ctx || this.source) return;

    this.source = this.ctx.createMediaElementSource(this.audio);
    // Rebuild the chain using new head
    this.connectChain(
      this.source,
      this.analyser!,
      this.limiterEnabled ? this.limiter?.node ?? null : null,
      this.gain!,
      this.ctx.destination
    );
  }

  private createLimiter(ctx: AudioContext): OptionalLimiter {
    // DynamicsCompressor configured as a transparent limiter-ish safety
    const node = ctx.createDynamicsCompressor();
    node.threshold.value = -1.0; // close to 0 dBFS
    node.knee.value = 30.0;
    node.ratio.value = 12.0;
    node.attack.value = 0.003;
    node.release.value = 0.250;
    return { node, setCeiling: (db: number) => (node.threshold.value = db) };
  }

  private async ensureEq(): Promise<void> {
    if (this.eq || !this.ctx) return;
    try {
      // Dynamic import keeps core slim if EQ isn’t needed/ready yet.
      const mod = (await import("./EQGraph").catch(() => null)) as any;
      if (mod && typeof mod.createEqGraph === "function") {
        this.eq = mod.createEqGraph(this.ctx);
        // Rewire chain to include EQ before limiter
        this.connectChain(
          this.source,
          this.analyser!,
          this.limiterEnabled ? this.limiter?.node ?? null : null,
          this.gain!,
          this.ctx.destination
        );
      }
    } catch {
      // EQ is optional; ignore failures
    }
  }

  // ---- Visibility-aware suspend/resume -------------------------------------
  private attachVisibilityHandlers() {
    if (this.visibilityHandlersAttached) return;
    this.visibilityHandlersAttached = true;

    const onVis = async () => {
      if (!this.ctx) return;
      if (document.hidden) {
        // Only suspend if NOT actively playing (saves power while idle)
        if (!this.isPlaying && this.ctx.state === "running") {
          try {
            await this.ctx.suspend();
            this.suspendedByVisibility = true;
            this.events.emit("contextstate", { state: this.ctx.state });
          } catch {}
        }
      } else {
        // Resume if we suspended due to visibility (or if someone wants analyser back)
        if (this.suspendedByVisibility && this.ctx.state === "suspended") {
          try {
            await this.ctx.resume();
            this.suspendedByVisibility = false;
            this.events.emit("contextstate", { state: this.ctx.state });
          } catch {}
        }
      }
    };

    document.addEventListener("visibilitychange", onVis);
  }

  // ---- Public controls ------------------------------------------------------
  /**
   * Load a URL (file or stream). If it's HLS (.m3u8), we try HlsController first
   * and fall back to native playback if supported by the browser.
   */
  async load(url: string): Promise<void> {
    const normalized = String(url || "").trim();
    if (!normalized) throw new Error("AudioEngine.load: invalid URL");
    this.currentUrl = normalized;

    // Destroy previous HLS session, if any
    if (this.hls) {
      try {
        this.hls.destroy();
      } catch {}
      this.hls = null;
    }

    // Ensure context & nodes are ready; create source node once
    this.ensureContext();
    this.createSource();

    if (isHlsUrl(normalized)) {
      // Try custom HLS controller (Chromium), fallback to native (Safari)
      try {
        const mod = (await import("@/lib/streaming/HlsController").catch(() => null)) as any;
        if (mod) {
          const hls: OptionalHlsController =
            typeof mod.default === "function" ? new mod.default() : (mod as OptionalHlsController);
          await Promise.resolve(hls.attach(this.audio, normalized));
          this.hls = hls;
        } else {
          // No controller available; attempt native (some browsers support HLS natively)
          this.audio.src = normalized;
        }
      } catch {
        this.audio.src = normalized;
      }
    } else {
      // Direct URL or blob
      this.audio.src = normalized;
    }

    this.events.emit("loaded", { url: normalized });
  }

  /**
   * Load a local File/Blob object (generates an object URL).
   * Callers are responsible for revoking the URL if they persist it externally.
   */
  async loadFile(file: File | Blob, fileName = "local"): Promise<void> {
    const url = URL.createObjectURL(file);
    await this.load(url);
    // Keep currentUrl marked as blob to help callers differentiate if needed
    this.currentUrl = `blob:${fileName}`;
  }

  /**
   * Resume the AudioContext if it exists and is suspended.
   * Useful to pre-unlock on a known user gesture (e.g., first click).
   */
  async resumeIfNeeded(): Promise<void> {
    if (!this.ctx) return;
    if (this.ctx.state === "suspended") {
      try {
        await this.ctx.resume();
        this.events.emit("contextstate", { state: this.ctx.state });
      } catch {}
    }
  }

  async play(): Promise<void> {
    // iOS/Safari unlock dance
    if (!this.ctx) this.ensureContext();
    if (this.ctx?.state === "suspended") {
      try {
        await this.ctx.resume();
        this.events.emit("contextstate", { state: this.ctx.state });
      } catch {}
    }
    this.createSource();
    await this.audio.play();
  }

  async pause(): Promise<void> {
    this.audio.pause();
  }

  async toggle(): Promise<void> {
    return this.isPlaying ? this.pause() : this.play();
  }

  seek(positionSec: number) {
    const d = this.duration || 0;
    if (d <= 0) return;
    this.audio.currentTime = Math.min(Math.max(0, positionSec), d);
  }

  setVolume(v: number) {
    const vol = clamp01(v);
    this._volume = vol;
    // Keep element volume in sync for HW keys & system UI
    this.audio.volume = vol;
    if (this.gain) this.gain.gain.value = this._muted ? 0 : vol;
    this.events.emit("volumechange", { volume: this.audio.volume, muted: this._muted });
  }

  setMuted(m: boolean) {
    this._muted = !!m;
    this.audio.muted = this._muted;
    if (this.gain) this.gain.gain.value = this._muted ? 0 : this._volume;
    this.events.emit("volumechange", { volume: this.audio.volume, muted: this._muted });
  }

  setRate(rate: number) {
    const r = Math.max(0.25, Math.min(4.0, rate || 1));
    this._rate = r;
    this.audio.playbackRate = r;
    this.events.emit("ratechange", { rate: r });
  }

  /**
   * Attempt to switch output device via sinkId (Chrome/Edge on secure origin).
   * No-op if unsupported.
   */
  async setOutputDevice(deviceId: string): Promise<void> {
    const el = this.audio as any;
    if (typeof el.setSinkId === "function") {
      try {
        await el.setSinkId(deviceId);
      } catch (err) {
        // Non-fatal; surface to console for diagnostics
        console.warn("[AudioEngine] setSinkId failed:", err);
      }
    }
  }

  // ---- Analyser access ------------------------------------------------------
  /** Returns the analyser node; creates the audio context on demand. */
  getAnalyser(): AnalyserNode {
    if (!this.ctx) this.ensureContext();
    return this.analyser!;
  }

  /** Convenience: fill frequency-domain data (0-255). */
  getFrequencyData(out: Uint8Array) {
    if (!this.analyser) this.getAnalyser();
    this.analyser!.getByteFrequencyData(out);
  }

  /** Convenience: fill time-domain (waveform) data (0-255). */
  getTimeDomainData(out: Uint8Array) {
    if (!this.analyser) this.getAnalyser();
    this.analyser!.getByteTimeDomainData(out);
  }

  // ---- EQ API (optional; no-ops if module not present) ---------------------
  async setEqGain(index: number, gainDb: number) {
    if (!this.ctx) this.ensureContext();
    if (!this.eq) await this.ensureEq();
    this.eq?.setGain(index, gainDb);
  }
  async setEqBypassed(b: boolean) {
    if (!this.ctx) this.ensureContext();
    if (!this.eq) await this.ensureEq();
    this.eq?.setBypassed(b);
  }
  getEqBands(): { freq: number; gain: number }[] {
    return this.eq?.bands ?? [];
  }

  // ---- Limiter control (optional enable/disable) ---------------------------
  setLimiterEnabled(enabled: boolean) {
    this.limiterEnabled = !!enabled;
    if (!this.ctx || !this.gain) return;
    // Rewire the chain with or without limiter
    this.connectChain(
      this.source,
      this.analyser!,
      this.limiterEnabled ? this.limiter?.node ?? null : null,
      this.gain,
      this.ctx.destination
    );
  }

  setLimiterCeiling(db: number) {
    this.limiter?.setCeiling?.(db);
  }

  // ---- Cleanup --------------------------------------------------------------
  async destroy() {
    // Stop playback & release media src
    try {
      this.audio.pause();
      this.audio.removeAttribute("src");
      this.audio.load();
    } catch {}

    // Tear down HLS if used
    try {
      this.hls?.destroy();
    } catch {}
    this.hls = null;

    // Disconnect head of the graph
    try {
      this.source?.disconnect();
    } catch {}
    this.source = null;

    // Close context (frees the hardware device)
    if (this.ctx) {
      try {
        this.ctx.onstatechange = null;
        await this.ctx.close();
        this.events.emit("contextstate", { state: "closed" as AudioContextState });
      } catch {}
      this.ctx = null;
    }

    // NOTE: We intentionally keep the <audio> element instance around. If you
    // really need to dispose it, do it at the app boundary after calling destroy().
  }
}

// Singleton export for convenience
export const audioEngine = AudioEngine.instance;
export default audioEngine;
