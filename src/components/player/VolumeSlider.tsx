// src/components/player/VolumeSlider.tsx
/**
 * VolumeSlider
 * -----------------------------------------------------------------------------
 * Phase 2 volume control.
 * - Uses primitive store selectors to minimize re-renders.
 * - Accepts either `muted/toggleMute/setMuted` or just `volume/setVolume`.
 * - Normalizes value to [0, 1], shows a live percent readout for a11y.
 */

import React, { useMemo, useRef } from "react";
import { usePlayerStore } from "@/lib/state/usePlayerStore";

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

/** Choose an icon based on the effective volume (0..1). */
function useVolumeIcon(vol: number, muted: boolean): string {
  if (muted || vol === 0) return "🔇";
  if (vol < 0.34) return "🔈";
  if (vol < 0.67) return "🔉";
  return "🔊";
}

const VolumeSlider: React.FC = () => {
  // --- Store slices (primitive selectors keep renders cheap) -----------------
  const volume = usePlayerStore((s: any) => (typeof s.volume === "number" ? s.volume : 1));
  const setVolume = usePlayerStore((s: any) => s.setVolume as ((v: number) => void) | undefined);

  const muted = usePlayerStore((s: any) => Boolean(s.muted));
  const toggleMute = usePlayerStore((s: any) => s.toggleMute as (() => void) | undefined);
  const setMuted = usePlayerStore((s: any) => s.setMuted as ((v: boolean) => void) | undefined);

  // --- Local helpers ---------------------------------------------------------
  const lastNonZeroRef = useRef(0.8); // fallback when unmuting without store support
  const safeVol = clamp01(Number.isFinite(volume) ? volume : 1);
  const effectiveVol = muted ? 0 : safeVol;
  const icon = useVolumeIcon(effectiveVol, muted);

  // Precompute percentage text for screen readers
  const pctText = useMemo(() => `${Math.round(effectiveVol * 100)}%`, [effectiveVol]);

  // --- Handlers --------------------------------------------------------------
  const onChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const next = clamp01(parseFloat(e.currentTarget.value));
    // If the store exposes mute controls, unmute on user interaction
    if (muted && (setMuted || toggleMute)) {
      if (setMuted) setMuted(false);
      else toggleMute?.();
    }
    if (next > 0) lastNonZeroRef.current = next;
    setVolume?.(next);
  };

  const onToggleMute = () => {
    // Prefer store mute API if available
    if (toggleMute) {
      toggleMute();
      return;
    }
    if (setMuted) {
      setMuted(!muted);
      return;
    }
    // Fallback: emulate mute by setting volume to 0 / restoring last value
    if (effectiveVol === 0) {
      setVolume?.(lastNonZeroRef.current);
    } else {
      lastNonZeroRef.current = safeVol || lastNonZeroRef.current;
      setVolume?.(0);
    }
  };

  return (
    <div className="eh-hstack items-center" style={{ gap: 8 }} role="group" aria-label="Volume">
      {/* Mute toggle (button) */}
      <button
        type="button"
        className="eh-btn eh-btn--glass eh-btn--icon"
        aria-label={muted ? "Unmute" : "Mute"}
        aria-pressed={muted}
        onClick={onToggleMute}
        title={muted ? "Unmute" : "Mute"}
      >
        <span aria-hidden="true">{icon}</span>
      </button>

      {/* Slider */}
      <label className="sr-only" htmlFor="eh-volume">
        Volume
      </label>
      <input
        id="eh-volume"
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={effectiveVol}
        onChange={onChange}
        aria-valuemin={0}
        aria-valuemax={1}
        aria-valuenow={Number.isFinite(effectiveVol) ? Number(effectiveVol.toFixed(2)) : 0}
        aria-valuetext={pctText}
        aria-label="Volume control"
        className="eh-volume-slider"
        style={{
          accentColor: "var(--eh-highlight, #00F0FF)",
          width: 120,
          cursor: "pointer",
        }}
      />

      {/* Percent readout for quick visual confirmation */}
      <output
        htmlFor="eh-volume"
        className="tabular-nums"
        aria-live="polite"
        style={{ minWidth: 36, textAlign: "right" }}
      >
        {pctText}
      </output>
    </div>
  );
};

export { VolumeSlider };
export default VolumeSlider;
