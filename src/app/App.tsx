// src/app/App.tsx
import React, { useEffect, useRef } from "react";
import { ErrorProvider } from "./providers/ErrorProvider";
import { MotionProvider } from "./providers/MotionProvider";
import { ThemeProvider } from "./providers/ThemeProvider";
import { AppShell } from "@/components/layout/AppShell";
import Toasts from "@/components/feedback/Toasts";
import { useHotkeys } from "@/lib/utils/useHotkeys";
import { usePlayerStore } from "@/lib/state/usePlayerStore";
import { setPlaybackState, setPositionState } from "@/lib/utils/MediaSession";

/**
 * App
 * -----------------------------------------------------------------------------
 * Root composition for providers and the main layout.
 * - Wires global hotkeys to the player store (with tolerant fallbacks).
 * - Syncs Media Session playback + position state for OS integrations.
 * - Mounts Toasts once for global notifications.
 */

// ---- Store selectors (primitive for low re-render cost) ---------------------
function usePlayerSelectors() {
  const isPlaying = usePlayerStore((s: any) =>
    typeof s.isPlaying === "boolean" ? s.isPlaying : s.playbackState === "playing"
  );
  const play = usePlayerStore((s: any) => s.play ?? s.playAsync);
  const pause = usePlayerStore((s: any) => s.pause);
  const toggle = usePlayerStore((s: any) => s.toggle ?? s.togglePlay);
  const seek = usePlayerStore((s: any) => s.seek ?? s.seekTo);
  const currentTime = usePlayerStore((s: any) => s.currentTime ?? s.position ?? 0);
  const duration = usePlayerStore((s: any) => s.duration ?? 0);
  const playbackRate = usePlayerStore((s: any) => s.playbackRate ?? 1);
  const volume = usePlayerStore((s: any) => (typeof s.volume === "number" ? s.volume : 1));
  const setVolume = usePlayerStore((s: any) => s.setVolume as ((v: number) => void) | undefined);
  const muted = usePlayerStore((s: any) => Boolean(s.muted));
  const toggleMute = usePlayerStore((s: any) => s.toggleMute as (() => void) | undefined);
  return {
    isPlaying,
    play,
    pause,
    toggle,
    seek,
    currentTime,
    duration,
    playbackRate,
    volume,
    setVolume,
    muted,
    toggleMute,
  };
}

export const App: React.FC = () => {
  const {
    isPlaying,
    play,
    pause,
    toggle,
    seek,
    currentTime,
    duration,
    playbackRate,
    volume,
    setVolume,
    toggleMute,
  } = usePlayerSelectors();

  // ---- Global hotkeys -------------------------------------------------------
  useHotkeys({
    " ": (e) => {
      e.preventDefault();
      // Prefer store toggle if present
      if (typeof toggle === "function") toggle();
      else if (isPlaying) pause?.();
      else play?.();
    },
    arrowleft: (e) => {
      e.preventDefault();
      if (typeof seek === "function") seek(Math.max(0, (currentTime || 0) - 5));
    },
    arrowright: (e) => {
      e.preventDefault();
      if (typeof seek === "function") seek(Math.min(duration || Infinity, (currentTime || 0) + 5));
    },
    arrowup: (e) => {
      e.preventDefault();
      if (typeof setVolume === "function") setVolume(Math.min(1, (volume || 0) + 0.05));
    },
    arrowdown: (e) => {
      e.preventDefault();
      if (typeof setVolume === "function") setVolume(Math.max(0, (volume || 0) - 0.05));
    },
    m: () => {
      if (typeof toggleMute === "function") toggleMute();
      else if (typeof setVolume === "function") setVolume((volume || 0) > 0 ? 0 : 0.8);
    },
    // R, S, T, P reserved for later phases
  });

  // ---- Media Session sync (state + position) --------------------------------
  // Playback state (playing/paused)
  useEffect(() => {
    setPlaybackState(isPlaying ? "playing" : "paused");
  }, [isPlaying]);

  // Position state (duration/position/rate). Throttled to ~2Hz to avoid churn.
  const posTickRef = useRef<number | null>(null);
  useEffect(() => {
    if (posTickRef.current) window.clearInterval(posTickRef.current);
    posTickRef.current = window.setInterval(() => {
      setPositionState({
        duration: Number.isFinite(duration) ? duration : undefined,
        position: Number.isFinite(currentTime) ? currentTime : undefined,
        playbackRate: Number.isFinite(playbackRate) ? playbackRate : undefined,
      });
    }, 500);
    return () => {
      if (posTickRef.current) window.clearInterval(posTickRef.current);
      posTickRef.current = null;
    };
  }, [duration, currentTime, playbackRate]);

  return (
    <ThemeProvider>
      <MotionProvider>
        <ErrorProvider>
          <AppShell />
          {/* Global toasts (mount once) */}
          <Toasts />
        </ErrorProvider>
      </MotionProvider>
    </ThemeProvider>
  );
};

export default App;
