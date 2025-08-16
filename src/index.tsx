// src/index.tsx
/**
 * Entry point (Vite + React 18)
 * -----------------------------------------------------------------------------
 * Responsibilities
 * - Bootstraps the React application into #root.
 * - Loads global design tokens and base styles.
 * - Applies a small viewport height fix for mobile browsers (100vh issue).
 * - Keeps StrictMode enabled for dev sanity; our stores/components are designed
 *   to be resilient to double-invoked effects in development.
 * - Wires up Vite HMR for a smooth DX (React Refresh handles component state).
 */

import React from "react";
import ReactDOM from "react-dom/client";

// Global styles: tokens first, then globals (order matters).
import "@/styles/tokens.css";
import "@/styles/globals.css";

// Optional app-level stylesheet(s). Keep lightweight to avoid blocking render.
// If you use index.css for utility classes, import it here.
// import "@/index.css";

import App from "@/app/App";

/** Ensure we have a #root element (Vite template provides this in index.html). */
function ensureRootElement(): HTMLElement {
  const EXISTING = document.getElementById("root");
  if (EXISTING) return EXISTING;

  // In case the host page is missing the container, create one so we can still render.
  const el = document.createElement("div");
  el.id = "root";
  // Use the project's primary background color so we don't flash white.
  el.style.background = "#1A2B45";
  document.body.appendChild(el);
  return el;
}

/**
 * Mobile 100vh fix:
 * Many mobile browsers include the URL bar in the viewport height. We maintain
 * a CSS variable --vh (1% of the current viewport height) that can be used
 * in styles, e.g. height: calc(var(--vh) * 100);
 */
function applyViewportUnitFix() {
  const set = () => {
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty("--vh", `${vh}px`);
  };
  set();
  window.addEventListener("resize", set);
  // Clean up on hot-reload navigation (HMR preserves listeners, but keep it simple)
  if (import.meta && import.meta.hot) {
    import.meta.hot.dispose(() => window.removeEventListener("resize", set));
  }
}

// Bootstrap viewport fix ASAP (before first paint where possible)
applyViewportUnitFix();

/** Mount the React tree. */
const rootEl = ensureRootElement();
const root = ReactDOM.createRoot(rootEl);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

/**
 * Vite HMR glue:
 * React Refresh already handles component hot-swapping; we keep this block to
 * avoid duplicate listeners and allow cleanup logic during module replacement.
 */
if (import.meta && import.meta.hot) {
  import.meta.hot.accept();
  import.meta.hot.dispose(() => {
    // You could clean timers or detach global listeners here if you attach any
    // outside React (we already remove the resize listener above).
  });
}
