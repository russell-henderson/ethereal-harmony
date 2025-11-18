// src/components/visualizer/VisualizerToolbar.tsx
/**
 * VisualizerToolbar
 * -----------------------------------------------------------------------------
 * Dedicated visualizer controls strip mounted directly under the top bar
 * and above the split pane, matching the visionboard layout (G region).
 * 
 * Responsibilities:
 * - Preset selector (optional)
 * - HDR toggle and HDR intensity slider or fixed level
 * - Dimmer toggle and dimmer strength control
 * - Bind controls to useVizStore
 * - Integrate reduced motion handling
 * 
 * A11y:
 * - All controls are keyboard accessible
 * - Proper ARIA labels and roles
 * - Reduced motion users see safe defaults
 */

import React, { useState, useEffect } from "react";
import { useVizStore } from "@/lib/state/useVizStore";
import PresetSelector from "./PresetSelector";
import HdrToggle from "./HdrToggle";
import DimmerToggle from "./DimmerToggle";
import { onReducedMotionChange } from "@/lib/utils/ReducedMotion";

const VisualizerToolbar: React.FC = () => {
  const hdr = useVizStore((s) => s.hdr);
  const dimmer = useVizStore((s) => s.dimmer);
  const [isReducedMotion, setIsReducedMotion] = useState(false);

  // Detect reduced motion preference
  useEffect(() => {
    const off = onReducedMotionChange(setIsReducedMotion);
    return off;
  }, []);

  return (
    <div
      className="visualizer-toolbar"
      role="toolbar"
      aria-label="Visualizer controls"
      style={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
        padding: "8px 16px",
        background: "rgba(26, 43, 69, 0.85)",
        backdropFilter: "blur(12px) saturate(120%)",
        borderBottom: "1px solid rgba(255, 255, 255, 0.15)",
        minHeight: "var(--eh-visualizer-toolbar-h, 48px)",
        zIndex: 10,
      }}
    >
      {/* Preset selector */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <PresetSelector />
      </div>

      {/* HDR toggle */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <HdrToggle />
      </div>

      {/* Dimmer toggle */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <DimmerToggle />
      </div>

      {/* Reduced motion indicator (optional, subtle) */}
      {isReducedMotion && (
        <div
          style={{
            fontSize: "12px",
            color: "var(--eh-text-muted)",
            marginLeft: "auto",
            opacity: 0.6,
          }}
          aria-label="Reduced motion active"
        >
          Reduced motion
        </div>
      )}
    </div>
  );
};

export default VisualizerToolbar;

