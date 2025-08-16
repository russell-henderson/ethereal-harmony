/**
 * src/lib/diagnostics/PerfEvents.ts
 * Ethereal Harmony — Perf / Diagnostics Event Hub
 *
 * Purpose in the project:
 *  - Centralize light-weight, browser-native performance sampling (FPS, frame time,
 *    long tasks, JS heap) and broadcast it as CustomEvents so any part of the app
 *    (Visualizer overlay, Dev tools, player UI) can opt-in without tight coupling.
 *  - Zero external deps; SSR-safe; local-only; minimal CPU when disabled.
 *
 * How it fits with Phase 1 ↔ Phase 2:
 *  - Phase 1: Provides a safe diagnostics baseline the UI can subscribe to for
 *    development toggles. Works even if the visualizer is not mounted yet.
 *  - Phase 2: Visualizer can subscribe to `eh:perf:tick` to draw an FPS label or
 *    to show jank/heap hints. DevToggle uses `eh:viz:stats` to enable/disable
 *    sampling; this module listens to that event and starts/stops accordingly.
 *
 * Design choices:
 *  - EventTarget-based pub/sub (fire-and-forget; prevents render loops).
 *  - RAF loop sampling; throttled dispatch to avoid over-rendering diagnostics.
 *  - Rolling window stats (avg/min/max FPS; long-frame ratio).
 *  - Long Tasks API (if available) to approximate main thread busy %.
 *  - JS heap sampling (Chromium `performance.memory`) guarded by feature checks.
 *  - LocalStorage shadow values for persistence of developer toggles only.
 *
 * Events emitted (documented contract):
 *  - "eh:perf:tick"     detail: PerfTickPayload  (every 1/dispatchHz seconds)
 *  - "eh:perf:measure"  detail: PerfMeasureEvent (manual measures via helpers)
 *  - "eh:perf:state"    detail: { running: boolean }
 *
 * Events listened to:
 *  - "eh:viz:stats"     detail: { enabled: boolean }  // DevToggle/Settings
 *  - "visibilitychange"                                 // pause when hidden
 *
 * LocalStorage keys:
 *  - "eh.dev.showStats" : "true" | "false"  → auto-start on page load when true
 *
 * Security/Privacy:
 *  - No network calls, no telemetry. Everything stays on-device.
 */

type PerfTickPayload = {
  t: number;          // High-res timestamp (ms, same origin as performance.now)
  dt: number;         // Delta between frames (ms)
  fps: number;        // Instantaneous FPS from dt
  rolling: {
    fpsAvg: number;
    fpsMin: number;
    fpsMax: number;
    longFrameRatio: number; // % of frames in the window exceeding LONG_FRAME_MS
  };
  longTasks: {
    last1sMs: number;   // total long-task time in the last second
    busyPct: number;    // rough main-thread busy % over last second
  };
  memory?: {
    jsHeapUsed: number;
    jsHeapTotal: number;
    jsHeapLimit: number;
  };
};

type PerfMeasureEvent = {
  name: string;
  duration: number; // ms
  startTime: number; // ms
  endTime: number; // ms
};

const IS_BROWSER = typeof window !== "undefined" && typeof document !== "undefined";
const HAS_PERF = typeof performance !== "undefined";
const HAS_PO = typeof PerformanceObserver !== "undefined";

/** A "long" frame threshold. >50ms implies visible jank on 60Hz displays. */
const LONG_FRAME_MS = 50;

/** How often to dispatch a tick event (Hz). We still sample every frame. */
const DEFAULT_DISPATCH_HZ = 4;

/** Rolling FPS window size in frames (approx 2 seconds @ 60fps). */
const FPS_WINDOW_FRAMES = 120;

/* -------------------------------------------------------------------------- */
/*                              EventTarget setup                              */
/* -------------------------------------------------------------------------- */

/** Minimal EventTarget polyfill for SSR or legacy contexts. */
class SimpleTarget {
  private map = new Map<string, Set<EventListener>>();
  addEventListener(type: string, listener: EventListener) {
    if (!this.map.has(type)) this.map.set(type, new Set());
    this.map.get(type)!.add(listener);
  }
  removeEventListener(type: string, listener: EventListener) {
    this.map.get(type)?.delete(listener);
  }
  dispatchEvent(event: Event) {
    this.map.get(event.type)?.forEach((l) => {
      try {
        l.call(undefined, event);
      } catch {
        // swallow to keep diagnostics resilient
      }
    });
    return true;
  }
}

const _target: EventTarget =
  IS_BROWSER && "EventTarget" in window ? new EventTarget() : (new SimpleTarget() as unknown as EventTarget);

/** Helper to emit CustomEvent safely. */
const emit = <T>(type: string, detail: T) => {
  if (!IS_BROWSER) return;
  const evt = new CustomEvent<T>(type, { detail, bubbles: false, cancelable: false, composed: false });
  _target.dispatchEvent(evt);
  // Also dispatch on window so non-module listeners can subscribe if desired.
  window.dispatchEvent(evt);
};

/* -------------------------------------------------------------------------- */
/*                           Long Tasks (busy percent)                         */
/* -------------------------------------------------------------------------- */

type LTEntry = { t: number; d: number };
const longTaskWindow: LTEntry[] = [];
let po: PerformanceObserver | null = null;

/** Initialize Long Task observation (Chromium only). */
const initLongTasks = () => {
  if (!IS_BROWSER || !HAS_PO) return;
  try {
    po = new PerformanceObserver((list) => {
      // "longtask" has spec'd name; Chromium populates entries as PerformanceEntry with duration
      // @ts-expect-error – TS doesn't know "longtask" by default
      const entries: PerformanceEntry[] = list.getEntries();
      const now = performance.now();
      for (const e of entries) {
        const d = typeof e.duration === "number" ? e.duration : 0;
        longTaskWindow.push({ t: now, d });
      }
      // Trim to last 1 second
      const cutoff = now - 1000;
      while (longTaskWindow.length && longTaskWindow[0].t < cutoff) longTaskWindow.shift();
    });
    // @ts-expect-error – "longtask" is not in lib.dom.d.ts yet in some TS targets
    po.observe({ entryTypes: ["longtask"] });
  } catch {
    po = null;
  }
};

const getBusyLast1s = (): { last1sMs: number; busyPct: number } => {
  if (!HAS_PERF) return { last1sMs: 0, busyPct: 0 };
  const now = performance.now();
  const cutoff = now - 1000;
  // prune and sum
  let sum = 0;
  for (let i = longTaskWindow.length - 1; i >= 0; i--) {
    const it = longTaskWindow[i];
    if (it.t < cutoff) break;
    sum += it.d;
  }
  const busyPct = Math.max(0, Math.min(100, (sum / 1000) * 100));
  return { last1sMs: sum, busyPct };
};

/* -------------------------------------------------------------------------- */
/*                              FPS / RAF sampling                             */
/* -------------------------------------------------------------------------- */

let running = false;
let rafId = 0;
let lastTs = 0;
let lastDispatchTs = 0;
let dispatchIntervalMs = 1000 / DEFAULT_DISPATCH_HZ;

// Rolling FPS stats
const fpsBuf = new Float32Array(FPS_WINDOW_FRAMES);
let fpsIndex = 0;
let fpsFilled = 0;
let longFrameCount = 0;

/** Reset rolling stats. */
const resetStats = () => {
  fpsBuf.fill(0);
  fpsIndex = 0;
  fpsFilled = 0;
  longFrameCount = 0;
};

const sampleMemory = () => {
  // Non-standard (Chromium). Guarded by feature checks.
  const p: any = performance as any;
  const mem = p?.memory;
  if (!mem) return undefined;
  const { usedJSHeapSize, totalJSHeapSize, jsHeapSizeLimit } = mem;
  if (typeof usedJSHeapSize !== "number") return undefined;
  return {
    jsHeapUsed: usedJSHeapSize,
    jsHeapTotal: typeof totalJSHeapSize === "number" ? totalJSHeapSize : usedJSHeapSize,
    jsHeapLimit: typeof jsHeapSizeLimit === "number" ? jsHeapSizeLimit : usedJSHeapSize,
  };
};

const tick = (ts: number) => {
  if (!running) return;

  // First frame bootstrap
  if (lastTs === 0) lastTs = ts;
  const dt = Math.max(0, ts - lastTs);
  lastTs = ts;

  // Instant FPS (avoid div-by-zero)
  const fps = dt > 0 ? 1000 / dt : 0;

  // Long frame accounting (for rolling ratio)
  const isLong = dt > LONG_FRAME_MS;
  if (isLong) longFrameCount++;

  // Update rolling buffer
  fpsBuf[fpsIndex] = fps;
  fpsIndex = (fpsIndex + 1) % FPS_WINDOW_FRAMES;
  if (fpsFilled < FPS_WINDOW_FRAMES) fpsFilled++;

  const now = ts;
  const due = now - lastDispatchTs >= dispatchIntervalMs;

  if (due) {
    lastDispatchTs = now;

    // Aggregate rolling stats
    let sum = 0;
    let min = Number.POSITIVE_INFINITY;
    let max = 0;

    for (let i = 0; i < fpsFilled; i++) {
      const v = fpsBuf[i];
      sum += v;
      if (v < min) min = v;
      if (v > max) max = v;
    }
    const avg = fpsFilled > 0 ? sum / fpsFilled : 0;
    const longRatio = fpsFilled > 0 ? longFrameCount / fpsFilled : 0;

    const busy = getBusyLast1s();

    const payload: PerfTickPayload = {
      t: ts,
      dt,
      fps,
      rolling: {
        fpsAvg: avg,
        fpsMin: min === Number.POSITIVE_INFINITY ? 0 : min,
        fpsMax: max,
        longFrameRatio: longRatio,
      },
      longTasks: busy,
      memory: sampleMemory(),
    };

    emit<PerfTickPayload>("eh:perf:tick", payload);
  }

  rafId = requestAnimationFrame(tick);
};

/* -------------------------------------------------------------------------- */
/*                            Public API (singleton)                           */
/* -------------------------------------------------------------------------- */

const start = (opts?: { dispatchHz?: number }) => {
  if (!IS_BROWSER || !HAS_PERF) return;
  if (running) return;

  // Update throttle
  const hz = Math.max(1, Math.min(30, opts?.dispatchHz ?? DEFAULT_DISPATCH_HZ));
  dispatchIntervalMs = 1000 / hz;

  // Reset
  resetStats();
  lastTs = 0;
  lastDispatchTs = 0;

  // Init LT observer on first start
  if (!po) initLongTasks();

  running = true;
  emit("eh:perf:state", { running: true });
  rafId = requestAnimationFrame(tick);
};

const stop = () => {
  if (!IS_BROWSER) return;
  if (!running) return;
  running = false;
  if (rafId) cancelAnimationFrame(rafId);
  rafId = 0;
  emit("eh:perf:state", { running: false });
};

const isRunning = () => running;

/** Subscribe to a perf event on the internal target. Returns an unsubscribe fn. */
const on = <T = any>(type: string, handler: (ev: CustomEvent<T>) => void) => {
  const h = handler as EventListener;
  _target.addEventListener(type, h);
  return () => _target.removeEventListener(type, h);
};

/** Subscribe to ticks specifically (typed helper). */
const onTick = (handler: (detail: PerfTickPayload) => void) =>
  on<PerfTickPayload>("eh:perf:tick", (e) => handler(e.detail));

/** Emit a custom perf event with typed payload. */
const emitEvent = <T = any>(type: string, detail: T) => emit<T>(type, detail);

/* -------------------------- Measures / Marks API -------------------------- */

const safeMark = (name: string) => {
  if (!HAS_PERF || typeof performance.mark !== "function") return;
  try {
    performance.mark(name);
  } catch {
    // ignore malformed names
  }
};

const safeMeasure = (name: string, startMark?: string, endMark?: string) => {
  if (!HAS_PERF || typeof performance.measure !== "function") return;
  try {
    performance.measure(name, startMark, endMark);
  } catch {
    // ignore
  }
};

/**
 * Time a synchronous or async function and emit an "eh:perf:measure".
 */
const withMeasure = async <T>(
  name: string,
  fn: () => T | Promise<T>
): Promise<T> => {
  const t0 = HAS_PERF ? performance.now() : Date.now();
  try {
    const result = await fn();
    const t1 = HAS_PERF ? performance.now() : Date.now();
    const detail: PerfMeasureEvent = { name, duration: t1 - t0, startTime: t0, endTime: t1 };
    emit<PerfMeasureEvent>("eh:perf:measure", detail);
    return result;
  } catch (err) {
    const t1 = HAS_PERF ? performance.now() : Date.now();
    const detail: PerfMeasureEvent = { name: `${name}:error`, duration: t1 - t0, startTime: t0, endTime: t1 };
    emit<PerfMeasureEvent>("eh:perf:measure", detail);
    throw err;
  }
};

/* -------------------------- DevToggle / Visibility ------------------------ */

/**
 * Bind listeners so external toggles control sampling.
 * - "eh:viz:stats" { enabled } starts/stops the loop.
 * - page hidden → pause; visible → resume if it was enabled by user.
 */
let desiredEnabled = false; // user's intent (via toggle)
const bindToDevToggles = () => {
  if (!IS_BROWSER) return;

  // Respect persisted state
  desiredEnabled = window.localStorage.getItem("eh.dev.showStats") === "true";
  if (desiredEnabled) start();

  // DevToggle or Settings will dispatch this
  window.addEventListener("eh:viz:stats", ((e: CustomEvent<{ enabled: boolean }>) => {
    desiredEnabled = !!e.detail?.enabled;
    if (desiredEnabled) {
      // persist
      try {
        window.localStorage.setItem("eh.dev.showStats", "true");
      } catch {}
      start();
    } else {
      try {
        window.localStorage.setItem("eh.dev.showStats", "false");
      } catch {}
      stop();
    }
  }) as EventListener as any);

  // Visibility: pause sampling while hidden to reduce CPU
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      stop();
    } else if (desiredEnabled) {
      start();
    }
  });
};

/* ------------------------------- Global hook ------------------------------ */

/**
 * Install a global handle so other modules can access the singleton without
 * importing this file (useful for debugging from console).
 */
const installGlobal = () => {
  if (!IS_BROWSER) return;
  (window as any).__EH_PERF = PerfEvents;
};

/* ------------------------------- Public shape ----------------------------- */

export const PerfEvents = {
  /** Start sampling (no-op on server). */
  start,
  /** Stop sampling (no-op if not running). */
  stop,
  /** Whether the sampler is running. */
  isRunning,
  /** Subscribe to any perf event. Returns unsubscribe. */
  on,
  /** Subscribe to perf ticks specifically. Returns unsubscribe. */
  onTick,
  /** Emit a custom perf event. */
  emit: emitEvent,
  /** performance.mark wrapper (safe). */
  mark: safeMark,
  /** performance.measure wrapper (safe). */
  measure: safeMeasure,
  /** Measure a function (sync/async) and emit duration. */
  withMeasure,
  /** Bind visibility + dev toggle listeners. Safe to call multiple times. */
  bindToDevToggles,
  /** Expose to window.__EH_PERF for ad-hoc debugging. */
  installGlobal,
} as const;

export default PerfEvents;

/* ------------------------------ Auto-bootstrap ---------------------------- */
/**
 * Light auto-wiring:
 *  - Bind to dev toggles so the DevToggle panel controls sampling.
 *  - Expose global util for console debugging.
 */
if (IS_BROWSER) {
  try {
    bindToDevToggles();
    installGlobal();
  } catch {
    // Keep diagnostics non-fatal
  }
}
