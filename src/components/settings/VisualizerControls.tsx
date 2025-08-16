// src/components/settings/VisualizerControls.tsx
/**
 * DEPRECATED: VisualizerControls
 * -----------------------------------------------------------------------------
 * This component previously exposed the quick visualizer controls (Preset/HDR/Dimmer).
 * To reduce duplication, **SettingsPanel** is now the single entry point for both
 * compact toolbar and advanced settings.
 *
 * Migrate imports to:
 *   import SettingsPanel from "@/components/settings/SettingsPanel";
 *
 * For a drop-in replacement (toolbar only), this shim renders:
 *   <SettingsPanel mode="compact" />
 */

import React from "react";
import SettingsPanel from "@/components/settings/SettingsPanel";

/** @deprecated Use `SettingsPanel` instead. */
const VisualizerControls: React.FC = () => {
  if (process.env.NODE_ENV !== "production") {
    // eslint-disable-next-line no-console
    console.warn(
      "[Ethereal Harmony] `VisualizerControls` is deprecated. Use `SettingsPanel` instead."
    );
  }
  return <SettingsPanel mode="compact" />;
};

export default VisualizerControls;
export { VisualizerControls };
