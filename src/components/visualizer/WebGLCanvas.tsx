// src/components/visualizer/WebGLCanvas.tsx
/**
 * DEPRECATED: WebGLCanvas
 * -----------------------------------------------------------------------------
 * This file is a *compatibility shim* to avoid breaking older imports.
 * The single public visualizer canvas for Ethereal Harmony is now:
 *
 *   `SceneCanvas`  (src/components/visualizer/SceneCanvas.tsx)
 *
 * If you still import WebGLCanvas directly, you will get SceneCanvas under the hood.
 * Please migrate imports to:
 *
 *   import SceneCanvas from "@/components/visualizer/SceneCanvas";
 *
 * or, via the barrel:
 *
 *   import { SceneCanvas } from "@/components/visualizer";
 *
 * Notes
 * - We intentionally do NOT re-export WebGLCanvas from the visualizer barrel
 *   to reduce future confusion. This file exists only for short-term back-compat.
 */

import React, { useEffect } from "react";
import SceneCanvas from "./SceneCanvas";

let warned = false;

/** @deprecated Use `SceneCanvas` instead. */
const WebGLCanvas: React.FC<React.ComponentProps<typeof SceneCanvas>> = (props) => {
  if (process.env.NODE_ENV !== "production" && !warned) {
    // eslint-disable-next-line no-console
    console.warn(
      "[Ethereal Harmony] `WebGLCanvas` is deprecated. Use `SceneCanvas` instead: `import SceneCanvas from \"@/components/visualizer/SceneCanvas\"` or `import { SceneCanvas } from \"@/components/visualizer\"`."
    );
    warned = true;
  }
  return <SceneCanvas {...props} />;
};

export default WebGLCanvas;
/** @deprecated Use `SceneCanvas` instead. */
export { WebGLCanvas };
