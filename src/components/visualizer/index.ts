// src/components/visualizer/index.ts
/**
 * Visualizer Barrel
 * -----------------------------------------------------------------------------
 * PUBLIC CANVAS ENTRY (single source of truth):
 *   - SceneCanvas
 *
 * We intentionally do NOT export `WebGLCanvas` from the barrel to deprecate it.
 * Any legacy code importing `@/components/visualizer/WebGLCanvas` will still work
 * because that file shims to SceneCanvas, but new code should only import SceneCanvas
 * from here.
 */

// Canvas
export { default as SceneCanvas } from "./SceneCanvas";

// (Other visualizer-adjacent controls/components can live here or under settings)
// If you previously exported controls from this barrel, keep them here to avoid churn.
export { default as PresetSelector } from "./PresetSelector";
export { default as HdrToggle } from "./HdrToggle";
export { default as DimmerToggle } from "./DimmerToggle";

// NOTE: WebGLCanvas is intentionally NOT exported from this barrel.
// Please migrate to:
//   import { SceneCanvas } from "@/components/visualizer";
// or
//   import SceneCanvas from "@/components/visualizer/SceneCanvas";
