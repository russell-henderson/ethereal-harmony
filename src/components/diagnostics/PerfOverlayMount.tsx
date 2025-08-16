// src/components/diagnostics/PerfOverlayMount.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";

/**
 * PerfOverlayMount
 * -----------------------------------------------------------------------------
 * React wrapper that mounts/unmounts the *non-React* PerfOverlay based on:
 *   1) A persisted dev toggle in localStorage ("eh.dev.showStats"), and
 *   2) An optional `force` prop to always enable during development sessions.
 *
 * Why a wrapper?
 * - The overlay itself is framework-agnostic (implemented in src/lib/diagnostics/PerfOverlay.ts)
 *   and paints directly to the DOM for minimal overhead. This wrapper simply
 *   decides *when* to mount/unmount it and *where* (a container we own).
 *
 * Persistence contract:
 * - DevToggle writes the boolean preference to localStorage under the key
 *   "eh.dev.showStats". We listen to storage changes so toggling it elsewhere
 *   (DevToggle, another tab) updates the overlay live.
 *
 * Safety:
 * - Dynamic import of the overlay to keep it out of the main bundle (perf).
 * - Duck-typing its API so refactors in PerfOverlay don’t crash the app.
 * - No hard dependency on telemetry or other diagnostics.
 *
 * Accessibility:
 * - The overlay is visual-only and marked aria-hidden. It does not trap focus.
 *
 * Usage:
 *   <PerfOverlayMount />                         // respect saved toggle
 *   <PerfOverlayMount force={import.meta.env.DEV} /> // always on in dev
 */

// -------------------------- Config & Utilities -------------------------------

const STORAGE_KEY = "eh.dev.showStats";

/** Read boolean-ish value from localStorage safely. */
const readStoredEnabled = (): boolean => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    // accept "true", "1", true
    return raw === "true" || raw === "1";
  } catch {
    return false;
  }
};

/** Write persisted value (DevToggle usually does this; included for completeness). */
const writeStoredEnabled = (value: boolean) => {
  try {
    localStorage.setItem(STORAGE_KEY, value ? "true" : "false");
  } catch {
    /* ignore storage failures */
  }
};

// ------------------------------- Types ---------------------------------------

export interface PerfOverlayMountProps {
  /**
   * Force-enable the overlay regardless of stored preference.
   * Useful during development or profiling sessions.
   */
  force?: boolean;

  /**
   * Optional inline style for the container that the non-React overlay mounts to.
   * Usually not needed, as the overlay positions itself (fixed) internally.
   */
  style?: React.CSSProperties;

  /**
   * Optional className for the mount container (not the overlay itself).
   */
  className?: string;
}

// ------------------------------ Component ------------------------------------

const PerfOverlayMount: React.FC<PerfOverlayMountProps> = ({
  force = false,
  style,
  className,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const overlayRef = useRef<any>(null);

  // Local state mirrors persisted toggle (unless `force` overrides it).
  const [persistedOn, setPersistedOn] = useState<boolean>(() => readStoredEnabled());

  // Effective flag combines force + persisted toggle.
  const enabled = useMemo(() => Boolean(force || persistedOn), [force, persistedOn]);

  // Keep in sync with external changes to localStorage (e.g., DevToggle or other tabs).
  useEffect(() => {
    const onStorage = (ev: StorageEvent) => {
      if (ev.key === STORAGE_KEY) {
        setPersistedOn(readStoredEnabled());
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // Mount / unmount overlay when `enabled` changes.
  useEffect(() => {
    let cancelled = false;

    const mount = async () => {
      try {
        // Lazy-load to keep core bundle lean.
        const mod = await import("@/lib/diagnostics/PerfOverlay");
        const OverlayCtor = (mod as any).PerfOverlay ?? (mod as any).default;

        if (!OverlayCtor || cancelled) return;

        // If we already have one, destroy it before creating a new one (defensive).
        if (overlayRef.current?.destroy) {
          try {
            overlayRef.current.destroy();
          } catch {
            /* noop */
          }
          overlayRef.current = null;
        }

        // Create overlay instance. We pass a parent container so it doesn't
        // attach at document.body unless that’s what it prefers.
        const instance = new OverlayCtor({
          parent:
            containerRef.current ??
            // Fallback to body if no container (shouldn't happen in normal flow).
            document.body,
        });

        // Duck-typed lifecycle: support any of start/mount/show as entrypoints.
        if (typeof instance.mount === "function") instance.mount();
        else if (typeof instance.start === "function") instance.start();
        else if (typeof instance.show === "function") instance.show();

        // Keep a reference for cleanup.
        overlayRef.current = instance;

        // Expose in dev tools for quick inspection.
        try {
          (window as any).__EH_PERF_OVERLAY__ = instance;
        } catch {
          /* ignore */
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn("[Ethereal Harmony] Failed to load PerfOverlay:", err);
      }
    };

    const unmount = () => {
      if (!overlayRef.current) return;
      try {
        // Duck-typed cleanup: stop/hide/destroy, whatever is available.
        if (typeof overlayRef.current.destroy === "function") overlayRef.current.destroy();
        else if (typeof overlayRef.current.stop === "function") overlayRef.current.stop();
        else if (typeof overlayRef.current.hide === "function") overlayRef.current.hide();
      } catch {
        /* noop */
      } finally {
        overlayRef.current = null;
      }
    };

    if (enabled) {
      mount();
    } else {
      unmount();
    }

    return () => {
      cancelled = true;
      unmount();
    };
  }, [enabled]);

  // If `force` toggles, mirror the new state into storage so DevToggle UI stays consistent.
  useEffect(() => {
    // Do not overwrite user preference if not forcing.
    if (force) writeStoredEnabled(true);
  }, [force]);

  return (
    // This container is a mounting anchor for the non-React overlay.
    // It is visually inert; the overlay paints its own fixed-position surface.
    <div
      ref={containerRef}
      className={className}
      style={{
        position: "relative",
        // Intentionally non-intrusive: no size; overlay handles its own layout.
        width: 0,
        height: 0,
        // Allow consumers to override if they really want to.
        ...style,
      }}
      aria-hidden="true"
      data-perf-overlay-anchor
    />
  );
};

export default PerfOverlayMount;
