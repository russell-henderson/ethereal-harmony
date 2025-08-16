// src/lib/state/useUIStore.ts
/**
 * useUIStore
 * -----------------------------------------------------------------------------
 * Purpose
 *  - Centralize ephemeral UI state that does NOT belong to domain stores
 *    (player/viz/settings). Keep it tiny, predictable, and accessibility-first.
 *
 * Scope (Phase 1/2)
 *  - Sidebar collapse state (persisted locally, privacy-first).
 *  - Controls rail pinning (persisted).
 *  - Diagnostics toggle (e.g., FPS meter) (persisted).
 *  - Lightweight modal manager for simple in-app overlays (NOT router-level).
 *  - A few layout measurements (topBarHeight) for responsive adjustments.
 *
 * Design
 *  - Zustand + persist (localStorage). We partialize persisted keys only.
 *  - We include a `migrate` function to avoid the "couldn't be migrated"
 *    warning when shapes/versions change.
 *  - We export *stable* selector helpers (return primitives), so components
 *    can subscribe without creating new object identities each render.
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

/* ----------------------------------------------------------------------------
 * Types
 * ------------------------------------------------------------------------- */

export type UIModal =
  | "none"
  | "hotkeys"
  | "about"
  | "stream-wizard"
  | "device-picker";

export type UIState = {
  // Layout
  sidebarCollapsed: boolean; // left nav collapsed?
  controlsPinned: boolean;   // keep the controls rail visible on top of viz
  topBarHeight: number;      // measured in px (ephemeral, not persisted)

  // Diagnostics
  showFps: boolean;          // show FPS meter overlay

  // Overlays / modals
  modal: UIModal;

  // Actions
  setSidebarCollapsed: (v: boolean) => void;
  toggleSidebar: () => void;

  setControlsPinned: (v: boolean) => void;
  toggleControlsPinned: () => void;

  setTopBarHeight: (px: number) => void;

  setShowFps: (v: boolean) => void;
  toggleFps: () => void;

  openModal: (m: UIModal) => void;
  closeModal: () => void;

  /** Reset only ephemeral (non-persisted) bits. */
  resetEphemeral: () => void;
};

/* ----------------------------------------------------------------------------
 * Defaults & persistence
 * ------------------------------------------------------------------------- */

const STORAGE_KEY = "ui-v1";
const STORAGE_VERSION = 2;

/**
 * Default (boot) values. Keep these minimal and predictable.
 */
const DEFAULTS: UIState = {
  sidebarCollapsed: false,
  controlsPinned: true,
  topBarHeight: 56,
  showFps: false,
  modal: "none",

  setSidebarCollapsed: () => {},
  toggleSidebar: () => {},

  setControlsPinned: () => {},
  toggleControlsPinned: () => {},

  setTopBarHeight: () => {},
  setShowFps: () => {},
  toggleFps: () => {},

  openModal: () => {},
  closeModal: () => {},

  resetEphemeral: () => {},
};

/**
 * Migration:
 * Map older shapes/keys to the current schema and guarantee defaults.
 * This keeps Zustand from warning about missing migrate().
 */
function migrate(
  persisted: unknown,
  fromVersion: number
): UIState {
  // Start from defaults so ANY missing keys fall back safely.
  const base: UIState = { ...DEFAULTS };

  // If we have no object, return defaults.
  if (!persisted || typeof persisted !== "object") return base;

  const s = persisted as Partial<Record<keyof UIState, any>>;

  // v1 -> v2:
  //  - "collapsedNavigation" (legacy) becomes "sidebarCollapsed"
  //  - carry over showFps & controlsPinned if present
  //  - ignore function fields if they exist in persisted payload
  if (fromVersion <= 1) {
    if (typeof s.sidebarCollapsed === "boolean") base.sidebarCollapsed = s.sidebarCollapsed;
    else if (typeof (s as any).collapsedNavigation === "boolean")
      base.sidebarCollapsed = (s as any).collapsedNavigation;

    if (typeof s.controlsPinned === "boolean") base.controlsPinned = s.controlsPinned;
    if (typeof s.showFps === "boolean") base.showFps = s.showFps;
    // modal/topBarHeight are ephemeral; do not migrate persisted values for them.
    return base;
  }

  // Future versions can be handled here, always returning a FULL UIState object.
  return base;
}

/* ----------------------------------------------------------------------------
 * Store
 * ------------------------------------------------------------------------- */

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      ...DEFAULTS,

      setSidebarCollapsed: (v) => set({ sidebarCollapsed: !!v }),
      toggleSidebar: () => set({ sidebarCollapsed: !get().sidebarCollapsed }),

      setControlsPinned: (v) => set({ controlsPinned: !!v }),
      toggleControlsPinned: () => set({ controlsPinned: !get().controlsPinned }),

      setTopBarHeight: (px) => {
        // Clamp to a sane range to avoid broken layout from bad measurements.
        const clamped = Math.max(32, Math.min(128, Math.floor(px || 0)));
        set({ topBarHeight: clamped });
      },

      setShowFps: (v) => set({ showFps: !!v }),
      toggleFps: () => set({ showFps: !get().showFps }),

      openModal: (m) => set({ modal: m }),
      closeModal: () => set({ modal: "none" }),

      resetEphemeral: () => set({ modal: "none", topBarHeight: DEFAULTS.topBarHeight }),
    }),
    {
      name: STORAGE_KEY,
      version: STORAGE_VERSION,
      storage: createJSONStorage(() => localStorage),

      /**
       * Persist only the user *choices* that should stick across sessions.
       * Do NOT persist ephemeral bits like modal/topBarHeight.
       */
      partialize: (s) => ({
        sidebarCollapsed: s.sidebarCollapsed,
        controlsPinned: s.controlsPinned,
        showFps: s.showFps,
      }),

      migrate,
    }
  )
);

/* ----------------------------------------------------------------------------
 * Selector helpers (stable, primitive returns)
 * ------------------------------------------------------------------------- */
/**
 * IMPORTANT: Exporting small, primitive selectors helps consumers avoid
 * re-renders and React's "getSnapshot should be cached" warnings that can
 * happen when selectors return new object identities every render.
 */
export const selectSidebarCollapsed = (s: UIState) => s.sidebarCollapsed;
export const selectControlsPinned = (s: UIState) => s.controlsPinned;
export const selectShowFps = (s: UIState) => s.showFps;
export const selectModal = (s: UIState) => s.modal;
export const selectTopBarHeight = (s: UIState) => s.topBarHeight;

/* ----------------------------------------------------------------------------
 * Convenience imperative helpers (non-hook usage)
 * ------------------------------------------------------------------------- */

/** Programmatically open a modal. */
export function openModal(modal: UIModal) {
  useUIStore.getState().openModal(modal);
}

/** Programmatically close any modal. */
export function closeModal() {
  useUIStore.getState().closeModal();
}

/** Toggle the sidebar (e.g., from a keyboard shortcut). */
export function toggleSidebar() {
  useUIStore.getState().toggleSidebar();
}

/** Toggle diagnostics overlay. */
export function toggleFps() {
  useUIStore.getState().toggleFps();
}
