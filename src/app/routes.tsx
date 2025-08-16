// src/app/routes.tsx
/**
 * routes.tsx — Store-driven view switcher (no React Router)
 * -----------------------------------------------------------------------------
 * Ethereal Harmony keeps routing intentionally simple for V1:
 *  - A tiny registry of "routes" (player, settings, stream).
 *  - The current route lives in our Settings store (useSettingsStore).
 *  - We mirror the route to location.hash for shareable URLs and back/forward.
 *
 * How it's used:
 *  - SidePanel can render nav using `ROUTE_ORDER` / `ROUTES` and call `navigate`.
 *  - AppShell (or any page frame) can render route-specific content via <RouteSwitch/>.
 *  - If you don’t render <RouteSwitch/>, the "player" view still works:
 *      AppShell already contains the visualizer + player UI as the baseline.
 *
 * Design goals:
 *  - Zero external deps
 *  - Safe in StrictMode
 *  - Works without SSR assumptions
 */

import React, { useEffect } from "react";
import { useSettingsStore } from "@/lib/state/useSettingsStore";
import StreamTestWizard from "@/components/streaming/StreamTestWizard";
import EqPanel from "@/components/settings/EqPanel";
import VisualizerControls from "@/components/settings/VisualizerControls";
import AudioDevicePicker from "@/components/settings/AudioDevicePicker";

/* ----------------------------------------------------------------------------
 * Types & constants
 * ------------------------------------------------------------------------- */

/** Route identifiers for Phase 1/2 */
export type RouteId = "player" | "settings" | "stream";

/** Route definition for simple registry-driven navigation */
export type RouteConfig = {
  id: RouteId;
  /** Human label for SidePanel or TopBar menus */
  label: string;
  /** Hash path (no slashes to keep URLs clean): e.g. #settings */
  hash: string;
  /** Optional short description for tooltips */
  description?: string;
  /** Optional icon (text/emoji or JSX); consumers decide how to render */
  icon?: React.ReactNode;
  /** Optional render function for route-specific panels (see <RouteSwitch/>) */
  render?: () => React.ReactNode;
};

/** Canonical order for menus */
export const ROUTE_ORDER: RouteId[] = ["player", "settings", "stream"];

/** Route registry */
export const ROUTES: Record<RouteId, RouteConfig> = {
  player: {
    id: "player",
    label: "Player",
    hash: "player",
    description: "Now Playing & Visualizer",
    icon: "▶",
    // AppShell already renders the Player baseline; keep this empty by default.
    render: () => null,
  },
  settings: {
    id: "settings",
    label: "Settings",
    hash: "settings",
    description: "EQ, devices, and visualizer controls",
    icon: "⚙️",
    render: () => (
      <section
        aria-label="Settings"
        style={{
          display: "grid",
          gap: 12,
          padding: 12,
        }}
      >
        {/* Visualizer controls (HDR/Dimmer/Preset) */}
        <VisualizerControls />

        {/* Equalizer */}
        <EqPanel />

        {/* Output device picker */}
        <AudioDevicePicker />
      </section>
    ),
  },
  stream: {
    id: "stream",
    label: "Stream Tester",
    hash: "stream",
    description: "Validate HLS or direct audio URLs",
    icon: "📡",
    render: () => (
      <div style={{ padding: 12 }}>
        <StreamTestWizard />
      </div>
    ),
  },
};

/* ----------------------------------------------------------------------------
 * Hash <-> Store synchronization
 * ------------------------------------------------------------------------- */

/** Convert a hash string ("#settings") to a RouteId, defaulting to "player". */
export function routeFromHash(hash: string | null | undefined): RouteId {
  const h = (hash || "").replace(/^#/, "").trim().toLowerCase();
  const ids = new Set<RouteId>(ROUTE_ORDER);
  return (h && ids.has(h as RouteId) ? (h as RouteId) : "player");
}

/** Push a new route to the store and URL hash (without reloading). */
export function navigate(id: RouteId) {
  const conf = ROUTES[id];
  if (!conf) return;

  // Update store (single source of truth for the app)
  try {
    const setView = (useSettingsStore.getState() as any).setView as (v: RouteId) => void;
    if (typeof setView === "function") setView(id);
  } catch {
    // ignore: store not ready (rare)
  }

  // Mirror to URL hash for shareable/back-forward navigation
  if (typeof window !== "undefined") {
    const target = `#${conf.hash}`;
    if (window.location.hash !== target) {
      // pushState keeps the stack; users can go back
      window.history.pushState(null, "", target);
    }
  }
}

/**
 * Install listeners to keep store and hash in sync.
 * Call once at app start; safe to call multiple times (idempotent).
 */
export function installHashSync() {
  if (typeof window === "undefined") return;

  // Initialize store from the current hash
  const initial = routeFromHash(window.location.hash);
  try {
    const setView = (useSettingsStore.getState() as any).setView as (v: RouteId) => void;
    const curView = (useSettingsStore.getState() as any).view as RouteId | undefined;
    if (typeof setView === "function" && initial && curView !== initial) {
      setView(initial);
    }
  } catch {
    // ignore
  }

  // Update store on browser navigation (back/forward or manual hash edits)
  const onHash = () => {
    const id = routeFromHash(window.location.hash);
    try {
      const setView = (useSettingsStore.getState() as any).setView as (v: RouteId) => void;
      if (typeof setView === "function") setView(id);
    } catch {
      // ignore
    }
  };

  // Use both 'hashchange' and 'popstate' for robustness across browsers
  window.addEventListener("hashchange", onHash);
  window.addEventListener("popstate", onHash);

  // HMR cleanup
  if ((import.meta as any)?.hot) {
    (import.meta as any).hot.dispose(() => {
      window.removeEventListener("hashchange", onHash);
      window.removeEventListener("popstate", onHash);
    });
  }
}

/* ----------------------------------------------------------------------------
 * React helpers
 * ------------------------------------------------------------------------- */

/**
 * Hook that returns the active RouteId from the store, installing hash sync on mount.
 */
export function useRoute(): RouteId {
  // Install hash sync once when any consumer mounts
  useEffect(() => {
    installHashSync();
  }, []);

  // Our settings store should expose `view` and `setView`
  const view = useSettingsStore((s: any) => (s.view as RouteId) ?? "player");
  return view;
}

/**
 * RouteSwitch — Optional renderer for route-specific panels.
 * This is intentionally small: AppShell already renders the baseline "player"
 * surface. For "settings" and "stream", we render additional content here.
 *
 * Usage:
 *   <main>
 *     ... baseline UI ...
 *     <RouteSwitch />
 *   </main>
 */
export const RouteSwitch: React.FC = () => {
  const id = useRoute();
  const conf = ROUTES[id];
  if (!conf?.render) return null;
  return <>{conf.render()}</>;
};

/**
 * Helper that returns a lightweight list of routes for menus (e.g., SidePanel).
 * The result is stable across renders (except for identity of JSX icons).
 */
export function useRouteList(): Array<Pick<RouteConfig, "id" | "label" | "hash" | "icon" | "description">> {
  // No state here—static registry. This is provided as a hook for API symmetry.
  return ROUTE_ORDER.map((id) => {
    const { label, hash, icon, description } = ROUTES[id];
    return { id, label, hash, icon, description };
  });
};
