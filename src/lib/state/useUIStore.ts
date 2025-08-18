// src/lib/state/useUIStore.ts
/**
 * useUIStore
 * -----------------------------------------------------------------------------
 * Purpose
 *  - Centralize ephemeral UI state that does NOT belong to domain stores
 *    (player/viz/settings). Keep it tiny, predictable, and accessibility-first.
 *
 * Scope (Phase 1/2)
 *  - SidePanel open/closed (persisted locally).
 *  - Controls rail pinning (persisted).
 *  - Diagnostics toggle (FPS meter) (persisted).
 *  - Lightweight modal manager for simple in-app overlays (NOT router-level).
 *  - A few layout measurements (topBarHeight) for responsive adjustments.
 *
 * Architecture
 *  - Zustand + persist (localStorage). We partialize persisted keys only.
 *  - Includes `migrate` to silence "couldn't be migrated" warnings across shapes/versions.
 *  - Exposes stable primitive selectors to minimize re-renders.
 *
 * Back-compat
 *  - Earlier builds used `sidebarCollapsed` + `toggleSidebar()`.
 *  - New API is `sidePanelOpen` + `toggleSidePanel()` + `setSidePanelOpen(open)`.
 *  - We migrate persisted data and keep the old actions as no-op wrappers.
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
  // Layout / shells
  sidePanelOpen: boolean;     // NEW canonical flag (true = visible)
  /** @deprecated use sidePanelOpen; kept for migration/rare legacy reads */
  sidebarCollapsed?: boolean; // legacy (true = hidden)

  controlsPinned: boolean;    // keep controls rail visible atop viz
  topBarHeight: number;       // measured in px (ephemeral, not persisted)

  // Diagnostics
  showFps: boolean;           // show FPS overlay

  // Overlays / modals
  modal: UIModal;

  // Actions (canonical)
  setSidePanelOpen: (open: boolean) => void;
  toggleSidePanel: () => void;

  setControlsPinned: (v: boolean) => void;
  toggleControlsPinned: () => void;

  setTopBarHeight: (px: number) => void;

  setShowFps: (v: boolean) => void;
  toggleFps: () => void;

  openModal: (m: UIModal) => void;
  closeModal: () => void;

  /** Reset only ephemeral (non-persisted) bits. */
  resetEphemeral: () => void;

  // Back-compat actions (no-op wrappers that delegate to canonical)
  /** @deprecated use toggleSidePanel */
  toggleSidebar?: () => void;
  /** @deprecated use setSidePanelOpen */
  setSidebarCollapsed?: (v: boolean) => void;
};

/* ----------------------------------------------------------------------------
 * Defaults & persistence
 * ------------------------------------------------------------------------- */

const STORAGE_KEY = "ui-v1";
const STORAGE_VERSION = 3; // bump: introduce sidePanelOpen canonical

/**
 * Default (boot) values. Keep minimal and predictable.
 * Mobile-first collapsed; desktop may auto-open in component on first mount.
 */
const DEFAULTS: UIState = {
  sidePanelOpen: false,
  // legacy shadow value provided for type completeness (not used at runtime)
  sidebarCollapsed: undefined,

  controlsPinned: true,
  topBarHeight: 56,
  showFps: false,
  modal: "none",

  // Filled by store initializer
  setSidePanelOpen: () => {},
  toggleSidePanel: () => {},
  setControlsPinned: () => {},
  toggleControlsPinned: () => {},
  setTopBarHeight: () => {},
  setShowFps: () => {},
  toggleFps: () => {},
  openModal: () => {},
  closeModal: () => {},
  resetEphemeral: () => {},

  // Back-compat placeholders
  toggleSidebar: () => {},
  setSidebarCollapsed: () => {},
};

/**
 * Migration
 *  v1 → v2 (your previous code handled this)
 *  v2 → v3:
 *    - Canonicalize to `sidePanelOpen` (inverse of legacy `sidebarCollapsed`)
 *    - Carry over showFps and controlsPinned
 *    - Do NOT persist/restore ephemeral `modal` and `topBarHeight`
 */
function migrate(persisted: unknown, fromVersion: number): UIState {
  // Start from defaults so ANY missing keys fall back safely.
  const base: UIState = { ...DEFAULTS };

  if (!persisted || typeof persisted !== "object") return base;
  const s = persisted as Partial<Record<keyof UIState, any>>;

  // v1 → v2 mapping existed previously for naming; keep behavior by reading both.
  // v2 → v3 canonicalization happens below.
  // We read both `sidebarCollapsed` and `sidePanelOpen` if present,
  // but prefer explicit `sidePanelOpen` because it's the new canonical flag.
  let sidePanelOpen: boolean | undefined = undefined;

  // If an older persist wrote `sidePanelOpen`, trust it.
  if (typeof (s as any).sidePanelOpen === "boolean") {
    sidePanelOpen = (s as any).sidePanelOpen;
  }

  // Otherwise, infer from legacy `sidebarCollapsed` if available.
  if (typeof (s as any).sidebarCollapsed === "boolean" && sidePanelOpen === undefined) {
    // legacy: collapsed=true meant hidden; open = !collapsed
    sidePanelOpen = !(s as any).sidebarCollapsed;
  }

  // Finalize open flag
  base.sidePanelOpen = sidePanelOpen ?? DEFAULTS.sidePanelOpen;

  // Carry other persisted choices forward
  if (typeof s.controlsPinned === "boolean") base.controlsPinned = s.controlsPinned;
  if (typeof s.showFps === "boolean") base.showFps = s.showFps;

  // Explicitly avoid restoring ephemeral fields
  base.topBarHeight = DEFAULTS.topBarHeight;
  base.modal = "none";

  return base;
}

/* ----------------------------------------------------------------------------
 * Store
 * ------------------------------------------------------------------------- */

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      ...DEFAULTS,

      // Canonical actions
      setSidePanelOpen: (open) => set({ sidePanelOpen: !!open }),
      toggleSidePanel: () => set({ sidePanelOpen: !get().sidePanelOpen }),

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

      // Back-compat shims
      toggleSidebar: () => set({ sidePanelOpen: !get().sidePanelOpen }),
      setSidebarCollapsed: (v: boolean) => set({ sidePanelOpen: !v }),
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
        sidePanelOpen: s.sidePanelOpen, // NEW canonical key
        // keep writing this for one more version window if you want dual-writes:
        // sidebarCollapsed: !s.sidePanelOpen,
        controlsPinned: s.controlsPinned,
        showFps: s.showFps,
      }),

      migrate,
    }
  )
);

/* ----------------------------------------------------------------------------
 * Selectors (stable, primitive returns)
 * ------------------------------------------------------------------------- */

export const selectSidePanelOpen = (s: UIState) => s.sidePanelOpen;
export const selectControlsPinned = (s: UIState) => s.controlsPinned;
export const selectShowFps = (s: UIState) => s.showFps;
export const selectModal = (s: UIState) => s.modal;
export const selectTopBarHeight = (s: UIState) => s.topBarHeight;

/* ----------------------------------------------------------------------------
 * Convenience imperative helpers (non-hook usage)
 * ------------------------------------------------------------------------- */

export function openModal(modal: UIModal) {
  useUIStore.getState().openModal(modal);
}
export function closeModal() {
  useUIStore.getState().closeModal();
}

/** Toggle the SidePanel (e.g., from a keyboard shortcut). */
export function toggleSidePanel() {
  useUIStore.getState().toggleSidePanel();
}

/** Programmatically open/close the SidePanel. */
export function setSidePanelOpen(open: boolean) {
  useUIStore.getState().setSidePanelOpen(open);
}

/** Toggle diagnostics overlay. */
export function toggleFps() {
  useUIStore.getState().toggleFps();
}

/* ----------------------------------------------------------------------------
 * Notes
 * -------------------------------------------------------------------------
 * - Components should subscribe with primitive selectors to avoid rerenders:
 *     const isOpen = useUIStore(selectSidePanelOpen);
 * - SidePanel auto-open-on-desktop (first mount) should be implemented in the
 *   component, not here, to keep the store environment-agnostic and testable.
 * - Back-compat shims let older code paths continue to work while we finish
 *   renaming across the codebase.
 */
