// src/lib/state/useVizStore.ts
/**
 * Visualizer state (Phase 1/2)
 * -----------------------------------------------------------------------------
 * Ownership:
 *  - All UI-facing visualizer toggles & curated params that feed Three.js.
 *  - Preset selection & cycling.
 *
 * Persistence:
 *  - LocalStorage via zustand/persist.
 *  - We *intentionally* persist only long-lived choices (theme, toggles,
 *    presetId, params). Ephemeral flags (e.g., hasHydrated) are not persisted.
 *
 * Stability / Safety:
 *  - `version` + `migrate` eliminate rehydrate warnings and keep users' data.
 *  - Runtime clamps & numeric coercion prevent NaN/undefined bugs that crash
 *    controls (e.g., `.toFixed()` on undefined).
 *  - `hasHydrated` lets components wait until persistence is ready.
 *
 * Performance:
 *  - Export small, *primitive* selectors to avoid React "getSnapshot" loops.
 *  - Provide non-hook helpers for render-loop code (Three.js, workers).
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

/* ----------------------------------------------------------------------------
 * Types
 * ------------------------------------------------------------------------- */

export type VizPresetId = "nebula" | "glass-waves" | "strobe-pulse";

export type VizParams = {
  intensity: number;     // 0..1
  bloom: number;         // 0..0.5 (design clamp 0.25 to protect FPS)
  motionScale: number;   // 0..1
  smooth: number;        // 0..1 analyser smoothing (visual inertia)
  baseColor: string;     // CSS color token
  reactiveHue: string;   // CSS color token
  accent: string;        // CSS color token
  particleCount: number; // visual density (Three scene may cap by tier)
};

type VizState = {
  // Theme
  theme: "dark" | "system";

  // Toggles
  hdr: boolean;          // enable HDR post-processing pipeline
  dimmer: boolean;       // reduce overall brightness for readability

  // Selection
  presetId: VizPresetId;

  // Curated params (uniform-friendly)
  params: VizParams;

  // Persist hydration guard
  hasHydrated: boolean;

  // Actions
  setParam: <K extends keyof VizParams>(k: K, v: VizParams[K]) => void;
  setPreset: (id: VizPresetId) => void;
  cyclePreset: () => void;
  toggleHDR: () => void;
  toggleDimmer: () => void;
};

/* ----------------------------------------------------------------------------
 * Presets (tasteful, aligned to our palette)
 * ------------------------------------------------------------------------- */

const PRESET_ORDER: VizPresetId[] = ["nebula", "glass-waves", "strobe-pulse"];

const PRESET_TABLE: Record<VizPresetId, Partial<VizParams>> = {
  nebula: {
    intensity: 0.4,
    bloom: 0.18,
    motionScale: 0.25,
    baseColor: "#1A2B45",   // Deep Indigo
    reactiveHue: "#7F6A9F", // Soft Lavender
    accent: "#00F0FF",      // Radiant Aqua
  },
  "glass-waves": {
    intensity: 0.6,
    bloom: 0.22,
    motionScale: 0.35,
    baseColor: "#1A2B45",
    reactiveHue: "#7F6A9F",
    accent: "#00F0FF",
  },
  "strobe-pulse": {
    intensity: 0.8,
    bloom: 0.25,
    motionScale: 0.5,
    baseColor: "#1A2B45",
    reactiveHue: "#7F6A9F",
    accent: "#00F0FF",
  },
};

/* ----------------------------------------------------------------------------
 * Helpers (clamps, numeric coercion)
 * ------------------------------------------------------------------------- */

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));
const clampBloom = (n: number) => Math.min(0.25, Math.max(0, n)); // guard FPS
const clampParticles = (n: number) => Math.max(1_000, Math.min(250_000, n));

const num = (v: unknown, fallback: number) => {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
};

/* ----------------------------------------------------------------------------
 * Defaults
 * ------------------------------------------------------------------------- */

const DEFAULTS: VizState = {
  theme: "dark",
  hdr: false,
  dimmer: false,
  presetId: "nebula",
  params: {
    intensity: 0.4,
    bloom: 0.18,
    motionScale: 0.25,
    smooth: 0.8,
    baseColor: "#1A2B45",
    reactiveHue: "#7F6A9F",
    accent: "#00F0FF",
    particleCount: 40_000,
  },
  hasHydrated: false,

  setParam: () => {},
  setPreset: () => {},
  cyclePreset: () => {},
  toggleHDR: () => {},
  toggleDimmer: () => {},
};

const STORE_KEY = "viz-v1";     // storage bucket name (kept stable)
const STORE_VERSION = 2;        // bump when shape changes

// Persisted shape from v1 for migration typing
type PersistShapeV1 = Omit<
  VizState,
  | "hasHydrated"
  | "setParam"
  | "setPreset"
  | "cyclePreset"
  | "toggleHDR"
  | "toggleDimmer"
>;

/* ----------------------------------------------------------------------------
 * Store
 * ------------------------------------------------------------------------- */

export const useVizStore = create<VizState>()(
  persist(
    (set, get) => ({
      ...DEFAULTS,

      // Update a single param with coercion/clamps to prevent NaNs
      setParam: (k, v) => {
        const cur = get().params;
        let nextVal = v;

        if (typeof cur[k] === "number") {
          const raw = num(v, cur[k] as number);
          if (k === "bloom") nextVal = clampBloom(raw) as VizParams[typeof k];
          else if (k === "intensity" || k === "motionScale" || k === "smooth")
            nextVal = clamp01(raw) as VizParams[typeof k];
          else if (k === "particleCount")
            nextVal = clampParticles(raw) as VizParams[typeof k];
          else nextVal = raw as VizParams[typeof k];
        }

        set({ params: { ...cur, [k]: nextVal } });
      },

      // Apply a curated preset (merge with current while re-clamping)
      setPreset: (id) => {
        const base = get().params;
        const override = PRESET_TABLE[id] || {};
        const merged: VizParams = {
          ...base,
          ...override,
          intensity: clamp01(num(override.intensity ?? base.intensity, DEFAULTS.params.intensity)),
          bloom: clampBloom(num(override.bloom ?? base.bloom, DEFAULTS.params.bloom)),
          motionScale: clamp01(num(override.motionScale ?? base.motionScale, DEFAULTS.params.motionScale)),
          smooth: clamp01(num(base.smooth, DEFAULTS.params.smooth)),
          particleCount: clampParticles(num(base.particleCount, DEFAULTS.params.particleCount)),
        };
        set({ presetId: id, params: merged });
      },

      // Cycle through the curated preset list
      cyclePreset: () => {
        const idx = PRESET_ORDER.indexOf(get().presetId);
        const next = PRESET_ORDER[(idx + 1) % PRESET_ORDER.length];
        get().setPreset(next);
      },

      toggleHDR: () => set({ hdr: !get().hdr }),
      toggleDimmer: () => set({ dimmer: !get().dimmer }),
    }),
    {
      name: STORE_KEY,
      version: STORE_VERSION,
      storage: createJSONStorage(() => localStorage),

      // Persist only durable choices (not ephemeral flags/functions)
      partialize: (s) => ({
        theme: s.theme,
        hdr: s.hdr,
        dimmer: s.dimmer,
        presetId: s.presetId,
        params: s.params,
      }),

      // v1 -> v2 migration with clamps & safe defaults
      migrate: (persisted: unknown, fromVersion) => {
        if (!persisted || typeof persisted !== "object") return DEFAULTS;

        const src = persisted as Partial<PersistShapeV1>;

        const pid: VizPresetId =
          src?.presetId === "glass-waves" || src?.presetId === "strobe-pulse" ? src.presetId : "nebula";

        const merged: VizState = {
          ...DEFAULTS,
          theme: src?.theme === "system" ? "system" : "dark",
          hdr: Boolean(src?.hdr),
          dimmer: Boolean(src?.dimmer),
          presetId: pid,
          params: {
            ...DEFAULTS.params,
            ...(src?.params || {}),
            intensity: clamp01(num(src?.params?.intensity, DEFAULTS.params.intensity)),
            bloom: clampBloom(num(src?.params?.bloom, DEFAULTS.params.bloom)),
            motionScale: clamp01(num(src?.params?.motionScale, DEFAULTS.params.motionScale)),
            smooth: clamp01(num(src?.params?.smooth, DEFAULTS.params.smooth)),
            baseColor: (src?.params?.baseColor ?? DEFAULTS.params.baseColor) as string,
            reactiveHue: (src?.params?.reactiveHue ?? DEFAULTS.params.reactiveHue) as string,
            accent: (src?.params?.accent ?? DEFAULTS.params.accent) as string,
            particleCount: clampParticles(num(src?.params?.particleCount, DEFAULTS.params.particleCount)),
          },
          hasHydrated: false,
        };

        switch (fromVersion) {
          case 0:
          case 1:
          default:
            return merged;
        }
      },

      // Flip hydration flag + final sanitize after rehydrate completes
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          useVizStore.setState({ ...DEFAULTS, hasHydrated: true });
          return;
        }
        const s = useVizStore.getState();
        useVizStore.setState({
          hasHydrated: true,
          params: {
            ...s.params,
            intensity: clamp01(num(s.params.intensity, DEFAULTS.params.intensity)),
            bloom: clampBloom(num(s.params.bloom, DEFAULTS.params.bloom)),
            motionScale: clamp01(num(s.params.motionScale, DEFAULTS.params.motionScale)),
            smooth: clamp01(num(s.params.smooth, DEFAULTS.params.smooth)),
            particleCount: clampParticles(num(s.params.particleCount, DEFAULTS.params.particleCount)),
          },
        });
      },
    }
  )
);

/* ----------------------------------------------------------------------------
 * Selector helpers (stable primitives -> minimal re-renders)
 * ------------------------------------------------------------------------- */
export const selectHasHydrated = (s: VizState) => s.hasHydrated;
export const selectHDR = (s: VizState) => s.hdr;
export const selectDimmer = (s: VizState) => s.dimmer;
export const selectPresetId = (s: VizState) => s.presetId;
// Prefer selecting individual numbers in UI controls to avoid object identities:
export const selectIntensity = (s: VizState) => s.params.intensity;
export const selectBloom = (s: VizState) => s.params.bloom;
export const selectMotionScale = (s: VizState) => s.params.motionScale;
export const selectSmooth = (s: VizState) => s.params.smooth;
export const selectParticleCount = (s: VizState) => s.params.particleCount;

/* ----------------------------------------------------------------------------
 * Non-React helpers (for render loops, workers, or imperative code)
 * ------------------------------------------------------------------------- */
export const getVizParams = () => useVizStore.getState().params;
export const getVizToggles = () => {
  const { hdr, dimmer } = useVizStore.getState();
  return { hdr, dimmer };
};
export const cyclePreset = () => useVizStore.getState().cyclePreset();
