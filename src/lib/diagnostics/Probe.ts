/**
 * src/lib/diagnostics/Probe.ts
 * Ethereal Harmony — Ultra-light diagnostics probes (Phase 1 aligned, Phase 2-ready)
 *
 * Purpose in the project:
 *  - Give us a tiny, dependency-free way to time code paths (sync/async), count events,
 *    and optionally surface those measurements to the shared PerfEvents hub without
 *    coupling UI or the audio engine. Probes are safe to ship in production — they
 *    become near-no-ops when disabled.
 *
 * How it fits with the rest:
 *  - PerfEvents (src/lib/diagnostics/PerfEvents.ts) already broadcasts periodic ticks
 *    and accepts custom "eh:perf:measure" events. Probe uses that pathway to publish
 *    granular measurements (decode time, shader compile time, queue ops, etc).
 *  - DevToggle (src/components/diagnostics/DevToggle.tsx) and localStorage flags
 *    control whether we *log* to the console. Measurements are still emitted so
 *    overlays can visualize them without spamming logs.
 *  - AdaptiveGuard (src/lib/diagnostics/AdaptiveGuard.ts) is independent; however a
 *    higher-level component could correlate Probe measurements with Guard decisions.
 *
 * Product pillars honored:
 *  - Performance First: near-zero overhead; O(1) map lookups; no allocations during
 *    hot loops beyond a single Date/performance.now() per measurement.
 *  - Accessibility by Design: N/A (non-visual). Any UI consuming Probe data must meet AA.
 *  - Privacy and Trust: Everything is local; no network I/O; events stay in-page.
 *
 * SSR & safety:
 *  - All window/performance/localStorage access is guarded.
 *  - If performance.now() is unavailable (very rare), we fall back to Date.now().
 *
 * API overview:
 *  - Probe.start(name[, meta]) → id      // manual timing (call end with same id)
 *  - Probe.end(id[, meta]) → duration
 *  - Probe.run(name, fn[, meta])         // times sync function
 *  - Probe.runAsync(name, fn[, meta])    // times async function (Promise)
 *  - Probe.mark(name[, meta])            // instant mark (count event)
 *  - Probe.count(name, delta=1)          // accumulate a counter (no timing)
 *  - Probe.flushCounts()                 // emit & reset counters
 *  - Probe.enabled([boolean])            // get/set console logging toggle (emission unaffected)
 *  - Probe.onMeasure(handler)            // subscribe to emitted measure events (returns unsubscribe)
 *  - Probe.installGlobal()               // expose window.__EH_PROBE for quick debugging
 *
 * Emitted event shape (via PerfEvents.emit("eh:perf:measure", detail)):
 *  {
 *    name: string;            // measurement name, e.g. "audio:decode"
 *    duration: number;        // ms (0 for mark / count)
 *    startTime: number;       // ms (perf clock)
 *    endTime: number;         // ms
 *    meta?: Record<string, any>;
 *    type: "measure" | "mark" | "count";
 *    count?: number;          // present when type === "count"
 *    id?: string;             // probe id for manual start/end pairs
 *  }
 */

import PerfEvents from "@/lib/diagnostics/PerfEvents";

/* ---------------------------------- Utils --------------------------------- */

const IS_BROWSER = typeof window !== "undefined";
const HAS_PERF = typeof performance !== "undefined" && typeof performance.now === "function";

const now = (): number => (HAS_PERF ? performance.now() : Date.now());

const readLS = (k: string): string | null => (IS_BROWSER ? window.localStorage.getItem(k) : null);
const writeLS = (k: string, v: string) => {
  if (!IS_BROWSER) return;
  try {
    window.localStorage.setItem(k, v);
  } catch {
    // ignore
  }
};

/** Cheap unique id (no crypto dependency). Good enough for session-local probes. */
let _seed = Math.floor(Math.random() * 1e6);
const uid = (prefix = "p"): string => `${prefix}-${(++_seed).toString(36)}-${Math.floor(now()).toString(36)}`;

/** Whether console logging of probe results is enabled (measure emission is independent). */
let _logEnabled = readLS("eh.probe.log") === "true";

/** Dev helper – logs only if enabled. */
const devLog = (...args: any[]) => {
  if (_logEnabled && typeof console !== "undefined") {
    // eslint-disable-next-line no-console
    console.log(...args);
  }
};

/* ---------------------------- Internal state ------------------------------ */

/** Active timing sessions: id → { name, t0, meta? } */
const active = new Map<
  string,
  { name: string; t0: number; meta?: Record<string, any> }
>();

/** Aggregated counters flushed on demand to a single event per name. */
const counters = new Map<string, number>();

/* ---------------------------- Event bridge (Perf) ------------------------- */

type MeasureDetail = {
  name: string;
  duration: number;
  startTime: number;
  endTime: number;
  meta?: Record<string, any>;
  type: "measure" | "mark" | "count";
  count?: number;
  id?: string;
};

const emitMeasure = (detail: MeasureDetail) => {
  // Always emit through PerfEvents so dev overlays can subscribe.
  PerfEvents.emit<MeasureDetail>("eh:perf:measure", detail);
};

/* --------------------------------- API ------------------------------------ */

export const Probe = {
  /**
   * Manually start a probe.
   * Returns a session id you *must* pass to `end`. If a name/id pair is reused,
   * the previous session is overwritten (last write wins).
   */
  start(name: string, meta?: Record<string, any>): string {
    const id = uid("probe");
    active.set(id, { name, t0: now(), meta });
    return id;
  },

  /**
   * End a previously started probe. Returns the measured duration in ms or 0
   * if no matching start was found (safe no-op).
   */
  end(id: string, meta?: Record<string, any>): number {
    const item = active.get(id);
    if (!item) return 0;

    active.delete(id);
    const t1 = now();
    const duration = Math.max(0, t1 - item.t0);

    const detail: MeasureDetail = {
      name: item.name,
      duration,
      startTime: item.t0,
      endTime: t1,
      meta: { ...(item.meta || {}), ...(meta || {}) },
      type: "measure",
      id,
    };

    emitMeasure(detail);
    devLog(`[Probe] ${item.name}: ${duration.toFixed(2)}ms`, detail.meta || "");

    return duration;
  },

  /**
   * Time a synchronous function. Returns the function's return value.
   * If the function throws, we still emit a measure with ":error" suffix.
   */
  run<T>(name: string, fn: () => T, meta?: Record<string, any>): T {
    const t0 = now();
    try {
      const res = fn();
      const t1 = now();
      const detail: MeasureDetail = {
        name,
        duration: Math.max(0, t1 - t0),
        startTime: t0,
        endTime: t1,
        meta,
        type: "measure",
      };
      emitMeasure(detail);
      devLog(`[Probe] ${name}: ${detail.duration.toFixed(2)}ms`, meta || "");
      return res;
    } catch (err) {
      const t1 = now();
      const detail: MeasureDetail = {
        name: `${name}:error`,
        duration: Math.max(0, t1 - t0),
        startTime: t0,
        endTime: t1,
        meta: { ...(meta || {}), error: true },
        type: "measure",
      };
      emitMeasure(detail);
      devLog(`[Probe] ${name} (error): ${detail.duration.toFixed(2)}ms`, meta || "", err);
      throw err;
    }
  },

  /**
   * Time an async function (Promise). Resolves with the function's value.
   * Emits a ":error" measurement if the promise rejects.
   */
  async runAsync<T>(
    name: string,
    fn: () => Promise<T>,
    meta?: Record<string, any>
  ): Promise<T> {
    const t0 = now();
    try {
      const res = await fn();
      const t1 = now();
      const detail: MeasureDetail = {
        name,
        duration: Math.max(0, t1 - t0),
        startTime: t0,
        endTime: t1,
        meta,
        type: "measure",
      };
      emitMeasure(detail);
      devLog(`[Probe] ${name}: ${detail.duration.toFixed(2)}ms`, meta || "");
      return res;
    } catch (err) {
      const t1 = now();
      const detail: MeasureDetail = {
        name: `${name}:error`,
        duration: Math.max(0, t1 - t0),
        startTime: t0,
        endTime: t1,
        meta: { ...(meta || {}), error: true },
        type: "measure",
      };
      emitMeasure(detail);
      devLog(`[Probe] ${name} (error): ${detail.duration.toFixed(2)}ms`, meta || "", err);
      throw err;
    }
  },

  /**
   * Instant mark — records an occurrence without timing. Useful for counting
   * specific events (e.g., "queue:add", "shader:compiled").
   */
  mark(name: string, meta?: Record<string, any>): void {
    const t = now();
    const detail: MeasureDetail = {
      name,
      duration: 0,
      startTime: t,
      endTime: t,
      meta,
      type: "mark",
    };
    emitMeasure(detail);
    devLog(`[Probe] mark: ${name}`, meta || "");
  },

  /**
   * Add a delta to a named counter (defaults to +1). Counters are batched and
   * emitted only when `flushCounts()` is called to reduce event spam.
   */
  count(name: string, delta = 1): void {
    const prev = counters.get(name) || 0;
    counters.set(name, prev + delta);
  },

  /**
   * Emit and reset all accumulated counters. This should be called at a sensible
   * cadence (e.g., once per second by a diagnostics loop, or manually in Dev UI).
   */
  flushCounts(): void {
    const t = now();
    for (const [name, count] of counters.entries()) {
      const detail: MeasureDetail = {
        name,
        duration: 0,
        startTime: t,
        endTime: t,
        type: "count",
        count,
      };
      emitMeasure(detail);
      devLog(`[Probe] count: ${name} = ${count}`);
    }
    counters.clear();
  },

  /**
   * Enable/disable console logging for probes (measure emission is unaffected).
   * Persisted locally so a reload preserves the preference.
   */
  enabled(next?: boolean): boolean {
    if (typeof next === "boolean") {
      _logEnabled = next;
      writeLS("eh.probe.log", next ? "true" : "false");
    }
    return _logEnabled;
  },

  /**
   * Subscribe to PerfEvents "eh:perf:measure" stream (typed for MeasureDetail).
   * Returns an unsubscribe function.
   */
  onMeasure(handler: (detail: MeasureDetail) => void): () => void {
    return PerfEvents.on<MeasureDetail>("eh:perf:measure", (e) => handler(e.detail));
  },

  /**
   * Expose a convenient global for quick debugging (window.__EH_PROBE).
   */
  installGlobal(): void {
    if (!IS_BROWSER) return;
    (window as any).__EH_PROBE = this;
  },
} as const;

export default Probe;

/* ----------------------------- Suggested usage ---------------------------- */
/**
 * Examples (do not execute here):
 *
 * // Manual timing:
 * const id = Probe.start("audio:decode", { codec: "mp3" });
 * await decodeBuffer(...);
 * Probe.end(id);
 *
 * // Sync
 * const out = Probe.run("viz:scene:build", () => buildScene(meshes));
 *
 * // Async
 * const data = await Probe.runAsync("net:cover-art:fetch", () => fetch(url).then(r => r.blob()));
 *
 * // Count
 * Probe.count("queue:add");
 * Probe.flushCounts(); // e.g., on an interval
 */

/* -------------------------------- Bootstrap ------------------------------- */
/**
 * We auto-install the global alias in the browser for convenience. This has
 * no side effects beyond attaching a reference for console access.
 */
if (IS_BROWSER) {
  try {
    Probe.installGlobal();
  } catch {
    // non-fatal
  }
}
