// src/lib/streaming/HlsController.ts
/**
 * HlsController (Phase 2)
 * -----------------------------------------------------------------------------
 * A tiny wrapper that:
 *  - Uses native HLS when the browser can play "application/vnd.apple.mpegurl"
 *  - Otherwise lazily dynamic-imports `hls.js` (if present), attaches it,
 *    and loads the source
 *
 * CONTRACT with AudioEngine:
 *  - default export is a constructible class
 *  - methods:
 *      async attach(audio: HTMLMediaElement, url: string): Promise<void>
 *      destroy(): void
 *
 * AudioEngine integration reference (already implemented):
 *   const mod = await import("@/lib/streaming/HlsController").catch(() => null);
 *   const hls = typeof mod.default === "function" ? new mod.default() : mod;
 *   await hls.attach(this.audio, url);
 *   this.hls = hls; // later: this.hls?.destroy();
 *
 * Notes:
 * - This file uses dynamic import for `hls.js` only when needed. You can mark
 *   `hls.js` as an optional dependency; the native path still works without it.
 * - SSR-safe: All DOM usage is guarded; only run in the browser.
 */

type HlsCtor = new (config?: Record<string, any>) => {
  destroy(): void;
  attachMedia(media: HTMLMediaElement): void;
  loadSource(url: string): void;
  on(evt: any, cb: (...args: any[]) => void): void;
  off(evt: any, cb: (...args: any[]) => void): void;
};
type HlsNamespace = {
  default?: HlsCtor;
  isSupported?: () => boolean;
  Events?: Record<string, any>;
};

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof document !== "undefined";
}

function supportsNativeHls(media: HTMLMediaElement): boolean {
  if (!media || typeof media.canPlayType !== "function") return false;
  // Common MIME for HLS playlists
  const mime = 'application/vnd.apple.mpegurl';
  return !!media.canPlayType(mime);
}

export default class HlsController {
  /** hls.js instance when used; otherwise null for native path. */
  private hls: InstanceType<HlsCtor> | null = null;
  private audio: HTMLMediaElement | null = null;
  private url: string | null = null;

  /** Track bound handlers so we can detach cleanly if we attach events. */
  private readonly _bound = {
    onError: (..._args: any[]) => {},
    onMediaAttached: (..._args: any[]) => {},
    onManifestParsed: (..._args: any[]) => {},
  };

  /**
   * Attach a media element + URL to this controller.
   * - If native HLS is supported, sets `audio.src` directly.
   * - Else, attempts to import and use `hls.js`.
   */
  async attach(audio: HTMLMediaElement, url: string): Promise<void> {
    if (!isBrowser()) return; // No-op during SSR

    // If re-attaching, make sure we tear down prior state first.
    this.destroy();

    this.audio = audio;
    this.url = url;

    // Try native HLS first (Safari et al.)
    if (supportsNativeHls(audio)) {
      // For CORS-friendly analyzers; AudioEngine already sets this but keep safe.
      if (!audio.crossOrigin) audio.crossOrigin = "anonymous";
      audio.src = url;
      // Note: `.load()` is optional here; the engine will `.play()` as needed.
      return;
    }

    // Fallback to hls.js, loaded on-demand
    let HlsMod: HlsNamespace | null = null;
    try {
      HlsMod = await import(/* @vite-ignore */ "hls.js");
    } catch {
      // If hls.js is not present, we can't play HLS in non-Safari browsers.
      // As a last resort, assign src anyway — some UAs may do partial support.
      this.audio.src = url;
      return;
    }

    const HlsCtor = (HlsMod.default || (HlsMod as any)) as HlsCtor;
    const isSupported = (HlsMod.isSupported || (HlsCtor as any).isSupported || (() => false)) as () => boolean;

    if (!isSupported()) {
      // Same fallback as above
      this.audio.src = url;
      return;
    }

    // Construct hls.js with sensible defaults for desktop playback
    this.hls = new HlsCtor({
      // Keep worker/LL options conservative; can be tuned later
      enableWorker: true,
      lowLatencyMode: false,
      backBufferLength: 60, // seconds
      // You may add ABR/level selection hooks as needed
    });

    // Wire event listeners (optional but useful for diagnostics)
    const Events = (HlsMod.Events || (HlsCtor as any).Events) ?? {};
    this._bound.onError = (_evt: any, data?: any) => {
      // Non-fatal errors can often be ignored; fatal ones may require recover/level switch.
      if (data?.fatal) {
        try {
          // @ts-expect-error - hls.js typed APIs vary by version; defensive calls
          if (data?.type === "networkError" && (this.hls as any)?.startLoad) {
            (this.hls as any).startLoad();
          } else if ((this.hls as any)?.recoverMediaError) {
            (this.hls as any).recoverMediaError();
          }
        } catch {
          /* ignore */
        }
      }
    };
    this._bound.onMediaAttached = () => {
      // After media is attached, load source.
      try {
        this.hls?.loadSource(url);
      } catch {
        // If loadSource throws, fallback to element src.
        if (this.audio) this.audio.src = url;
      }
    };
    this._bound.onManifestParsed = () => {
      // No-op: AudioEngine drives play()
    };

    // Attach and kick off loading
    try {
      this.hls.attachMedia(audio);
      if (Events.ERROR) this.hls.on(Events.ERROR, this._bound.onError);
      if (Events.MEDIA_ATTACHED) this.hls.on(Events.MEDIA_ATTACHED, this._bound.onMediaAttached);
      if (Events.MANIFEST_PARSED) this.hls.on(Events.MANIFEST_PARSED, this._bound.onManifestParsed);
    } catch {
      // Fallback to direct assignment if attach fails
      this.detachHls();
      this.audio.src = url;
    }
  }

  /**
   * Teardown and release resources. Safe to call multiple times.
   * - Destroys hls.js instance and detaches from the element.
   * - Clears `audio.src` only if we were the ones to set it for HLS;
   *   the AudioEngine handles full media reset during `destroy()`.
   */
  destroy(): void {
    // Detach/destroy hls.js instance if present
    this.detachHls();

    // Do NOT force-clear element src here unconditionally; AudioEngine owns it.
    this.audio = null;
    this.url = null;
  }

  // Internal helper to detach hls.js cleanly
  private detachHls() {
    const hls = this.hls as any;
    if (!hls) return;

    try {
      // Remove events if present
      const Events = (hls.constructor && hls.constructor.Events) || {};
      if (Events.ERROR && this._bound.onError) hls.off?.(Events.ERROR, this._bound.onError);
      if (Events.MEDIA_ATTACHED && this._bound.onMediaAttached) hls.off?.(Events.MEDIA_ATTACHED, this._bound.onMediaAttached);
      if (Events.MANIFEST_PARSED && this._bound.onManifestParsed) hls.off?.(Events.MANIFEST_PARSED, this._bound.onManifestParsed);
    } catch {
      /* ignore */
    }

    try {
      // Prefer hls.detachMedia() then destroy()
      if (typeof hls.detachMedia === "function") hls.detachMedia();
    } catch {
      /* ignore */
    }

    try {
      hls.destroy();
    } catch {
      /* ignore */
    }

    this.hls = null;
  }
}
