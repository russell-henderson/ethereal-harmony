/**
 * Visualizer preset selector
 * - Keyboard friendly segmented control with roving behavior via left/right arrows
 * - Uses Zustand store for reading active preset and setting next preset
 * - Exports a default component, which the barrel re-exports as a named symbol
 */

import React, { useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import { useVizStore } from "@/lib/state/useVizStore";
import type { VizPresetName } from "@/lib/three/VisualizerParams";

const PresetSelector: React.FC = () => {
  // Read active preset and setter from store
  const preset = useVizStore((s) => s.preset);
  const setPreset = useVizStore((s) => s.setPreset);

  // Get list once via getState to avoid unnecessary renders
  const presets = useMemo(() => {
    try {
      const list = useVizStore.getState().getPresetList?.() ?? [];
      return Array.isArray(list) ? list : [];
    } catch {
      return [];
    }
  }, []);

  // If list is empty, do not render a broken control
  if (!presets.length) return null;

  // Arrow left/right to move selection
  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      e.preventDefault();
      const idx = presets.indexOf(preset);
      const dir = e.key === "ArrowRight" ? 1 : -1;
      const next = presets[(idx + dir + presets.length) % presets.length];
      setPreset(next as VizPresetName);
    },
    [presets, preset, setPreset]
  );

  return (
    <div
      role="radiogroup"
      aria-label="Visualizer preset"
      className="eh-segment"
      onKeyDown={onKeyDown}
    >
      {presets.map((name) => {
        const selected = name === preset;
        return (
          <motion.button
            key={name}
            role="radio"
            aria-checked={selected}
            aria-label={name}
            className={`eh-segment__item ${selected ? "is-selected" : ""}`}
            onClick={() => setPreset(name as VizPresetName)}
            whileTap={{ scale: 0.98 }}
          >
            {name}
            <span className="sr-only">{selected ? "selected" : ""}</span>
          </motion.button>
        );
      })}
    </div>
  );
};

export default PresetSelector;
