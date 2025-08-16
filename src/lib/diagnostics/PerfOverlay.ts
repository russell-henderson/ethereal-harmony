/**
 * src/lib/diagnostics/PerfOverlay.ts
 * Ethereal Harmony — Lightweight Performance Overlay (Phase 1 aligned, Phase 2-ready)
 *
 * What this is:
 *  - A zero-dependency DOM overlay (non-React) that subscribes to PerfEvents
 *    and renders a compact glassmorphism diagnostics panel: FPS (inst/avg/min/max),
 *    long-frame ratio, long-task busy %, memory (when available), and the current
 *    AdaptiveGuard tier (if present). It never touches audio behavior.
 *
 * Why non-React?
 *  - The overlay must be available even when React trees remount or error
 *    boundaries reset. A tiny DOM singleton avoids re-renders and keeps the
 *    diagnostics loop isolated from app state, honoring our Performance-First pillar.
 *
 * How it integrates with the project:
 *  - PerfEvents (src/lib/diagnostics/PerfEvents.ts): this module listens to
 *    "eh:perf:tick" to update metrics. It also emits no new events.
 *  - DevToggle (src/components/diagnostics/DevToggle.tsx): when the "Visualizer FPS / stats"
 *    switch is toggled, it dispatches "eh:viz:stats" { enabled }. This overlay listens
 *    and shows/hides itself accordingly (plus persists the preference locally).
 *  - AdaptiveGuard (src/lib/diagnostics/AdaptiveGuard.ts): we read its current tier
 *    if the global hook is present, and display it. We do not control the guard.
 *
 * Design system alignment:
 *  - Glass tokens: radius 16px, blur 16px, bg rgba(255,255,255,0.12), border rgba(255,255,255,0.25)
 *  - Palette: #1A2B45 (bg), #7F6A9F (accent), #00F0FF (highlight)
 *  - Fonts (assumed globally loaded): Montserrat 700 for headings, Lato 400 for body
 *  - WCAG AA: readable font sizes, adequate contrast on a deep indigo base.
 *
 * Accessibility:
 *  - Overlay region has aria-label and role=region.
 *  - Live metrics are exposed via aria-live="polite" to assistive tech without spamming.
 *  - Keyboard users can focus the panel (tabindex=0); outline is visible.
 *
 * Privacy:
 *  - Local only. Uses localStorage to remember visibility/position. No telemetry.
 *
 * SSR / safety:
 *  - Guards window/document access. In SSR environments this file is inert.
 */

import PerfEvents from "@/lib/diagnostics/PerfEvents";

export type OverlayCorner = "top-left" | "top-right" | "bottom-left" | "bottom-right";

export type OverlayOptions = {
  /** Parent element to attach to; defaults to document.body */
  attachTo?: HTMLElement;
  /** Initial corner position; persisted in LS if changed by setPosition */
  position?: OverlayCorner;
  /** Start visible or not; if omitted we read persisted preference */
  visible?: boolean;
  /** Minimal mode renders only big FPS + tier line */
  mini?: boolean;
  /** Update rate for UI painting (sec). Data still sampled by PerfEvents. */
  uiHz?: number;
};

/* --------------------------------- Constants -------------------------------- */

const IS_BROWSER = typeof window !== "undefined" && typeof document !== "undefined";

const TOKENS = {
  radius: 16,
  blur: 16,
  bg: "rgba(255,255,255,0.12)",
  border: "1px solid rgba(255,255,255,0.25)",
  base: "#1A2B45",
  accent: "#7F6A9F",
  highlight: "#00F0FF",
};

const LS_VISIBLE = "eh.overlay.visible";
const LS_POSITION = "eh.overlay.pos";
const LS_MINI = "eh.overlay.mini";

/* --------------------------------- State ----------------------------------- */

type LatestPerf = {
  fps: number;
  fpsAvg: number;
  fpsMin: number;
  fpsMax: number;
  longRatio: number; // 0..1
  busyPct: number;   // 0..100
  memUsed?: number;
  memTotal?: number;
  memLimit?: number;
  t: number;
};

let mounted = false;
let container: HTMLElement | null = null;
let textLines: {
  title?: HTMLElement;
  line1?: HTMLElement;
  line2?: HTMLElement;
  line3?: HTMLElement;
  tier?: HTMLElement;
} = {};
let unsubTick: (() => void) | null = null;
let uiRaf = 0;
let lastUiPaint = 0;
let uiIntervalMs = 1000 / 6; // default 6 Hz UI refresh (data event may be 4 Hz)

let latest: LatestPerf | null = null;
let corner: OverlayCorner = "top-right";
let visible = false;
let mini = false;

/* ------------------------------- Utilities --------------------------------- */

const readLS = (k: string): string | null => (IS_BROWSER ? window.localStorage.getItem(k) : null);
const writeLS = (k: string, v: string) => {
  if (!IS_BROWSER) return;
  try {
    window.localStorage.setItem(k, v);
  } catch { /* ignore */ }
};

const formatMem = (bytes?: number) => {
  if (!bytes || bytes <= 0) return "—";
  // prefer MB for readability
  const mb = bytes / (1024 * 1024);
  if (mb < 1024) return `${mb.toFixed(1)} MB`;
  const gb = mb / 1024;
  return `${gb.toFixed(2)} GB`;
};

const getAdaptiveTier = (): string => {
  // Optional global exposed by AdaptiveGuard.installGlobal()
  const g = (window as any);
  if (g?.__EH_ADAPTIVE && typeof g.__EH_ADAPTIVE.tier === "function") {
    try {
      return g.__EH_ADAPTIVE.tier();
    } catch { /* ignore */ }
  }
  return "—";
};

const applyCorner = (el: HTMLElement, pos: OverlayCorner) => {
  el.style.top = "";
  el.style.right = "";
  el.style.bottom = "";
  el.style.left = "";

  const inset = "12px";
  switch (pos) {
    case "top-left":
      el.style.top = inset;
      el.style.left = inset;
      break;
    case "top-right":
      el.style.top = inset;
      el.style.right = inset;
      break;
    case "bottom-left":
      el.style.bottom = inset;
      el.style.left = inset;
      break;
    case "bottom-right":
      el.style.bottom = inset;
      el.style.right = inset;
      break;
  }
};

/* ------------------------------ DOM creation ------------------------------- */

const createContainer = (): HTMLElement => {
  const el = document.createElement("div");
  el.setAttribute("role", "region");
  el.setAttribute("aria-label", "Performance diagnostics overlay");
  el.setAttribute("aria-live", "polite");
  el.tabIndex = 0;

  Object.assign(el.style, {
    position: "fixed",
    zIndex: "9998",
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    padding: "10px 12px",
    color: "#FFFFFF",
    background: TOKENS.bg,
    border: TOKENS.border,
    borderRadius: `${TOKENS.radius}px`,
    backdropFilter: `blur(${TOKENS.blur}px)`,
    WebkitBackdropFilter: `blur(${TOKENS.blur}px)`,
    boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
    fontFamily: "Lato, system-ui, sans-serif",
    pointerEvents: "auto", // interactive (focusable)
    minWidth: "220px",
    userSelect: "none",
  } as CSSStyleDeclaration);

  // Title
  const title = document.createElement("div");
  Object.assign(title.style, {
    fontFamily: "Montserrat, system-ui, sans-serif",
    fontWeight: "700",
    fontSize: "12px",
    letterSpacing: "0.5px",
    textTransform: "uppercase",
    color: TOKENS.highlight,
    marginBottom: "2px",
  } as CSSStyleDeclaration);
  title.textContent = "Perf (EH)";

  // Big line (FPS + Tier)
  const line1 = document.createElement("div");
  Object.assign(line1.style, {
    fontSize: "18px",
    lineHeight: "20px",
    fontWeight: "700",
    fontFamily: "Montserrat, system-ui, sans-serif",
  } as CSSStyleDeclaration);
  line1.textContent = "FPS — / Tier —";

  // Secondary lines
  const line2 = document.createElement("div");
  Object.assign(line2.style, {
    fontSize: "12.5px",
    opacity: "0.95",
  } as CSSStyleDeclaration);

  const line3 = document.createElement("div");
  Object.assign(line3.style, {
    fontSize: "12.5px",
    opacity: "0.95",
  } as CSSStyleDeclaration);

  // Tier tag (right)
  const tier = document.createElement("div");
  Object.assign(tier.style, {
    alignSelf: "flex-end",
    fontSize: "11px",
    padding: "2px 6px",
    borderRadius: "10px",
    border: TOKENS.border,
    background: "rgba(0,0,0,0.25)",
    color: TOKENS.highlight,
  } as CSSStyleDeclaration);
  tier.textContent = "Tier —";

  el.appendChild(title);
  el.appendChild(line1);
  el.appendChild(line2);
  el.appendChild(line3);
  el.appendChild(tier);

  textLines = { title, line1, line2, line3, tier };
  return el;
};

/* ----------------------------- Render / Update ----------------------------- */

const paint = () => {
  if (!container || !latest) return;

  const fps = latest.fps;
  const avg = latest.fpsAvg;
  const min = latest.fpsMin;
  const max = latest.fpsMax;
  const ratio = latest.longRatio;
  const busy = latest.busyPct;

  const tier = getAdaptiveTier();

  // Big line: FPS (instant) • Tier
  if (textLines.line1) {
    textLines.line1.textContent = `FPS ${fps.toFixed(0)}  •  Tier ${tier}`;
  }

  // Line 2: avg/min/max
  if (textLines.line2) {
    textLines.line2.textContent = `avg ${avg.toFixed(1)} / min ${min.toFixed(0)} / max ${max.toFixed(0)}`;
  }

  // Line 3: long frames & busy% + memory when available
  const longPct = (ratio * 100).toFixed(0);
  const mem = latest.memUsed ? ` • mem ${formatMem(latest.memUsed)} / ${formatMem(latest.memTotal)}` : "";
  if (textLines.line3) {
    textLines.line3.textContent = `long ${longPct}% • busy ${busy.toFixed(0)}%${mem}`;
  }

  // Tier badge
  if (textLines.tier) {
    textLines.tier.textContent = `Tier ${tier}`;
  }

  // Color hint based on FPS
  const healthy = fps >= 58;
  const warning = fps < 58 && fps >= 48;
  const danger = fps < 48;

  const color = danger ? "#FF6B6B" : warning ? "#FFD166" : TOKENS.highlight;
  if (textLines.line1) (textLines.line1.style as any).color = color;
};

const scheduleUi = () => {
  if (uiRaf) cancelAnimationFrame(uiRaf);
  const loop = (ts: number) => {
    if (!mounted) return;
    if (!lastUiPaint) lastUiPaint = ts;
    const due = ts - lastUiPaint >= uiIntervalMs;
    if (due) {
      paint();
      lastUiPaint = ts;
    }
    uiRaf = requestAnimationFrame(loop);
  };
  uiRaf = requestAnimationFrame(loop);
};

/* ------------------------------- Event wiring ------------------------------ */

const onPerfTick = (detail: any) => {
  latest = {
    fps: Number(detail?.fps ?? 0),
    fpsAvg: Number(detail?.rolling?.fpsAvg ?? detail?.fps ?? 0),
    fpsMin: Number(detail?.rolling?.fpsMin ?? 0),
    fpsMax: Number(detail?.rolling?.fpsMax ?? 0),
    longRatio: Number(detail?.rolling?.longFrameRatio ?? 0),
    busyPct: Number(detail?.longTasks?.busyPct ?? 0),
    memUsed: detail?.memory?.jsHeapUsed,
    memTotal: detail?.memory?.jsHeapTotal,
    memLimit: detail?.memory?.jsHeapLimit,
    t: Number(detail?.t ?? performance.now()),
  };
};

/** Reflect external toggle events from DevToggle/Settings */
const bindExternalToggles = () => {
  if (!IS_BROWSER) return;
  window.addEventListener(
    "eh:viz:stats",
    ((e: CustomEvent<{ enabled: boolean }>) => {
      const enabled = !!e.detail?.enabled;
      PerfOverlay.setVisible(enabled);
      writeLS(LS_VISIBLE, enabled ? "true" : "false");
    }) as EventListener as any
  );
};

/* --------------------------------- API ------------------------------------ */

export const PerfOverlay = {
  /**
   * Mount the overlay (idempotent). It will attach to the specified container
   * or to document.body. Visibility and position honor persisted values unless
   * overridden via options.
   */
  mount(opts?: OverlayOptions): void {
    if (!IS_BROWSER) return;
    if (mounted) return;

    const parent = opts?.attachTo ?? document.body;

    // Persistence
    const persistedVisible = readLS(LS_VISIBLE);
    const persistedPos = readLS(LS_POSITION);
    const persistedMini = readLS(LS_MINI);

    visible = typeof opts?.visible === "boolean" ? opts.visible : persistedVisible === "true";
    corner = opts?.position ?? ((persistedPos as OverlayCorner) || "top-right");
    mini = typeof opts?.mini === "boolean" ? opts.mini : persistedMini === "true";
    uiIntervalMs = 1000 / Math.max(1, Math.min(30, opts?.uiHz ?? 6));

    container = createContainer();
    applyCorner(container, corner);

    // Minimal mode hides detailed lines
    if (mini) {
      if (textLines.line2) textLines.line2.style.display = "none";
      if (textLines.line3) textLines.line3.style.display = "none";
    }

    parent.appendChild(container);
    container.style.display = visible ? "flex" : "none";

    unsubTick = PerfEvents.on("eh:perf:tick", (ev: CustomEvent<any>) => onPerfTick(ev.detail));

    bindExternalToggles();
    scheduleUi();

    mounted = true;
  },

  /** Unmount and cleanup. Safe to call multiple times. */
  unmount(): void {
    if (!IS_BROWSER) return;
    if (!mounted) return;

    if (uiRaf) cancelAnimationFrame(uiRaf);
    uiRaf = 0;
    lastUiPaint = 0;

    unsubTick?.();
    unsubTick = null;

    container?.remove();
    container = null;
    textLines = {};
    mounted = false;
  },

  /** Show/hide the overlay and persist preference. */
  setVisible(next: boolean): void {
    if (!IS_BROWSER) return;
    visible = !!next;
    if (container) container.style.display = visible ? "flex" : "none";
    writeLS(LS_VISIBLE, visible ? "true" : "false");
  },

  /** Move the overlay to a different corner and persist preference. */
  setPosition(pos: OverlayCorner): void {
    if (!IS_BROWSER) return;
    corner = pos;
    if (container) applyCorner(container, corner);
    writeLS(LS_POSITION, corner);
  },

  /** Toggle minimal mode (only big FPS line + tier tag). */
  setMini(next: boolean): void {
    if (!IS_BROWSER) return;
    mini = !!next;
    if (textLines.line2) textLines.line2.style.display = mini ? "none" : "block";
    if (textLines.line3) textLines.line3.style.display = mini ? "none" : "block";
    writeLS(LS_MINI, mini ? "true" : "false");
  },

  /** Update UI refresh rate (1..30 Hz). */
  setUiHz(hz: number): void {
    uiIntervalMs = 1000 / Math.max(1, Math.min(30, hz));
  },

  /** Returns whether the overlay is currently mounted. */
  isMounted(): boolean {
    return mounted;
  },

  /** Returns current visibility. */
  isVisible(): boolean {
    return visible;
  },
};

export default PerfOverlay;

/* ------------------------------ Auto-bootstrap ----------------------------- */
/**
 * If the developer previously enabled stats (DevToggle persists `eh.dev.showStats`),
 * auto-mount the overlay on page load to keep the workflow smooth.
 */
if (IS_BROWSER) {
  try {
    const wantStats = window.localStorage.getItem("eh.dev.showStats") === "true";
    if (wantStats) {
      // Defer to next tick so the app shell can set up global styles first.
      queueMicrotask(() => {
        PerfOverlay.mount({ visible: true, position: (readLS(LS_POSITION) as OverlayCorner) || "top-right" });
      });
    }
  } catch {
    // non-fatal
  }
}
