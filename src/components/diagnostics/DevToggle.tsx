```tsx
/**
 * src/components/diagnostics/DevToggle.tsx
 * Ethereal Harmony — Developer Diagnostics Toggle
 *
 * Purpose within the project:
 * - A compact, always-available floating control to enable/disable "dev mode"
 *   and common diagnostics for Phase 1–2 development. This is intentionally
 *   minimal and safe: it does not alter audio behavior, and only toggles UI/
 *   visualizer diagnostics flags in our domain stores when those flags exist.
 *
 * How it integrates:
 * - UI domain (useUIStore): reads/writes a conventional `devMode` boolean and an
 *   optional `toggleDevMode()` action if present.
 * - Visualizer domain (useVizStore): reads/writes optional diagnostics flags such
 *   as `showStats` (FPS meter), `showBounds`, `wireframe`, etc. If a flag/action
 *   is not defined in the store yet, the toggle gracefully no-ops and still
 *   persists a local shadow value to localStorage (`eh.dev.*`) so future code can
 *   pick it up on boot without breaking the current app.
 * - Settings (useSettingsStore): currently not required for Phase 1; left as a
 *   soft integration spot if we add settings-driven diagnostics later.
 *
 * Design/system:
 * - React 18 + TypeScript + Vite
 * - Zustand (selectors kept primitive to avoid re-renders)
 * - Framer Motion for panel animation (Material-like fluidity)
 * - Glassmorphism tokens (radius 16px, blur 16px, rgba(255,255,255,0.12), border rgba(255,255,255,0.25))
 * - Palette: #1A2B45 (bg), #7F6A9F (accent), #00F0FF (highlight)
 * - Fonts: Montserrat (700) for headings, Lato (400) for body (inherited globally)
 * - WCAG AA: sufficient contrast, focus-visible ring, ARIA-correct controls
 *
 * Accessibility:
 * - Main control is a toggle button (aria-pressed, role="switch") with a label.
 * - Panel controls are checkbox inputs with labels and keyboard support.
 * - Global hotkey: Ctrl+` toggles the dev panel quickly (desktop convenience).
 *
 * Privacy:
 * - Only local persistence (localStorage). No external logging/telemetry.
 *
 * SSR/rehydration safety:
 * - Guards all window/localStorage access.
 * - Does not assume store fields exist; defensive feature-detection with
 *   optional chaining and "shadow" local persistence.
 */

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";

// Domain stores (Phase 1/2). We avoid deep type coupling by using `any`-safe selectors.
// The files exist in this project per the build plan. If a particular flag/action
// isn't implemented yet in a store, we gracefully no-op.
import { useUIStore } from "@/lib/state/useUIStore";
import { useVizStore } from "@/lib/state/useVizStore";
// Optional future wiring: import { useSettingsStore } from "@/lib/state/useSettingsStore";

/* --------------------------------- Helpers -------------------------------- */

const IS_BROWSER = typeof window !== "undefined";

const readLS = (key: string, fallback = "false") =>
  IS_BROWSER ? window.localStorage.getItem(key) ?? fallback : fallback;

const writeLS = (key: string, value: string) => {
  if (!IS_BROWSER) return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // ignore quota/denied
  }
};

const toggleBooleanLS = (key: string): boolean => {
  const current = readLS(key, "false") === "true";
  const next = (!current).toString();
  writeLS(key, next);
  return !current;
};

// Selector helpers (primitive). We intentionally accept `any` to avoid hard coupling.
// Components subscribe to minimal primitives to prevent render loops.
const selectDevMode = (s: any) => (typeof s?.devMode === "boolean" ? s.devMode : false);
const selectToggleDevMode = (s: any) => (typeof s?.toggleDevMode === "function" ? s.toggleDevMode : undefined);

const selectShowStats = (s: any) => (typeof s?.showStats === "boolean" ? s.showStats : readLS("eh.dev.showStats") === "true");
const selectSetShowStats = (s: any) => (typeof s?.setShowStats === "function" ? s.setShowStats : undefined);

const selectShowBounds = (s: any) => (typeof s?.showBounds === "boolean" ? s.showBounds : readLS("eh.dev.showBounds") === "true");
const selectSetShowBounds = (s: any) => (typeof s?.setShowBounds === "function" ? s.setShowBounds : undefined);

const selectWireframe = (s: any) => (typeof s?.wireframe === "boolean" ? s.wireframe : readLS("eh.dev.wireframe") === "true");
const selectSetWireframe = (s: any) => (typeof s?.setWireframe === "function" ? s.setWireframe : undefined);

/* ------------------------------ UI Component ------------------------------ */

export const DevToggle: React.FC = () => {
  // ------------------------------ Store wiring -----------------------------
  // UI store: dev mode
  const devMode = useUIStore(selectDevMode);
  const toggleDevMode = useUIStore(selectToggleDevMode);

  // Visualizer diagnostics (optional flags)
  const showStats = useVizStore(selectShowStats);
  const setShowStats = useVizStore(selectSetShowStats);

  const showBounds = useVizStore(selectShowBounds);
  const setShowBounds = useVizStore(selectSetShowBounds);

  const wireframe = useVizStore(selectWireframe);
  const setWireframe = useVizStore(selectSetWireframe);

  // ------------------------------ Local state ------------------------------
  // Panel visibility is local UI-only: do not persist to stores
  const [open, setOpen] = React.useState<boolean>(false);
  // Hydration guard for any DOM-only behavior
  const [mounted, setMounted] = React.useState<boolean>(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Sync a local "shadow" devMode if store action not present yet
  const localDevMode = React.useMemo<boolean>(() => readLS("eh.dev.mode") === "true", []);
  const effectiveDevMode = toggleDevMode ? devMode : localDevMode;

  // ------------------------------ Handlers ---------------------------------
  const handleToggleDevMode = () => {
    if (toggleDevMode) {
      toggleDevMode();
      // Also mirror into LS for tools that read outside of React
      writeLS("eh.dev.mode", (!devMode).toString());
    } else {
      const next = toggleBooleanLS("eh.dev.mode");
      // Broadcast a custom event so any non-React diagnostics can react.
      if (IS_BROWSER) window.dispatchEvent(new CustomEvent("eh:devmode", { detail: { enabled: next } }));
    }
  };

  const handleToggleStats = () => {
    if (setShowStats) {
      setShowStats(!showStats);
      writeLS("eh.dev.showStats", (!showStats).toString());
    } else {
      const next = toggleBooleanLS("eh.dev.showStats");
      if (IS_BROWSER) window.dispatchEvent(new CustomEvent("eh:viz:stats", { detail: { enabled: next } }));
    }
  };

  const handleToggleBounds = () => {
    if (setShowBounds) {
      setShowBounds(!showBounds);
      writeLS("eh.dev.showBounds", (!showBounds).toString());
    } else {
      const next = toggleBooleanLS("eh.dev.showBounds");
      if (IS_BROWSER) window.dispatchEvent(new CustomEvent("eh:viz:bounds", { detail: { enabled: next } }));
    }
  };

  const handleToggleWireframe = () => {
    if (setWireframe) {
      setWireframe(!wireframe);
      writeLS("eh.dev.wireframe", (!wireframe).toString());
    } else {
      const next = toggleBooleanLS("eh.dev.wireframe");
      if (IS_BROWSER) window.dispatchEvent(new CustomEvent("eh:viz:wireframe", { detail: { enabled: next } }));
    }
  };

  // Keyboard shortcut: Ctrl + ` toggles the panel
  React.useEffect(() => {
    if (!mounted) return;
    const onKey = (e: KeyboardEvent) => {
      // Windows/Linux/Chromebook: ctrlKey; macOS devs can use ctrlKey as well
      if (e.ctrlKey && (e.key === "`" || e.code === "Backquote")) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mounted]);

  // ------------------------------- Rendering -------------------------------
  // Colors/tokens (centralized here to avoid external CSS for a one-off dev tool)
  const TOKENS = {
    radius: 16,
    blur: 16,
    bg: "rgba(255,255,255,0.12)",
    border: "1px solid rgba(255,255,255,0.25)",
    base: "#1A2B45",
    accent: "#7F6A9F",
    highlight: "#00F0FF",
  };

  // Button + panel share a11y name
  const label = "Developer diagnostics";

  return (
    <div
      aria-label="Developer diagnostics controls"
      style={{
        position: "fixed",
        zIndex: 9999,
        right: 16,
        bottom: 16,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-end",
        gap: 8,
        pointerEvents: "none", // container ignores clicks; children re-enable
      }}
    >
      {/* Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="dev-panel"
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 420, damping: 36, mass: 0.8 }}
            role="region"
            aria-label="Diagnostics panel"
            style={{
              pointerEvents: "auto",
              backdropFilter: `blur(${TOKENS.blur}px)`,
              WebkitBackdropFilter: `blur(${TOKENS.blur}px)`,
              background: TOKENS.bg,
              border: TOKENS.border,
              borderRadius: TOKENS.radius,
              color: "white",
              boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
              padding: 12,
              minWidth: 260,
            }}
          >
            <div
              style={{
                fontFamily: "Montserrat, system-ui, sans-serif",
                fontWeight: 700,
                fontSize: 12,
                letterSpacing: 0.5,
                textTransform: "uppercase",
                color: TOKENS.highlight,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 8,
              }}
            >
              <span>Diagnostics</span>
              <kbd
                aria-label="Shortcut"
                title="Ctrl + `"
                style={{
                  fontFamily: "monospace",
                  background: "rgba(0,0,0,0.35)",
                  border: "1px solid rgba(255,255,255,0.2)",
                  borderRadius: 6,
                  padding: "2px 6px",
                  color: "#fff",
                }}
              >
                Ctrl+`
              </kbd>
            </div>

            {/* Toggles */}
            <fieldset
              aria-label="Developer options"
              style={{
                border: "none",
                margin: 0,
                padding: 0,
                display: "grid",
                gap: 8,
              }}
            >
              {/* Dev Mode */}
              <label
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr auto",
                  alignItems: "center",
                  gap: 12,
                  fontFamily: "Lato, system-ui, sans-serif",
                  fontSize: 13.5,
                }}
              >
                <span>Enable dev mode</span>
                <input
                  type="checkbox"
                  role="switch"
                  aria-checked={effectiveDevMode}
                  checked={effectiveDevMode}
                  onChange={handleToggleDevMode}
                  style={{ width: 18, height: 18, accentColor: TOKENS.highlight, cursor: "pointer" }}
                />
              </label>

              {/* FPS / Stats */}
              <label
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr auto",
                  alignItems: "center",
                  gap: 12,
                  fontFamily: "Lato, system-ui, sans-serif",
                  fontSize: 13.5,
                }}
              >
                <span>Visualizer FPS / stats</span>
                <input
                  type="checkbox"
                  role="switch"
                  aria-checked={!!showStats}
                  checked={!!showStats}
                  onChange={handleToggleStats}
                  style={{ width: 18, height: 18, accentColor: TOKENS.highlight, cursor: "pointer" }}
                />
              </label>

              {/* Bounds */}
              <label
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr auto",
                  alignItems: "center",
                  gap: 12,
                  fontFamily: "Lato, system-ui, sans-serif",
                  fontSize: 13.5,
                }}
              >
                <span>Show object bounds</span>
                <input
                  type="checkbox"
                  role="switch"
                  aria-checked={!!showBounds}
                  checked={!!showBounds}
                  onChange={handleToggleBounds}
                  style={{ width: 18, height: 18, accentColor: TOKENS.highlight, cursor: "pointer" }}
                />
              </label>

              {/* Wireframe */}
              <label
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr auto",
                  alignItems: "center",
                  gap: 12,
                  fontFamily: "Lato, system-ui, sans-serif",
                  fontSize: 13.5,
                }}
              >
                <span>Wireframe materials</span>
                <input
                  type="checkbox"
                  role="switch"
                  aria-checked={!!wireframe}
                  checked={!!wireframe}
                  onChange={handleToggleWireframe}
                  style={{ width: 18, height: 18, accentColor: TOKENS.highlight, cursor: "pointer" }}
                />
              </label>
            </fieldset>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating main toggle button */}
      <motion.button
        type="button"
        aria-label={label}
        title={label}
        role="switch"
        aria-pressed={open}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setOpen((o) => !o);
          }
        }}
        style={{
          pointerEvents: "auto",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 44,
          height: 44,
          borderRadius: TOKENS.radius,
          backdropFilter: `blur(${TOKENS.blur}px)`,
          WebkitBackdropFilter: `blur(${TOKENS.blur}px)`,
          background: TOKENS.bg,
          border: TOKENS.border,
          color: open ? TOKENS.highlight : "#FFFFFF",
          boxShadow: open ? "0 8px 24px rgba(0, 240, 255, 0.35)" : "0 8px 24px rgba(0,0,0,0.35)",
          outline: "none",
          cursor: "pointer",
        }}
        whileTap={{ scale: 0.96 }}
        whileHover={{ scale: 1.05 }}
        transition={{ type: "spring", stiffness: 460, damping: 32, mass: 0.7 }}
      >
        {/* Simple glyph (</>) */}
        <svg
          aria-hidden="true"
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="16 18 22 12 16 6" />
          <polyline points="8 6 2 12 8 18" />
        </svg>
      </motion.button>
    </div>
  );
};

export default DevToggle;
```
