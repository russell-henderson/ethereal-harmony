// src/lib/state/useSettingsStore.ts
/**
 * useSettingsStore
 * -----------------------------------------------------------------------------
 * A tiny, domain-driven Zustand store for *user settings* and our simple,
 * store-driven view switching. This store is intentionally framework-agnostic
 * and safe to import anywhere.
 *
 * What we keep here (persisted):
 * - theme: "dark" | "system" (default: "dark")
 * - view:  "player" | "settings" | "stream" (default: "player")
 * - reducedMotion: boolean | undefined (undefined => follow system)
 * - vizPreset: "low" | "medium" | "high" | "ultra" (default: "medium")
 * - hdrEnabled: boolean (default: true)
 * - dimmerEnabled: boolean (default: false)
 * - dimmerStrength: number [0..1] (default: 0.25)  // only used if enabled
 * - hotkeysEnabled: boolean (default: true)
 * - showStats: boolean (default: false) // drives the PerfOverlay mount; also dispatches a DOM CustomEvent
 *
 * What we keep here (ephemeral, NOT persisted):
 * - hasHydrated: boolean — allows components to avoid reading incomplete values
 *
 * Why not Context?
 * - Zustand gives us fine-grained selectors, fewer re-renders, and a single
 *   source of truth that any component can read without prop drilling.
 *
 * Persistence details:
 * - We use `zustand/middleware/persist` with a JSON storage pointing at
 *   localStorage. A `migrate` function keeps forward-compat and silences
 *   rehydrate warnings when the shape/version changes.
 * - `onRehydrateStorage` toggles a `hasHydrated` flag so consumers can defer
 *   sensitive reads until hydration completes.
 *
 * Side-effects:
 * - The store updates `<html>` theme classes to keep CSS in sync:
 *     theme === "dark"  => adds .theme-dark, removes .theme-light
 *     theme === "system"=> removes both (globals.css falls back to OS)
 *
 * Interop notes:
 * - SettingsPanel reads/writes: hdrEnabled, dimmerEnabled, vizPreset, showStats.
 * - GlobalHotkeys may read: hotkeysEnabled.
 * - PerfOverlayMount listens to showStats *and/or* the "eh:viz:stats" event.
 */

import { create } from "zustand";
import { persist, createJSONStorage, StateStorage } from "zustand/middleware";

/* ----------------------------------------------------------------------------
 * Local Types (self-contained to avoid external coupling)
 * ------------------------------------------------------------------------- */

export type ThemeMode = "dark" | "system";
export type AppView = "player" | "settings" | "stream";

/** Preset IDs match QualityPresets.ts keys (keep union in sync if you add more). */
export type VizPresetId = "low" | "medium" | "high" | "ultra";

/** Public shape (persisted + actions + ephemeral) */
export interface SettingsState {
  // Persisted
  theme: ThemeMode;
  view: AppView;
  reducedMotion: boolean | undefined;

  vizPreset: VizPresetId;
  hdrEnabled: boolean;
  dimmerEnabled: boolean;
  dimmerStrength: number; // 0..1
  hotkeysEnabled: boolean;
  showStats: boolean;

  // Search (ephemeral, not persisted)
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  hasHydrated: boolean;

  // Actions
  setTheme: (mode: ThemeMode) => void;
  toggleTheme: () => void;

  setView: (view: AppView) => void;

  setReducedMotion: (v: boolean | undefined) => void;

  setVizPreset: (id: VizPresetId) => void;
  setHdrEnabled: (on: boolean) => void;

  setDimmerEnabled: (on: boolean) => void;
  setDimmerStrength: (v: number) => void; // clamps to [0..1]

  setHotkeysEnabled: (on: boolean) => void;

  setShowStats: (on: boolean) => void; // dispatches "eh:viz:stats"
}


const STORAGE_KEY = "eh-settings-v3";
const STORAGE_VERSION = 3;

// Narrow string → valid union helpers (guards bad or stale data)
function normalizeTheme(mode: any): ThemeMode {
  return mode === "system" ? "system" : "dark";
}
function normalizeView(view: any): AppView {
  return view === "settings" || view === "stream" ? view : "player";
}
function normalizePreset(id: any): VizPresetId {
  return id === "low" || id === "high" || id === "ultra" ? id : "medium";
}
function clamp01(n: number): number {
  return Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0;
}

/** Reflect theme class to <html> for CSS tokens in globals.css/tokens.css. */
function applyThemeClass(mode: ThemeMode) {
  if (typeof document === "undefined") return;
  const el = document.documentElement;
  if (mode === "dark") {
    el.classList.add("theme-dark");
    el.classList.remove("theme-light");
  } else {
    // "system": let OS decide by removing explicit classes
    el.classList.remove("theme-dark");
    el.classList.remove("theme-light");
  }
}

/** Fire a tiny DOM event so non-React utilities can listen if needed. */
function dispatchStatsEvent(enabled: boolean) {
  if (typeof window === "undefined") return;
  try {
    window.dispatchEvent(
      new CustomEvent("eh:viz:stats", {
        detail: { enabled },
      })
    );
  } catch {
    // ignore
  }
}

/* ----------------------------------------------------------------------------
 * Defaults
 * ------------------------------------------------------------------------- */

const DEFAULTS: Omit<SettingsState, keyof SettingsState & string> & SettingsState = {
  theme: "dark",
  view: "player",
  reducedMotion: undefined,

  vizPreset: "medium",
  hdrEnabled: true,

  dimmerEnabled: false,
  dimmerStrength: 0.25,

  hotkeysEnabled: true,

  showStats: false,

  searchQuery: "",
  hasHydrated: false,
  setSearchQuery: () => {},

  // Actions (filled in create)
  setTheme: () => {},
  toggleTheme: () => {},
  setView: () => {},
  setReducedMotion: () => {},
  setVizPreset: () => {},
  setHdrEnabled: () => {},
  setDimmerEnabled: () => {},
  setDimmerStrength: () => {},
  setHotkeysEnabled: () => {},
  setShowStats: () => {},
};

/* ----------------------------------------------------------------------------
 * Migration
 *  v1  (historical)   - { mode?, route?, reducedMotion? }
 *  v2  (previous)     - { theme, view, reducedMotion }
 *  v3  (current)      - adds vizPreset, hdrEnabled, dimmerEnabled, dimmerStrength,
 *                       hotkeysEnabled, showStats
 * ------------------------------------------------------------------------- */


/* ----------------------------------------------------------------------------
 * Store
 * ------------------------------------------------------------------------- */

export const useSettingsStore = create(
  persist(
    (set, get) => ({
      theme: DEFAULTS.theme,
      view: DEFAULTS.view,
      reducedMotion: DEFAULTS.reducedMotion,
      vizPreset: DEFAULTS.vizPreset,
      hdrEnabled: DEFAULTS.hdrEnabled,
      dimmerEnabled: DEFAULTS.dimmerEnabled,
      dimmerStrength: DEFAULTS.dimmerStrength,
      hotkeysEnabled: DEFAULTS.hotkeysEnabled,
      showStats: DEFAULTS.showStats,
      searchQuery: DEFAULTS.searchQuery,
      hasHydrated: DEFAULTS.hasHydrated,
      setSearchQuery: (q: string) => set({ searchQuery: q }),
      setTheme: (mode: ThemeMode) => {
        const next = normalizeTheme(mode);
        if (next === get().theme) return;
        set({ theme: next });
        applyThemeClass(next);
      },
      toggleTheme: (): void => {
        const curr = get().theme;
        const next: ThemeMode = curr === "dark" ? "system" : "dark";
        set({ theme: next });
        applyThemeClass(next);
      },
      setView: (view: AppView): void => {
        const v = normalizeView(view);
        if (v !== get().view) set({ view: v });
      },
      setReducedMotion: (v: boolean | undefined): void => {
        if (typeof v === "boolean" || typeof v === "undefined") {
          set({ reducedMotion: v });
        }
      },
      setVizPreset: (id: VizPresetId): void => set({ vizPreset: normalizePreset(id) }),
      setHdrEnabled: (on: boolean): void => set({ hdrEnabled: !!on }),
      setDimmerEnabled: (on: boolean): void => set({ dimmerEnabled: !!on }),
      setDimmerStrength: (v: number): void => set({ dimmerStrength: clamp01(v) }),
      setHotkeysEnabled: (on: boolean): void => set({ hotkeysEnabled: !!on }),
      setShowStats: (on: boolean): void => {
        const enabled = !!on;
        if (enabled === get().showStats) return;
        set({ showStats: enabled });
        dispatchStatsEvent(enabled);
      },
    }),
    {
      name: STORAGE_KEY,
      version: STORAGE_VERSION,
      storage: createJSONStorage((): StateStorage => localStorage),

      // Only persist stable user choices; omit ephemeral flags.
      partialize: (s) => ({
        theme: s.theme,
        view: s.view,
        reducedMotion: typeof s.reducedMotion === "boolean" ? s.reducedMotion : undefined,

        vizPreset: s.vizPreset,
        hdrEnabled: s.hdrEnabled,
        dimmerEnabled: s.dimmerEnabled,
  dimmerStrength: clamp01(s.dimmerStrength ?? DEFAULTS.dimmerStrength),

        hotkeysEnabled: s.hotkeysEnabled,
        showStats: s.showStats,
      }),

      migrate: (persisted: unknown, _version: number): SettingsState => {
        const p = (typeof persisted === 'object' && persisted !== null) ? persisted as Record<string, unknown> : {};
        return {
          ...DEFAULTS,
          theme: typeof p.theme === 'string' ? normalizeTheme(p.theme) : DEFAULTS.theme,
          view: typeof p.view === 'string' ? normalizeView(p.view) : DEFAULTS.view,
          reducedMotion: typeof p.reducedMotion === 'boolean' ? p.reducedMotion as boolean : DEFAULTS.reducedMotion,
          vizPreset: typeof p.vizPreset === 'string' ? normalizePreset(p.vizPreset) : DEFAULTS.vizPreset,
          hdrEnabled: typeof p.hdrEnabled === 'boolean' ? p.hdrEnabled as boolean : DEFAULTS.hdrEnabled,
          dimmerEnabled: typeof p.dimmerEnabled === 'boolean' ? p.dimmerEnabled as boolean : DEFAULTS.dimmerEnabled,
          dimmerStrength: typeof p.dimmerStrength === 'number' ? clamp01(p.dimmerStrength as number) : DEFAULTS.dimmerStrength,
          hotkeysEnabled: typeof p.hotkeysEnabled === 'boolean' ? p.hotkeysEnabled as boolean : DEFAULTS.hotkeysEnabled,
          showStats: typeof p.showStats === 'boolean' ? p.showStats as boolean : DEFAULTS.showStats,
          searchQuery: typeof p.searchQuery === 'string' ? p.searchQuery as string : DEFAULTS.searchQuery,
          hasHydrated: false,
          setSearchQuery: DEFAULTS.setSearchQuery,
          setTheme: DEFAULTS.setTheme,
          toggleTheme: DEFAULTS.toggleTheme,
          setView: DEFAULTS.setView,
          setReducedMotion: DEFAULTS.setReducedMotion,
          setVizPreset: DEFAULTS.setVizPreset,
          setHdrEnabled: DEFAULTS.setHdrEnabled,
          setDimmerEnabled: DEFAULTS.setDimmerEnabled,
          setDimmerStrength: DEFAULTS.setDimmerStrength,
          setHotkeysEnabled: DEFAULTS.setHotkeysEnabled,
          setShowStats: DEFAULTS.setShowStats,
        };
      },

      // Hydration lifecycle to prevent "couldn't be migrated" warnings
      // and to run DOM side-effects (theme classes) once data is ready.
      onRehydrateStorage: () => (state?: Partial<SettingsState>, error?: unknown, _?: unknown, api?: { setState: (state: SettingsState) => void }) => {
        // If error, keep defaults but still mark hydrated to unblock UI.
        if (error) {
          console.warn("[useSettingsStore] Rehydrate error:", error);
        }

        // Coerce and apply theme classes after hydration
        const mode = normalizeTheme(state?.theme);
        applyThemeClass(mode);

        // Guard against missing or out-of-range values from older caches
        const hydrated: SettingsState = {
          ...DEFAULTS,
          hasHydrated: true,
          theme: mode,
          view: normalizeView(state?.view),
          reducedMotion:
            typeof state?.reducedMotion === "boolean" ? state?.reducedMotion : undefined,
          vizPreset: normalizePreset(state?.vizPreset),
          hdrEnabled: typeof state?.hdrEnabled === "boolean" ? state.hdrEnabled : DEFAULTS.hdrEnabled,
          dimmerEnabled: typeof state?.dimmerEnabled === "boolean" ? state.dimmerEnabled : DEFAULTS.dimmerEnabled,
          dimmerStrength: typeof state?.dimmerStrength === "number" ? clamp01(state.dimmerStrength) : DEFAULTS.dimmerStrength,
          hotkeysEnabled: typeof state?.hotkeysEnabled === "boolean" ? state.hotkeysEnabled : DEFAULTS.hotkeysEnabled,
          showStats: typeof state?.showStats === "boolean" ? state.showStats : DEFAULTS.showStats,
          searchQuery: typeof state?.searchQuery === "string" ? state.searchQuery : DEFAULTS.searchQuery,
          setSearchQuery: DEFAULTS.setSearchQuery,
          setTheme: DEFAULTS.setTheme,
          toggleTheme: DEFAULTS.toggleTheme,
          setView: DEFAULTS.setView,
          setReducedMotion: DEFAULTS.setReducedMotion,
          setVizPreset: DEFAULTS.setVizPreset,
          setHdrEnabled: DEFAULTS.setHdrEnabled,
          setDimmerEnabled: DEFAULTS.setDimmerEnabled,
          setDimmerStrength: DEFAULTS.setDimmerStrength,
          setHotkeysEnabled: DEFAULTS.setHotkeysEnabled,
          setShowStats: DEFAULTS.setShowStats,
        };

        if (api && typeof api.setState === 'function') {
          api.setState(hydrated);
        }
      }
    }
  )
);

/* ----------------------------------------------------------------------------
 * Selectors (stable primitives → fewer component re-renders)
 * ------------------------------------------------------------------------- */

export const selectHasHydrated = (s: SettingsState) => s.hasHydrated;

export const selectView = (s: SettingsState) => s.view;
export const selectTheme = (s: SettingsState) => s.theme;

export const selectReducedMotionOverride = (s: SettingsState) => s.reducedMotion;
/** Effective reduced-motion boolean; falls back to system if override is unset. */
export function selectEffectiveReducedMotion(s: SettingsState): boolean {
  if (typeof s.reducedMotion === "boolean") return s.reducedMotion;
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

export const selectVizPreset = (s: SettingsState) => s.vizPreset;
export const selectHdrEnabled = (s: SettingsState) => s.hdrEnabled;

export const selectDimmerEnabled = (s: SettingsState) => s.dimmerEnabled;
export const selectDimmerStrength = (s: SettingsState) => s.dimmerStrength;

export const selectHotkeysEnabled = (s: SettingsState) => s.hotkeysEnabled;
export const selectShowStats = (s: SettingsState) => s.showStats;


/* ----------------------------------------------------------------------------
 * Imperative helpers (non-hook usage)
 * ------------------------------------------------------------------------- */

export const setView = (view: AppView) => useSettingsStore.getState().setView?.(view);
export const setTheme = (mode: ThemeMode) => useSettingsStore.getState().setTheme?.(mode);
export const setReducedMotion = (v: boolean | undefined) =>
  useSettingsStore.getState().setReducedMotion?.(v);

export const setVizPreset = (id: VizPresetId) => useSettingsStore.getState().setVizPreset?.(id);
export const setHdrEnabled = (on: boolean) => useSettingsStore.getState().setHdrEnabled?.(on);

export const setDimmerEnabled = (on: boolean) => useSettingsStore.getState().setDimmerEnabled?.(on);
export const setDimmerStrength = (v: number) => useSettingsStore.getState().setDimmerStrength?.(v);

export const setHotkeysEnabled = (on: boolean) => useSettingsStore.getState().setHotkeysEnabled?.(on);

export const setShowStats = (on: boolean) => useSettingsStore.getState().setShowStats?.(on);
