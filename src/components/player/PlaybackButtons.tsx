// src/components/player/PlaybackButtons.tsx
/**
 * PlaybackButtons
 * -----------------------------------------------------------------------------
 * Phase 2 transport controls: Previous, Play/Pause, Next.
 * - Uses primitive Zustand selectors to avoid unnecessary re-renders.
 * - Resilient to store API naming differences (playbackState/status/isPlaying).
 * - Accessible: role="group", clear aria-labels, aria-keyshortcuts for Play/Pause.
 * - Glassmorphism-friendly class names (`eh-btn`, `eh-btn--glass`) for styling.
 */

import React from "react";
import { usePlayerStore } from "@/lib/state/usePlayerStore";

/**
 * Small helpers to read common slices from the store with fallbacks.
 * These guard against slight naming differences across implementations.
 */
function useIsPlaying(): boolean {
  const status = usePlayerStore((s: any) => s.playbackState ?? s.status);
  const isPlayingFlag = usePlayerStore((s: any) => s.isPlaying ?? false);
  if (typeof status === "string") return status === "playing";
  return Boolean(isPlayingFlag);
}

function useIsLoading(): boolean {
  return usePlayerStore((s: any) => Boolean(s.loading || s.isLoading || (s.status === "loading")));
}

function useCanPrev(): boolean {
  return usePlayerStore((s: any) => {
    if (typeof s.canPrev === "boolean") return s.canPrev;
    if (typeof s.hasPrev === "boolean") return s.hasPrev;
    return true; // default permissive
  });
}

function useCanNext(): boolean {
  return usePlayerStore((s: any) => {
    if (typeof s.canNext === "boolean") return s.canNext;
    if (typeof s.hasNext === "boolean") return s.hasNext;
    return true; // default permissive
  });
}

function useControls() {
  const play = usePlayerStore((s: any) => s.play);
  const pause = usePlayerStore((s: any) => s.pause);
  const toggle = usePlayerStore((s: any) => s.togglePlay ?? s.toggle);
  const next = usePlayerStore((s: any) => s.nextTrack ?? s.next);
  const prev = usePlayerStore((s: any) => s.prevTrack ?? s.previous ?? s.prev);
  return { play, pause, toggle, next, prev };
}

const PlaybackButtons: React.FC = () => {
  const isPlaying = useIsPlaying();
  const isLoading = useIsLoading();
  const canPrev = useCanPrev();
  const canNext = useCanNext();
  const { play, pause, toggle, next, prev } = useControls();

  const onPlayPause = () => {
    if (isLoading) return;
    if (typeof toggle === "function") {
      toggle();
    } else if (isPlaying) {
      pause?.();
    } else {
      play?.();
    }
  };

  const onPrev = () => {
    if (!canPrev || isLoading) return;
    prev?.();
  };

  const onNext = () => {
    if (!canNext || isLoading) return;
    next?.();
  };

  return (
    <div
      className="eh-playback-controls"
      role="group"
      aria-label="Playback controls"
      data-testid="playback-buttons"
    >
      {/* Previous */}
      <button
        type="button"
        className="eh-btn eh-btn--glass eh-btn--icon"
        onClick={onPrev}
        disabled={!canPrev || isLoading}
        aria-label="Previous track"
        title="Previous"
      >
        {/* Icon: Previous (double triangle with bar) */}
        <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6 5h2v14H6zM20 6v12L9 12l11-6z" fill="currentColor" />
        </svg>
      </button>

      {/* Play / Pause */}
      <button
        type="button"
        className="eh-btn eh-btn--glass eh-btn--icon eh-btn--primary"
        onClick={onPlayPause}
        disabled={isLoading}
        aria-label={isPlaying ? "Pause" : "Play"}
        aria-keyshortcuts="Space"
        title={isPlaying ? "Pause (Space)" : "Play (Space)"}
        data-state={isPlaying ? "playing" : "paused"}
      >
        {/* Icon: switches between Play and Pause */}
        {isPlaying ? (
          // Pause
          <svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6 5h4v14H6zM14 5h4v14h-4z" fill="currentColor" />
          </svg>
        ) : (
          // Play
          <svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M8 5v14l11-7-11-7z" fill="currentColor" />
          </svg>
        )}
      </button>

      {/* Next */}
      <button
        type="button"
        className="eh-btn eh-btn--glass eh-btn--icon"
        onClick={onNext}
        disabled={!canNext || isLoading}
        aria-label="Next track"
        title="Next"
      >
        {/* Icon: Next (triangle with bar) */}
        <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M16 5h2v14h-2zM4 6l11 6-11 6V6z" fill="currentColor" />
        </svg>
      </button>
    </div>
  );
};

export default PlaybackButtons;
