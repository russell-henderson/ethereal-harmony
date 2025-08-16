// src/components/visualizer/SceneCanvas.tsx
import React, { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { useVizStore } from "@/lib/state/useVizStore";
import {
  type QualityTier,
  getPresetForTier,
} from "@/lib/visualizer/QualityPresets";

/**
 * SceneCanvas
 * -----------------------------------------------------------------------------
 * React wrapper for Three.js renderer/canvas lifecycle.
 *
 * Responsibilities:
 *  - Create and own a single THREE.WebGLRenderer instance (alpha, no MSAA).
 *  - Handle responsive sizing (ResizeObserver) and DPR capping.
 *  - Apply resolutionScale derived from QualityPresets/useVizStore.
 *  - Pause the animation loop when the tab is hidden (battery/perf).
 *  - Expose `onRendererReady` and `onFrame` hooks for Scene/Controller code.
 *
 * Notes:
 *  - Antialiasing: We keep `antialias: false` here; FXAA/TAA is expected to be
 *    handled by a post-processing pipeline (renderer layer) for consistency.
 *  - HDR: The renderer toggles will be applied in Scene/Controller; here we only
 *    expose the renderer and manage the core loop + sizing + DPR.
 *  - Accessibility: The canvas is marked aria-hidden and contained in a region
 *    with an aria-label for SR users. UI controls live outside this surface.
 *
 * Consumers:
 *  - Typically mounted by a `WebGLCanvas`/`VisualizerRoot` component that creates
 *    a SceneController which receives the renderer via `onRendererReady`.
 */

// --------------------------------- Types -------------------------------------

export interface SceneCanvasProps {
  className?: string;
  style?: React.CSSProperties;

  /**
   * Called once after the renderer is created and attached to the canvas.
   * Use this to construct your Scene/Camera/Controller and keep references.
   */
  onRendererReady?: (renderer: THREE.WebGLRenderer, canvas: HTMLCanvasElement) => void;

  /**
   * Called on every animation frame with delta time (seconds) and renderer.
   * Renderers with their own internal tick can ignore this.
   */
  onFrame?: (dt: number, renderer: THREE.WebGLRenderer) => void;

  /**
   * Force-pause the animation loop (debug/testing). Visibility changes also pause it.
   */
  paused?: boolean;
}

// --------------------------- DPR / Scale Helpers -----------------------------

/**
 * Map a quality tier to a maximum device pixel ratio cap.
 * These values are conservative to protect fill rate on lower tiers.
 */
const DPR_CAP_BY_TIER: Record<QualityTier, number> = {
  ultra: 2.0,
  high: 1.8,
  medium: 1.5,
  low: 1.25,
  fallback: 1.0,
};

/** Clamp helper. */
const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);

/**
 * Compute the effective pixel ratio to apply to the renderer:
 *   effective = clamp(devicePixelRatio, 1, cap) * resolutionScale
 *
 * where cap is derived from the current quality tier and can be overridden by the store.
 */
function computeEffectivePixelRatio(opts: {
  devicePixelRatio: number;
  tier: QualityTier;
  resolutionScale: number;
  storeCap?: number; // optional user/store override
}): number {
  const baseCap = DPR_CAP_BY_TIER[opts.tier] ?? 1.5;
  const cap = Math.max(1, Math.min(4, opts.storeCap ?? baseCap));
  const dpr = clamp(opts.devicePixelRatio, 1, cap);
  const ratio = dpr * clamp(opts.resolutionScale, 0.5, 1.0);
  return Number.isFinite(ratio) ? ratio : 1;
}

// ------------------------------- Component -----------------------------------

const SceneCanvas: React.FC<SceneCanvasProps> = ({
  className,
  style,
  onRendererReady,
  onFrame,
  paused = false,
}) => {
  // DOM refs
  const rootRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Renderer ref (lifetime of the component)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);

  // RAF bookkeeping
  const rafRef = useRef<number | null>(null);
  const lastTRef = useRef<number | null>(null);
  const [webglSupported, setWebglSupported] = useState<boolean>(true);

  // ---------------------------- Store bindings -----------------------------

  // Quality/preset inputs (defensive: fall back to preset defaults if store fields missing)
  const qualityTier = useVizStore(
    (s) => ((s as any).qualityTier as QualityTier) ?? ("high" as QualityTier)
  );
  const pixelRatioMax = useVizStore((s) => (s as any).pixelRatioMax as number | undefined);
  const storeResolutionScale = useVizStore(
    (s) => (s as any).resolutionScale as number | undefined
  );

  // Prefer explicit value from store, otherwise compute from tier.
  const resolutionScale =
    typeof storeResolutionScale === "number"
      ? storeResolutionScale
      : getPresetForTier(qualityTier).resolutionScale;

  // ------------------------------ Lifecycle -------------------------------

  /**
   * Initialize Three.js renderer once on mount.
   */
  useEffect(() => {
    if (typeof window === "undefined") return; // SSR guard
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Detect WebGL support
    try {
      const test = canvas.getContext("webgl2") || canvas.getContext("webgl");
      if (!test) {
        setWebglSupported(false);
        return;
      }
    } catch {
      setWebglSupported(false);
      return;
    }

    // Create renderer (alpha for glass; no MSAA here — use post for AA)
    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: false,
      depth: true,
      stencil: false,
      powerPreference: "high-performance",
      preserveDrawingBuffer: false,
      // failIfMajorPerformanceCaveat can block on some GPUs; omit for broader support
    });

    // Color space and clear
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor(0x000000, 0); // transparent
    renderer.autoClear = true;

    rendererRef.current = renderer;

    // Announce to any diagnostics/scene code listening for the renderer
    try {
      window.dispatchEvent(
        new CustomEvent("eh:viz:renderer:ready", { detail: { renderer, canvas } })
      );
    } catch {
      /* no-op */
    }

    // Notify consumer
    onRendererReady?.(renderer, canvas);

    return () => {
      // Cleanup on unmount
      try {
        if (rafRef.current !== null) {
          cancelAnimationFrame(rafRef.current);
          rafRef.current = null;
        }
        renderer.dispose();
      } catch {
        /* ignore */
      } finally {
        rendererRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * ResizeObserver to fit renderer to container size.
   */
  useEffect(() => {
    if (!rendererRef.current) return;
    const root = rootRef.current;
    if (!root) return;

    const ro = new ResizeObserver(() => {
      const { clientWidth: w, clientHeight: h } = root;
      if (!rendererRef.current) return;
      const dpr = computeEffectivePixelRatio({
        devicePixelRatio: window.devicePixelRatio || 1,
        tier: qualityTier,
        resolutionScale,
        storeCap: pixelRatioMax,
      });
      rendererRef.current.setPixelRatio(dpr);
      rendererRef.current.setSize(Math.max(1, w), Math.max(1, h), false);
    });

    ro.observe(root);

    // Initial size
    const { clientWidth: w, clientHeight: h } = root;
    const dpr = computeEffectivePixelRatio({
      devicePixelRatio: window.devicePixelRatio || 1,
      tier: qualityTier,
      resolutionScale,
      storeCap: pixelRatioMax,
    });
    rendererRef.current.setPixelRatio(dpr);
    rendererRef.current.setSize(Math.max(1, w), Math.max(1, h), false);

    return () => ro.disconnect();
  }, [qualityTier, resolutionScale, pixelRatioMax]);

  /**
   * Also respond to window DPR changes (zoom/monitor switch).
   */
  useEffect(() => {
    if (!rendererRef.current) return;

    const handleResize = () => {
      const root = rootRef.current;
      if (!root || !rendererRef.current) return;
      const dpr = computeEffectivePixelRatio({
        devicePixelRatio: window.devicePixelRatio || 1,
        tier: qualityTier,
        resolutionScale,
        storeCap: pixelRatioMax,
      });
      rendererRef.current.setPixelRatio(dpr);
      rendererRef.current.setSize(root.clientWidth || 1, root.clientHeight || 1, false);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [qualityTier, resolutionScale, pixelRatioMax]);

  /**
   * Visibility handling: pause when hidden, resume when visible.
   */
  const shouldRun = useRef<boolean>(true);
  useEffect(() => {
    const onVis = () => {
      shouldRun.current = document.visibilityState === "visible" && !paused;
      // Reset delta timer to avoid a huge frame after tab returns
      if (shouldRun.current) lastTRef.current = null;
      // Kick the loop if resuming
      if (shouldRun.current && rafRef.current === null) {
        rafRef.current = requestAnimationFrame(loop);
      }
    };
    document.addEventListener("visibilitychange", onVis);
    onVis(); // initialize
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [paused]);

  /**
   * Animation loop: forwards delta to consumer; can be a no-op if consumer renders elsewhere.
   */
  const loop = useCallback(
    (t: number) => {
      rafRef.current = null;
      if (!rendererRef.current) return;

      if (!shouldRun.current || paused) {
        // Stay idle, but keep scheduling a low-frequency check to resume quickly when state flips.
        // (We do not use setTimeout to avoid throttling while hidden.)
        rafRef.current = requestAnimationFrame(loop);
        return;
      }

      const last = lastTRef.current ?? t;
      const dt = Math.min(0.1, Math.max(0, (t - last) / 1000)); // clamp dt to avoid spikes
      lastTRef.current = t;

      try {
        onFrame?.(dt, rendererRef.current);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn("[Ethereal Harmony] onFrame error:", err);
      }

      rafRef.current = requestAnimationFrame(loop);
    },
    [onFrame, paused]
  );

  /**
   * Start the RAF loop once the renderer exists.
   */
  useEffect(() => {
    if (!rendererRef.current) return;
    if (rafRef.current !== null) return;
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [loop]);

  // ------------------------------- Render ---------------------------------

  // If no WebGL, render a minimal placeholder (kept invisible by default).
  const fallback = !webglSupported ? (
    <div
      role="note"
      aria-live="polite"
      style={{
        position: "absolute",
        inset: 0,
        display: "grid",
        placeItems: "center",
        color: "rgba(255,255,255,0.85)",
        fontFamily: 'Lato, ui-sans-serif, system-ui, "Segoe UI", Roboto',
        fontSize: 14,
        background:
          "linear-gradient(135deg, rgba(26,43,69,0.92), rgba(127,106,159,0.85))",
      }}
    >
      WebGL is not supported on this device/browser.
    </div>
  ) : null;

  return (
    <section
      ref={rootRef}
      aria-label="Audio-reactive visualizer"
      className={className}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        overflow: "hidden",
        // Allow UI on top to be interactive by default.
        ...style,
      }}
      data-testid="eh-scene-canvas"
    >
      {/* Three.js draws into this canvas */}
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          display: "block",
          // Keep pointer events passthrough unless a scene needs interaction.
          pointerEvents: "none",
          // Perf hint
          willChange: "transform",
        }}
      />
      {fallback}
    </section>
  );
};

export default SceneCanvas;
