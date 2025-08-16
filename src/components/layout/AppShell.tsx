// src/components/layout/AppShell.tsx
/**
 * AppShell
 * -----------------------------------------------------------------------------
 * The structural container for the entire Ethereal Harmony SPA.
 *
 * Responsibilities
 * - Provides a consistent, persistent layout scaffold:
 *     • Full-viewport WebGL canvas (non-interactive) behind all UI
 *     • Top bar (header) + left navigation rail (SidePanel)
 *     • Main content area where views/cards render
 * - Hosts global, app-scoped utilities that should be mounted once:
 *     • GlobalHotkeys: keyboard shortcuts (Space/Left/Right, etc.)
 *     • MediaKeyBridge: hardware media keys (play/pause/prev/next)
 *     • PerfOverlayMount: dev performance overlay (FPS), wired to settings
 *
 * A11y & UX
 * - Keeps the WebGL canvas non-interactive via pointer-events: none so it never
 *   steals focus or pointer events from the UI overlay.
 * - Applies ARIA landmarks and ids so skip links can target #main-content.
 * - Uses our glass tokens and layout variables to keep a cohesive aesthetic.
 *
 * Performance
 * - The canvas sits in a fixed layer (z-index 0) to avoid layout thrash.
 * - Foreground UI in a separate stacking context (z-index 1) to keep GPU
 *   compositing predictable.
 *
 * Scope
 * - Pure layout/composition; does not manage business logic or routes beyond
 *   providing a slot for content. View switching is store-driven (Phase 1/2).
 */

import React from "react";

// Core chrome
import TopBar from "@/components/layout/TopBar";
import SidePanel from "@/components/layout/SidePanel";

// Player surface (main content example — additional views render here)
import PlayerCard from "@/components/player/PlayerCard";

// Global utilities (mounted once)
import GlobalHotkeys from "@/components/shortcuts/GlobalHotkeys";
import MediaKeyBridge from "@/components/player/MediaKeyBridge";
import PerfOverlayMount from "@/components/diagnostics/PerfOverlayMount";

// Visualizer (Three.js) — SceneCanvas is our WebGL renderer wrapper
import SceneCanvas from "@/components/visualizer/SceneCanvas";

// Settings rail (compact) — hosts preset/HDR/Dimmer controls
import SettingsPanel from "@/components/settings/SettingsPanel";

/**
 * Inline, token-driven styles for the top-level shell. We keep these minimal to
 * avoid a bespoke stylesheet while still meeting our layout requirements.
 * (globals.css already defines most tokens/utilities we need.)
 */
const styles = {
  root: {
    minHeight: "100vh",
    background: "var(--eh-bg)",
    color: "var(--eh-text)",
  } as React.CSSProperties,

  // Fixed background canvas layer
  canvasLayer: {
    position: "fixed" as const,
    inset: 0,
    zIndex: 0, // behind everything
    pointerEvents: "none" as const, // decorative only
  },

  // Foreground overlay (all interactive UI)
  uiLayer: {
    position: "relative" as const,
    zIndex: 1, // above canvas
    display: "grid",
    gridTemplateRows: "var(--eh-topbar-h) 1fr", // header + content
    minHeight: "100vh",
  },

  // 2-column content grid: side rail + main
  contentGrid: {
    display: "grid",
    gridTemplateColumns: "var(--eh-sidepanel-w) 1fr",
    minHeight: "calc(100vh - var(--eh-topbar-h))",
    gap: "var(--eh-gap-lg)",
    padding: "var(--eh-gap-lg)",
  } as React.CSSProperties,

  aside: {
    paddingBlock: 0,
  },

  main: {
    position: "relative" as const,
    display: "grid",
    gridTemplateRows: "auto 1fr", // controls rail + main content
    gap: "var(--eh-gap-lg)",
    outline: "none",
  } as React.CSSProperties,

  // Compact controls rail that uses our glass tokens
  controls: {
    // .eh-glass + .eh-controls-grid in CSS; we replicate minimal spacing here
    padding: "var(--eh-gap-md)",
  },
};

const AppShell: React.FC = () => {
  return (
    <div style={styles.root}>
      {/* ----------------------------------------------------------------------
          Global once-per-app utilities
          - Keyboard shortcuts: Space/Arrows/… (reads useSettingsStore)
          - Hardware media keys: MediaSession bridge
          - Perf overlay mount: listens to settings flag / DOM event
         ------------------------------------------------------------------- */}
      <GlobalHotkeys />
      <MediaKeyBridge />
      <PerfOverlayMount />

      {/* ----------------------------------------------------------------------
          1) FIXED BACKGROUND LAYER — WebGL (visualizer)
          - Completely non-interactive; does not affect layout or hit-testing.
         ------------------------------------------------------------------- */}
      <div style={styles.canvasLayer} aria-hidden="true">
        <SceneCanvas />
      </div>

      {/* ----------------------------------------------------------------------
          2) FOREGROUND UI OVERLAY — header + content grid
         ------------------------------------------------------------------- */}
      <div style={styles.uiLayer}>
        {/* Header / Top bar (role="banner" is inside TopBar) */}
        <TopBar />

        {/* Content grid: left navigation + main content */}
        <div style={styles.contentGrid}>
          {/* Left navigation / app rail */}
          <aside aria-label="Primary navigation" style={styles.aside}>
            <SidePanel />
          </aside>

          {/* Main column / route host */}
          <main id="main-content" role="main" style={styles.main} tabIndex={-1}>
            {/* Controls rail — compact glass panel with preset/HDR/Dimmer */}
            <section
              className="eh-glass eh-controls-grid"
              style={styles.controls}
              role="toolbar"
              aria-label="Visualizer settings"
            >
              {/* SettingsPanel internally renders the Preset selector, HDR and Dimmer toggles;
                  it is fully keyboard-accessible and uses ARIA semantics. */}
              <SettingsPanel />
            </section>

            {/* Primary view content (Phase 2 shows PlayerCard). Other views will
               mount here based on our store-driven router. */}
            <section aria-label="Player area">
              <PlayerCard />
            </section>
          </main>
        </div>
      </div>
    </div>
  );
};

// Export both named and default for flexible imports
export { AppShell };
export default AppShell;
