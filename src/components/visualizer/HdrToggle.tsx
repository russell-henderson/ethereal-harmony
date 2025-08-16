// src/components/visualizer/HdrToggle.tsx
/**
 * HdrToggle (Phase 2 hotfix)
 * ------------------------------------------------------------
 * Fixes the React 18 "getSnapshot should be cached" warning and
 * max-update-depth loop by:
 *  - Selecting *primitive slices* from Zustand (no object selector).
 *  - Avoiding any state writes during render (writes only in handlers).
 *  - Guarding all formatted values (no `.toFixed` on undefined).
 *
 * A11y:
 *  - Uses a native <button> with role="switch" and aria-checked.
 *  - Focus ring meets our tokens (Radiant Aqua).
 *
 * Design tokens (glass):
 *  - radius: 16px, backdrop-blur: 16px, background: rgba(255,255,255,0.12)
 *  - border: 1px solid rgba(255,255,255,0.25)
 */

import React from "react";
import { useVizStore } from "@/lib/state/useVizStore";

const HdrToggle: React.FC = () => {
  // ✅ Primitive selectors — these snapshots are stable between renders
  const hdr = useVizStore((s) => s.hdr);
  const toggleHDR = useVizStore((s) => s.toggleHDR);

  // Optional: show a small numeric hint without risk of NaN
  // (we use bloom as a proxy here only for display — safe formatting)
  const bloom = useVizStore((s) => s.params.bloom);
  const bloomText = Number.isFinite(bloom) ? (bloom as number).toFixed(2) : "—";

  // ✅ No state writes in render; changes occur *only* in event handlers
  const onToggle = () => toggleHDR();

  return (
    <button
      type="button"
      onClick={onToggle}
      role="switch"
      aria-checked={hdr}
      aria-label={hdr ? "Disable HDR effects" : "Enable HDR effects"}
      className={[
        // Glassmorphism surface
        "inline-flex items-center rounded-[16px] border border-[rgba(255,255,255,0.25)]",
        "bg-[rgba(255,255,255,0.12)] backdrop-blur-[16px] px-3 py-2",
        // Interaction + focus visibility per tokens
        "transition-transform active:scale-[0.98]",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00F0FF]",
        // Subtle state cue
        hdr ? "opacity-100" : "opacity-80",
      ].join(" ")}
    >
      {hdr ? `HDR On (${bloomText})` : "HDR Off"}
    </button>
  );
};

export default HdrToggle;
