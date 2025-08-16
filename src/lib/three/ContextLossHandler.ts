// src/lib/three/ContextLossHandler.ts
// Purpose: Robustly handle WebGL context loss & restoration.
// Usage:
//   const detach = attachContextLossHandler(renderer, {
//     onLoss: () => pauseRenderLoop(),
//     onRestore: async () => { await rebuildPipelines(); resumeRenderLoop(); },
//   });
//   // later: detach()

import type * as THREE from "three";

export type ContextLossCallbacks = {
  /** Fired immediately when the browser reports a context loss. */
  onLoss?: () => void | Promise<void>;
  /** Fired after the browser reports a context restore. Recreate FBOs, materials, and composer here. */
  onRestore?: () => void | Promise<void>;
};

/**
 * Attach loss/restore listeners to a renderer's canvas.
 * Prevents default on loss to allow restoration and provides a single detach() cleanup.
 */
export const attachContextLossHandler = (
  renderer: THREE.WebGLRenderer,
  callbacks: ContextLossCallbacks = {}
): (() => void) => {
  const el = renderer.domElement;

  const handleLoss = (e: Event) => {
    // Prevent default so the browser will try to restore automatically.
    if (typeof (e as any).preventDefault === "function") {
      (e as any).preventDefault();
    }
    console.warn("[EtherealHarmony] WebGL context lost");
    callbacks.onLoss?.();
  };

  const handleRestore = () => {
    console.info("[EtherealHarmony] WebGL context restored");
    // Important: renderer state may be reset; caller must recreate render targets/passes/materials.
    callbacks.onRestore?.();
  };

  el.addEventListener("webglcontextlost", handleLoss as EventListener, false);
  el.addEventListener("webglcontextrestored", handleRestore as EventListener, false);

  // Return a disposer to remove listeners when tearing down the renderer.
  return () => {
    el.removeEventListener("webglcontextlost", handleLoss as EventListener, false);
    el.removeEventListener("webglcontextrestored", handleRestore as EventListener, false);
  };
};

/**
 * Programmatically nudge the driver to simulate pressure. Some browsers ignore it.
 * Safe no-op if the extension is unavailable.
 */
export const tryLoseContext = (renderer: THREE.WebGLRenderer): boolean => {
  // @ts-expect-error - the extension type is not in TS DOM lib.
  const ext = renderer.getContext().getExtension?.("WEBGL_lose_context");
  if (ext?.loseContext) {
    ext.loseContext();
    return true;
  }
  return false;
};

/**
 * Attempt to restore a previously lost context (for testing).
 */
export const tryRestoreContext = (renderer: THREE.WebGLRenderer): boolean => {
  // @ts-expect-error - the extension type is not in TS DOM lib.
  const ext = renderer.getContext().getExtension?.("WEBGL_lose_context");
  if (ext?.restoreContext) {
    ext.restoreContext();
    return true;
  }
  return false;
};
