// src/components/settings/SettingsPanel.tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { QUALITY_ORDER, type QualityTier } from "@/lib/visualizer/QualityPresets";

// Visualizer state store (domain-driven). We defensively access actions/values
// because early scaffolds may not expose every property yet.
import { useVizStore } from "@/lib/state/useVizStore";

const STORAGE_KEY_STATS = "eh.dev.showStats";

/**
 * SettingsPanel
 * -----------------------------------------------------------------------------
 * Glassmorphism settings surface exposing:
 *  - HDR toggle
 *  - Dimmer toggle (subtle brightness limiter for UI readability)
 *  - Visualizer quality preset select
 *  - "Show stats (FPS)" toggle (persists localStorage and dispatches 'eh:viz:stats')
 *
 * A11y:
 *  - Labeled controls with visible focus styles (eh-focus).
 *  - Keyboard navigable. Uses native inputs for maximum compatibility.
 *
 * Persistence:
 *  - HDR/Dimmer/Preset: persisted by useVizStore (Zustand persist).
 *  - Show stats: persisted to localStorage("eh.dev.showStats").
 *
 * Events:
 *  - Toggling "Show stats" dispatches CustomEvent('eh:viz:stats', {detail:{enabled}})
 *    so the PerfOverlayMount / diagnostics can react immediately.
 */

type ToggleProps = {
  id: string;
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  hint?: string;
};

const ToggleRow: React.FC<ToggleProps> = ({ id, label, checked, onChange, hint }) => (
  <label
    htmlFor={id}
    className="eh-focus"
    style={{
      display: "grid",
      gridTemplateColumns: "1fr auto",
      alignItems: "center",
      gap: 12,
      padding: "10px 12px",
      borderRadius: 12,
      border: "1px solid rgba(255,255,255,0.25)",
      background: "rgba(255,255,255,0.12)",
      cursor: "pointer",
    }}
  >
    <span style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span
        style={{
          fontFamily: 'Lato, ui-sans-serif, system-ui, "Segoe UI", Roboto',
          fontSize: 14,
          color: "rgba(255,255,255,0.95)",
        }}
      >
        {label}
      </span>
      {hint ? (
        <span
          style={{
            fontFamily: 'Lato, ui-sans-serif, system-ui, "Segoe UI", Roboto',
            fontSize: 12,
            color: "rgba(255,255,255,0.75)",
          }}
        >
          {hint}
        </span>
      ) : null}
    </span>

    <input
      id={id}
      type="checkbox"
      role="switch"
      aria-checked={checked}
      checked={checked}
      onChange={(e) => onChange(e.currentTarget.checked)}
      style={{
        width: 44,
        height: 26,
        appearance: "none",
        WebkitAppearance: "none",
        borderRadius: 999,
        border: "1px solid rgba(255,255,255,0.25)",
        background: checked ? "rgba(0,240,255,0.45)" : "rgba(255,255,255,0.12)",
        position: "relative",
        outline: "none",
        cursor: "pointer",
      }}
      className="eh-focus"
    />
  </label>
);

const SelectRow: React.FC<{
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  hint?: string;
}> = ({ id, label, value, onChange, options, hint }) => (
  <div
    style={{
      display: "grid",
      gridTemplateColumns: "1fr auto",
      alignItems: "center",
      gap: 12,
    }}
  >
    <label htmlFor={id} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span
        style={{
          fontFamily: 'Lato, ui-sans-serif, system-ui, "Segoe UI", Roboto',
          fontSize: 14,
          color: "rgba(255,255,255,0.95)",
        }}
      >
        {label}
      </span>
      {hint ? (
        <span
          style={{
            fontFamily: 'Lato, ui-sans-serif, system-ui, "Segoe UI", Roboto',
            fontSize: 12,
            color: "rgba(255,255,255,0.75)",
          }}
        >
          {hint}
        </span>
      ) : null}
    </label>

    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.currentTarget.value)}
      aria-label={label}
      className="eh-focus"
      style={{
        minWidth: 140,
        height: 34,
        padding: "0 10px",
        borderRadius: 12,
        border: "1px solid rgba(255,255,255,0.25)",
        background: "rgba(255,255,255,0.12)",
        color: "var(--eh-color-text, #FFFFFF)",
        outline: "none",
        fontFamily: 'Lato, ui-sans-serif, system-ui, "Segoe UI", Roboto',
        fontSize: 14,
        cursor: "pointer",
      }}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value} style={{ color: "#000" }}>
          {opt.label}
        </option>
      ))}
    </select>
  </div>
);

const readStatsToggle = (): boolean => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_STATS);
    return raw === "true" || raw === "1";
  } catch {
    return false;
  }
};

const writeStatsToggle = (on: boolean) => {
  try {
    localStorage.setItem(STORAGE_KEY_STATS, on ? "true" : "false");
  } catch {
    /* ignore */
  }
};

const SettingsPanel: React.FC = () => {
  // ----- Viz store bindings (defensive in case some actions don't exist yet)
  const hdr = useVizStore((s) => (s as any).hdr ?? (s as any).hdrEnabled ?? false);
  const setHDR = useVizStore((s) => (s as any).setHDR ?? (s as any).setHdr ?? (() => {}));

  const dimmer = useVizStore((s) => (s as any).dimmer ?? (s as any).dimmerEnabled ?? false);
  const setDimmer =
    useVizStore((s) => (s as any).setDimmer ?? (s as any).setDimmerEnabled ?? (() => {}));

  const qualityTier = useVizStore(
    (s) => ((s as any).qualityTier as QualityTier) ?? ("high" as QualityTier)
  );
  const applyQualityPreset =
    useVizStore((s) => (s as any).applyQualityPreset ?? ((_t: QualityTier) => {}));

  // ----- Stats toggle (persist + dispatch event)
  const [showStats, setShowStats] = useState<boolean>(() => readStatsToggle());

  useEffect(() => {
    writeStatsToggle(showStats);
    try {
      window.dispatchEvent(new CustomEvent("eh:viz:stats", { detail: { enabled: showStats } }));
    } catch {
      /* no-op */
    }
  }, [showStats]);

  // Keep in sync if changed elsewhere (e.g., DevToggle)
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY_STATS) setShowStats(readStatsToggle());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // ----- Options for preset select
  const presetOptions = useMemo(
    () =>
      (QUALITY_ORDER as readonly QualityTier[]).map((t) => ({
        value: t,
        label:
          t === "ultra"
            ? "Ultra"
            : t === "high"
            ? "High"
            : t === "medium"
            ? "Medium"
            : t === "low"
            ? "Low"
            : "Fallback",
      })),
    []
  );

  const handlePreset = useCallback(
    (val: string) => {
      const tier = (val as QualityTier) ?? "high";
      applyQualityPreset(tier);
    },
    [applyQualityPreset]
  );

  return (
    <motion.section
      aria-label="Settings"
      className="eh-glass"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 6 }}
      transition={{ type: "spring", stiffness: 280, damping: 26, mass: 0.9 }}
      style={{
        display: "grid",
        gap: 10,
        padding: 14,
        // Glass tokens
        background: "rgba(255,255,255,0.12)",
        backdropFilter: "blur(16px) saturate(120%)",
        WebkitBackdropFilter: "blur(16px) saturate(120%)",
        border: "1px solid rgba(255,255,255,0.25)",
        borderRadius: 16,
        boxShadow:
          "0 8px 24px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.2)",
        color: "var(--eh-color-text, #FFFFFF)",
      }}
    >
      <header style={{ marginBottom: 2 }}>
        <h2
          style={{
            margin: 0,
            fontFamily: 'Montserrat, ui-sans-serif, system-ui, "Segoe UI", Roboto',
            fontWeight: 700,
            fontSize: 16,
            color: "rgba(255,255,255,0.95)",
          }}
        >
          Settings
        </h2>
      </header>

      {/* HDR */}
      <ToggleRow
        id="eh-set-hdr"
        label="HDR pipeline"
        hint="Enable high-dynamic-range post and tone mapping when supported."
        checked={!!hdr}
        onChange={setHDR}
      />

      {/* Dimmer */}
      <ToggleRow
        id="eh-set-dimmer"
        label="Dimmer"
        hint="Subtly darken bright visuals to preserve UI legibility."
        checked={!!dimmer}
        onChange={setDimmer}
      />

      {/* Preset */}
      <SelectRow
        id="eh-set-preset"
        label="Visualizer preset"
        hint="Choose a quality tier. Adaptive guard may adjust dynamically."
        value={qualityTier}
        onChange={handlePreset}
        options={presetOptions}
      />

      {/* Stats (FPS) */}
      <ToggleRow
        id="eh-set-stats"
        label="Show stats (FPS)"
        hint="Show performance overlay for diagnostics."
        checked={showStats}
        onChange={setShowStats}
      />
    </motion.section>
  );
};

export default SettingsPanel;
