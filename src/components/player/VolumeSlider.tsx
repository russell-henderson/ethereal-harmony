// src/components/player/VolumeSlider.tsx
/**
 * VolumeSlider
 * -----------------------------------------------------------------------------
 * Compact volume control (icon + horizontal slider).
 * - Width capped via CSS var (--eh-vol-max, default 180px).
 * - Debounces setVolume to protect main thread during drags.
 * - Supports either mute API (toggleMute/setMuted) or pure volume.
 * - A11y: SR label, live pct readout, correct ARIA values.
 */

import React, { useEffect, useMemo, useRef } from "react";
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

  // --- Locals ----------------------------------------------------------------
  const lastNonZeroRef = useRef(0.8); // fallback when unmuting without store support
  const safeVol = clamp01(Number.isFinite(volume) ? volume : 1);
  const effectiveVol = muted ? 0 : safeVol;
  const icon = useVolumeIcon(effectiveVol, muted);
  const pctText = useMemo(() => `${Math.round(effectiveVol * 100)}%`, [effectiveVol]);

  // Debounce to avoid spamming the audio engine during drags
  const debRef = useRef<number | null>(null);
  const emitVolume = (v: number) => {
    if (!setVolume) return;
    if (debRef.current) window.clearTimeout(debRef.current);
    debRef.current = window.setTimeout(() => setVolume(v), 80) as unknown as number;
  };
  useEffect(() => () => debRef.current && window.clearTimeout(debRef.current), []);

  // --- Handlers --------------------------------------------------------------
  const onChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const next = clamp01(parseFloat(e.currentTarget.value));
    // If the store supports mute, unmute on user interaction
    if (muted && (setMuted || toggleMute)) {
      if (setMuted) setMuted(false);
      else toggleMute?.();
    }
    if (next > 0) lastNonZeroRef.current = next;
    emitVolume(next);
  };

  const onToggleMute = () => {
    if (toggleMute) {
      toggleMute();
      return;
    }
    if (setMuted) {
      setMuted(!muted);
      return;
    }
    // Fallback: emulate mute via volume
    if (effectiveVol === 0) {
      setVolume?.(lastNonZeroRef.current);
    } else {
      lastNonZeroRef.current = safeVol || lastNonZeroRef.current;
      setVolume?.(0);
    }
  };

  const onKeyAdjust: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    const step = e.shiftKey ? 0.1 : 0.02;
    if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
      emitVolume(clamp01(effectiveVol - step));
      e.preventDefault();
    } else if (e.key === "ArrowRight" || e.key === "ArrowUp") {
      emitVolume(clamp01(effectiveVol + step));
      e.preventDefault();
    }
  };

  return (
    <div
      className="eh-volume-shell eh-hstack items-center"
      role="group"
      aria-label="Volume"
      // Layout width should be controlled via CSS var; default to 180px.
      // In tokens or a component stylesheet: .eh-volume-shell { max-inline-size: var(--eh-vol-max, 180px); }
      style={{ gap: 8 }}
    >
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

      {/* Slider (compact) */}
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
        onKeyDown={onKeyAdjust}
        aria-valuemin={0}
        aria-valuemax={1}
        aria-valuenow={Number.isFinite(effectiveVol) ? Number(effectiveVol.toFixed(2)) : 0}
        aria-valuetext={pctText}
        aria-label="Volume control"
        className="eh-volume-slider"
      />

      {/* Percent readout (optional) */}
      <output
        htmlFor="eh-volume"
        className="tabular-nums eh-volume-pct"
        aria-live="polite"
      >
        {pctText}
      </output>
    </div>
  );
};

export { VolumeSlider };
export default VolumeSlider;
