// src/components/settings/SettingsPanel.tsx
/**
 * SettingsPanel
 * -----------------------------------------------------------------------------
 * Unified, single source of truth for visualizer/tooling settings.
 *
 * Why this change?
 * - We previously had multiple “subpanels” (`VisualizerControls`, `EqPanel`,
 *   `AudioDevicePicker`). To avoid duplication and drift, this component now
 *   owns the compact toolbar (Preset/HDR/Dimmer) **and** can optionally render
 *   advanced subpanels (EQ + Output Device) when asked.
 *
 * Usage
 * - AppShell mounts the compact toolbar:
 *     <section className="eh-glass eh-controls-grid" role="toolbar" ...>
 *       <SettingsPanel />   // default: compact
 *     </section>
 *
 * - A full Settings view (later phases) can expand advanced panels:
 *     <SettingsPanel mode="full" />
 *
 * Accessibility
 * - Toolbar controls remain keyboard accessible and labeled.
 * - Advanced panels are wrapped in <details> groups with <summary> buttons,
 *   each with appropriate aria-labels.
 *
 * Styling
 * - This component renders **content only** (no glass wrapper) because AppShell
 *   already provides the container. If you need a standalone usage elsewhere,
 *   wrap it in `.eh-glass` yourself.
 */

import React from "react";
import PresetSelector from "@/components/visualizer/PresetSelector";
import HdrToggle from "@/components/visualizer/HdrToggle";
import DimmerToggle from "@/components/visualizer/DimmerToggle";
import EqPanel from "@/components/settings/EqPanel";
import AudioDevicePicker from "@/components/settings/AudioDevicePicker";

type SettingsPanelProps = {
  /** "compact" (toolbar-only) or "full" (toolbar + advanced panels). */
  mode?: "compact" | "full";
  /** When mode="compact", optionally show the advanced panels inline. */
  showAdvanced?: boolean;
};

const SettingsPanel: React.FC<SettingsPanelProps> = ({ mode = "compact", showAdvanced = false }) => {
  const renderAdvanced = mode === "full" || showAdvanced;

  return (
    <div className="eh-vstack" style={{ gap: "var(--eh-gap-md)" }}>
      {/* --------------------------------------------------------------------
          Toolbar row: Preset / HDR / Dimmer
         ------------------------------------------------------------------ */}
      <div className="eh-hstack" role="group" aria-label="Visualizer quick controls" style={{ gap: 12 }}>
        <PresetSelector />
        <HdrToggle />
        <DimmerToggle />
      </div>

      {/* --------------------------------------------------------------------
          Advanced panels (optional): EQ and Output Device
          - Collapsed by default via <details>, suitable for the compact rail.
         ------------------------------------------------------------------ */}
      {renderAdvanced && (
        <div className="eh-vstack" style={{ gap: "var(--eh-gap-md)" }}>
          <details className="eh-glass" style={{ padding: "var(--eh-gap-md)" }}>
            <summary
              className="eh-hstack"
              role="button"
              aria-label="Toggle equalizer settings"
              style={{ cursor: "pointer", gap: 8 }}
            >
              <span className="eh-title" style={{ fontSize: "var(--eh-fs-md)" }}>
                Equalizer
              </span>
              <span style={{ fontSize: "var(--eh-fs-sm)", color: "var(--eh-text-muted)" }}>
                10-band parametric (optional)
              </span>
            </summary>
            <div style={{ marginTop: "var(--eh-gap-md)" }}>
              <EqPanel />
            </div>
          </details>

          <details className="eh-glass" style={{ padding: "var(--eh-gap-md)" }}>
            <summary
              className="eh-hstack"
              role="button"
              aria-label="Toggle output device selector"
              style={{ cursor: "pointer", gap: 8 }}
            >
              <span className="eh-title" style={{ fontSize: "var(--eh-fs-md)" }}>
                Output Device
              </span>
              <span style={{ fontSize: "var(--eh-fs-sm)", color: "var(--eh-text-muted)" }}>
                Route audio to speakers/headphones
              </span>
            </summary>
            <div style={{ marginTop: "var(--eh-gap-md)" }}>
              <AudioDevicePicker />
            </div>
          </details>
        </div>
      )}
    </div>
  );
};

export default SettingsPanel;
