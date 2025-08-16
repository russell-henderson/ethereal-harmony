/**
 * src/lib/diagnostics/AdaptiveGuard.ts
 * Ethereal Harmony — Adaptive Performance Guard (Phase 1 aligned, Phase 2-ready)
 *
 * Purpose within the project:
 *  - Keep the app consistently smooth (55–60 FPS target on mid-range hardware)
 *    by *suggesting and applying* safe visualizer degradations/upgrades based
 *    on live performance signals — without touching audio behavior.
 *  - Centralize heuristics so Player UI, Visualizer, and Dev tooling do not
 *    duplicate logic. Everything routes through this guard.
 *
 * How it integrates (no tight coupling, privacy-safe):
 *  - Listens to PerfEvents.onTick() for rolling FPS + busy-percent signals.
 *  - Applies *visualizer* quality presets through useVizStore **if** the store
 *    exposes compatible actions. Otherwise, it broadcasts a CustomEvent
 *    "eh:viz:quality" with `{ preset: QualityTier }` for other modules to handle.
 *  - Never persists telemetry remotely; only localStorage for the feature toggle
 *    and the last chosen tier (so a reload stays consistent).
 *
 * Design choices:
 *  - Hysteresis control with sustained thresholds to avoid preset "flapping".
 *  - Conservative, one-way by default: degrade quickly on sustained jank, upgrade
 *    slowly after sustained headroom.
 *  - Defensive optional wiring: feature-detect store actions so this file remains
 *    compatible even if the visualizer store evolves (Phase 1 → Phase 2).
 *
 * Quality tiers (ordered best→least): "ultra" → "high" → "balanced" → "low" → "minimal".
 *  - We only *propose/apply* tier changes; exact shader/material parameters are
 *    owned by the visualizer layer (Three.js + post-FX). This guard passes a
 *    single preset key to avoid leaking renderer details into diagnostics.
 *
 * Events (documented contract):
 *  - Emits:  "eh:adaptive:state"  detail: { enabled: boolean, tier: QualityTier }
 *  - Emits:  "eh:adaptive:apply"  detail: { from: QualityTier, to: QualityTier, reason: string }
 *  - Emits:  "eh:viz:quality"     detail: { preset: QualityTier, reason?: string }   // fallback route
 *  - Listens: "eh:viz:stats"      detail: { enabled: boolean } (not required, but present for symmetry)
 *
 * SSR/rehydration safety:
 *  - Guards window/document/performance access.
 *  - No React dependencies; pure TS module with a singleton API.
 *
 * Accessibility:
 *  - N/A (non-visual service). Dev UI components (e.g., DevToggle) drive this guard.
 */

import PerfEvents from "@/lib/diagnostics/PerfEvents";
import { useVizStore } from "@/lib/state/useVizStore";
import { useUIStore } from "@/lib/state/useUIStore";

/* ---------------------------------- Types --------------------------------- */

export type QualityTier = "ultra" | "high" | "balanced" | "low" | "minimal";

type ApplyReason =
  | "boot"
  | "restored"
  | "degrade_fps_low"
  | "degrade_longframe"
  | "degrade_busy"
  | "upgrade_fps_headroom"
  | "manual";

/**
 * Snapshot of recent perf for decision making (derived from PerfEvents).
 */
type PerfSnapshot = {
  fpsAvg: number;
  longFrameRatio: number; // 0–1
  busyPct: number; // 0–100
};

/* --------------------------------- Config --------------------------------- */

/**
 * Targets and thresholds derived from product pillar:
 * "Performance First: maintain 55–60 FPS on mid-range hardware."
 */
const TARGET_FPS = 58; // "good" steady-state
const DOWNGRADE_FPS = 50; // sustained below => degrade one tier
const LONG_RATIO_BAD = 0.20; // >20% frames >50ms indicates jank
const BUSY_BAD = 30; // >30% long task time over last second

/**
 * Hysteresis windows:
 *  - Degrade fast on sustained issues (2s).
 *  - Upgrade slow after sustained headroom (5s).
 */
const DEGRADE_SUSTAIN_MS = 2000;
const UPGRADE_SUSTAIN_MS = 5000;

/** Dispatch preset to visualizer at most once per 250ms to avoid bursts. */
const APPLY_THROTTLE_MS = 250;

/** LocalStorage keys (local only; never remote). */
const LS_KEY_ENABLED = "eh.adaptive.enabled";
const LS_KEY_TIER = "eh.adaptive.tier";

/* --------------------------------- Helpers -------------------------------- */

const IS_BROWSER = typeof window !== "undefined" && typeof document !== "undefined";

const readLS = (k: string): string | null => (IS_BROWSER ? window.localStorage.getItem(k) : null);
const writeLS = (k: string, v: string) => {
  if (!IS_BROWSER) return;
  try {
    window.localStorage.setItem(k, v);
  } catch {
    // ignore quota
  }
};

const TIERS: QualityTier[] = ["ultra", "high", "balanced", "low", "minimal"];

const clampTier = (tier: QualityTier): QualityTier =>
  (TIERS.includes(tier) ? tier : "balanced") as QualityTier;

const tierDown = (tier: QualityTier): QualityTier => {
  const i = TIERS.indexOf(tier);
  return TIERS[Math.min(i + 1, TIERS.length - 1)];
};

const tierUp = (tier: QualityTier): QualityTier => {
  const i = TIERS.indexOf(tier);
  return TIERS[Math.max(i - 1, 0)];
};

/** Cheap dev flag (no dependency on Settings): mirrors DevToggle "eh.dev.mode". */
const isDevMode = (): boolean => (readLS("eh.dev.mode") === "true") || !!useUIStore.getState()?.devMode;

/* --------------------------- Store/Events bridging ------------------------ */

/**
 * Attempt to apply a preset via useVizStore if actions exist;
 * otherwise broadcast a "eh:viz:quality" CustomEvent for listeners.
 */
let lastAppliedAt = 0;
const applyPreset = (to: QualityTier, reason: ApplyReason) => {
  if (!IS_BROWSER) return;
  const now = performance.now ? performance.now() : Date.now();
  if (now - lastAppliedAt < APPLY_THROTTLE_MS) return;
  lastAppliedAt = now;

  const viz = useVizStore.getState() as any;

  // Preferred single action in the visualizer domain:
  const apply = typeof viz?.applyQualityPreset === "function" ? viz.applyQualityPreset : undefined;
  const setTier = typeof viz?.setQualityTier === "function" ? viz.setQualityTier : undefined;

  if (apply) {
    try {
      apply(to);
    } catch {}
  } else if (setTier) {
    try {
      setTier(to);
    } catch {}
  } else {
    // Fallback: broadcast event for any subscriber (SceneController, etc.)
    const evt = new CustomEvent("eh:viz:quality", {
      detail: { preset: to, reason },
      bubbles: false,
      cancelable: false,
      composed: false,
    });
    window.dispatchEvent(evt);
  }

  // Notify diagnostics listeners
  const appliedEvt = new CustomEvent("eh:adaptive:apply", {
    detail: { from: AdaptiveGuard.tier(), to, reason },
    bubbles: false,
  });
  window.dispatchEvent(appliedEvt);
};

/* ------------------------------- Decision core ---------------------------- */

let _enabled = false;
let _tier: QualityTier = clampTier((readLS(LS_KEY_TIER) as QualityTier) || "balanced");

// Hysteresis state
let degradeSince = 0;
let upgradeSince = 0;

const snapshotFromPerf = (detail: any): PerfSnapshot => {
  const fpsAvg = Number(detail?.rolling?.fpsAvg ?? detail?.fps ?? 0);
  const longFrameRatio = Number(detail?.rolling?.longFrameRatio ?? 0);
  const busyPct = Number(detail?.longTasks?.busyPct ?? 0);
  return { fpsAvg, longFrameRatio, busyPct };
};

const shouldDegrade = (snap: PerfSnapshot): boolean => {
  if (snap.fpsAvg <= DOWNGRADE_FPS) return true;
  if (snap.longFrameRatio >= LONG_RATIO_BAD) return true;
  if (snap.busyPct >= BUSY_BAD) return true;
  return false;
};

const shouldUpgrade = (snap: PerfSnapshot): boolean => {
  // Headroom: consistently meeting target with low long-task pressure
  if (snap.fpsAvg >= TARGET_FPS && snap.longFrameRatio < LONG_RATIO_BAD * 0.5 && snap.busyPct < BUSY_BAD * 0.5) {
    return true;
  }
  return false;
};

let unsubTick: (() => void) | null = null;

const onTick = (detail: any) => {
  if (!_enabled) return;

  const snap = snapshotFromPerf(detail);
  const now = performance.now ? performance.now() : Date.now();

  // Update hysteresis timers
  if (shouldDegrade(snap)) {
    if (degradeSince === 0) degradeSince = now;
    // reset upgrade path
    upgradeSince = 0;
  } else if (shouldUpgrade(snap)) {
    if (upgradeSince === 0) upgradeSince = now;
    // reset degrade path
    degradeSince = 0;
  } else {
    // neither path accumulates — decay both
    degradeSince = 0;
    upgradeSince = 0;
  }

  // Apply if timers sustained
  if (degradeSince && now - degradeSince >= DEGRADE_SUSTAIN_MS) {
    const next = tierDown(_tier);
    if (next !== _tier) {
      if (isDevMode()) console.info(`[AdaptiveGuard] Degrade ${_tier} → ${next}`, snap);
      _tier = next;
      writeLS(LS_KEY_TIER, _tier);
      applyPreset(_tier, "degrade_fps_low");
    }
    degradeSince = 0; // avoid multiple steps in one burst
    upgradeSince = 0;
    return;
  }

  if (upgradeSince && now - upgradeSince >= UPGRADE_SUSTAIN_MS) {
    const next = tierUp(_tier);
    if (next !== _tier) {
      if (isDevMode()) console.info(`[AdaptiveGuard] Upgrade ${_tier} → ${next}`, snap);
      _tier = next;
      writeLS(LS_KEY_TIER, _tier);
      applyPreset(_tier, "upgrade_fps_headroom");
    }
    upgradeSince = 0;
    degradeSince = 0;
  }
};

/* ------------------------------ Public API -------------------------------- */

export const AdaptiveGuard = {
  /**
   * Initialize without enabling adaptation. This binds listeners needed for
   * future toggles and may apply a restored preset to keep UX consistent.
   */
  init(): void {
    if (!IS_BROWSER) return;

    // Bind once: when PerfEvents emits, we might enable later.
    if (!unsubTick) {
      unsubTick = PerfEvents.onTick(onTick);
    }

    // Restore last tier immediately (non-destructive; visualizer can ignore)
    const restored = clampTier(((readLS(LS_KEY_TIER) as QualityTier) || _tier) as QualityTier);
    _tier = restored;

    // Try to apply the restored tier once at boot so visualizer starts right.
    // This is safe even if visualizer has not mounted yet: it falls back to event.
    applyPreset(_tier, "restored");

    if (isDevMode()) {
      console.info(`[AdaptiveGuard] Initialized. Restored tier: ${_tier}`);
    }
  },

  /** Enable adaptive decisions (persisted locally). */
  enable(): void {
    if (!IS_BROWSER) return;
    if (_enabled) return;
    _enabled = true;
    writeLS(LS_KEY_ENABLED, "true");
    // Emit state
    const evt = new CustomEvent("eh:adaptive:state", { detail: { enabled: true, tier: _tier } });
    window.dispatchEvent(evt);
    if (isDevMode()) console.info("[AdaptiveGuard] Enabled.");
  },

  /** Disable adaptive decisions (persisted locally). Keeps current tier. */
  disable(): void {
    if (!IS_BROWSER) return;
    if (!_enabled) return;
    _enabled = false;
    writeLS(LS_KEY_ENABLED, "false");
    degradeSince = 0;
    upgradeSince = 0;
    const evt = new CustomEvent("eh:adaptive:state", { detail: { enabled: false, tier: _tier } });
    window.dispatchEvent(evt);
    if (isDevMode()) console.info("[AdaptiveGuard] Disabled.");
  },

  /** Toggle with explicit boolean. */
  setEnabled(enabled: boolean): void {
    enabled ? this.enable() : this.disable();
  },

  /** Returns whether adaptation is active. */
  isEnabled(): boolean {
    return _enabled;
  },

  /** Current working tier (not necessarily applied if visualizer ignores it). */
  tier(): QualityTier {
    return _tier;
  },

  /**
   * Manually set a tier (e.g., from a settings panel). This overrides the
   * current value and applies immediately. Adaptation remains ON/OFF as is.
   */
  setTier(tier: QualityTier, reason: ApplyReason = "manual"): void {
    const clamped = clampTier(tier);
    if (clamped === _tier) return;
    _tier = clamped;
    writeLS(LS_KEY_TIER, _tier);
    applyPreset(_tier, reason);
    if (isDevMode()) console.info(`[AdaptiveGuard] Manual tier → ${_tier}`);
  },

  /**
   * Convenience: returns a static recommendation from a perf snapshot without
   * changing state — useful for dev overlays.
   */
  recommend(detail: any): { action: "degrade" | "upgrade" | "hold"; to: QualityTier } {
    const snap = snapshotFromPerf(detail);
    if (shouldDegrade(snap)) return { action: "degrade", to: tierDown(_tier) };
    if (shouldUpgrade(snap)) return { action: "upgrade", to: tierUp(_tier) };
    return { action: "hold", to: _tier };
  },

  /**
   * Expose to window.__EH_ADAPTIVE for console debugging.
   */
  installGlobal(): void {
    if (!IS_BROWSER) return;
    (window as any).__EH_ADAPTIVE = this;
  },
};

export default AdaptiveGuard;

/* ------------------------------ Auto-bootstrap ---------------------------- */
/**
 * The module self-initializes in the browser so that dev tooling and the
 * visualizer can rely on a consistent tier at startup. We respect a persisted
 * enabled flag but do not force it on.
 */
if (IS_BROWSER) {
  try {
    AdaptiveGuard.init();

    // Respect persisted ON/OFF
    const persistedEnabled = readLS(LS_KEY_ENABLED) === "true";
    if (persistedEnabled) AdaptiveGuard.enable();

    // Optional: listen to DevToggle's viz stats toggle (not required). If the
    // developer enables stats, we do NOT auto-enable adaptation — diagnostics
    // and adaptation are orthogonal. This is left for future wiring if desired.
    window.addEventListener(
      "eh:viz:stats",
      ((e: CustomEvent<{ enabled: boolean }>) => {
        // no-op for now; could auto-enable AdaptiveGuard in future if needed
        if (isDevMode()) {
          console.debug("[AdaptiveGuard] Received viz:stats", e.detail);
        }
      }) as EventListener as any
    );

    AdaptiveGuard.installGlobal();
  } catch (err) {
    // Non-fatal: diagnostics must never crash the app.
    if (isDevMode()) console.warn("[AdaptiveGuard] bootstrap error", err);
  }
}
