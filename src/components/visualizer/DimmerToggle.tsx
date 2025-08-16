// src/components/visualizer/DimmerToggle.tsx
/**
 * DimmerToggle (Phase 2 hotfix)
 * ------------------------------------------------------------
 * Mirrors the HdrToggle fix:
 *  - Uses primitive Zustand selectors (no object creation in selector).
 *  - No state writes during render; event handler only.
 *  - Provides accessible toggle semantics with role="switch".
 *
 * The "dimmer" flag is used by the scene to reduce intensity/brightness
 * without fully disabling the visualizer — helpful for reading UI.
 */

import React from "react";
import { useVizStore } from "@/lib/state/useVizStore";

const DimmerToggle: React.FC = () => {
  // ✅ Stable primitive selectors
  const dimmer = useVizStore((s) => s.dimmer);
  const toggleDimmer = useVizStore((s) => s.toggleDimmer);

  const onToggle = () => toggleDimmer();

  return (
    <button
      type="button"
      onClick={onToggle}
      role="switch"
      aria-checked={dimmer}
      aria-label={dimmer ? "Disable dimmer" : "Enable dimmer"}
      className={[
        "inline-flex items-center rounded-[16px] border border-[rgba(255,255,255,0.25)]",
        "bg-[rgba(255,255,255,0.12)] backdrop-blur-[16px] px-3 py-2",
        "transition-transform active:scale-[0.98]",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00F0FF]",
        dimmer ? "opacity-100" : "opacity-80",
      ].join(" ")}
    >
      {dimmer ? "Dimmer On" : "Dimmer Off"}
    </button>
  );
};

export default DimmerToggle;
