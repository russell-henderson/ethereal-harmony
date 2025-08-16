// src/components/player/TransportBar.tsx
/**
 * TransportBar
 * -----------------------------------------------------------------------------
 * Phase 2 time readout (elapsed / duration) with minimal dependencies.
 * This component intentionally does NOT render playback buttons; those live in
 * `PlaybackButtons.tsx`. TransportBar focuses on displaying timecodes and can
 * be placed above/below the Timeline component.
 */

import React from "react";
import { usePlayerStore } from "@/lib/state/usePlayerStore";

/** Format seconds -> mm:ss (or hh:mm:ss for long tracks) */
function formatTime(totalSeconds?: number): string {
  const s = Number.isFinite(totalSeconds) && totalSeconds! >= 0 ? Math.floor(totalSeconds!) : 0;
  const hours = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = s % 60;

  const pad = (n: number) => String(n).padStart(2, "0");
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${minutes}:${pad(seconds)}`;
}

const TransportBar: React.FC = () => {
  // Select only what we need to minimize re-renders.
  const currentTime = usePlayerStore((s: any) => s.currentTime ?? 0);
  const duration = usePlayerStore((s: any) => s.duration ?? 0);

  // Derived, clamped values to keep UI stable.
  const safeCurrent = Math.max(0, Math.min(Number(currentTime) || 0, Number(duration) || Infinity));
  const safeDuration = Math.max(0, Number(duration) || 0);

  const elapsedText = formatTime(safeCurrent);
  const durationText = safeDuration > 0 ? formatTime(safeDuration) : "--:--";

  return (
    <div
      className="eh-transport eh-hstack"
      role="group"
      aria-label="Transport time"
      style={{
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
      }}
    >
      {/* Elapsed time */}
      <time
        className="eh-time eh-time--elapsed tabular-nums"
        aria-label="Elapsed time"
        dateTime={`PT${Math.floor(safeCurrent)}S`}
      >
        {elapsedText}
      </time>

      {/* Spacer for center alignment if needed by layout */}
      <div aria-hidden />

      {/* Duration */}
      <time
        className="eh-time eh-time--duration tabular-nums"
        aria-label="Track duration"
        dateTime={`PT${Math.floor(safeDuration)}S`}
      >
        {durationText}
      </time>
    </div>
  );
};

export { TransportBar };
export default TransportBar;
