// src/components/shortcuts/GlobalHotkeys.tsx
import React from "react";
import { useHotkeys } from "@/lib/utils/useHotkeys";
import { usePlayerStore } from "@/lib/state/usePlayerStore";

/**
 * GlobalHotkeys
 * -----------------------------------------------------------------------------
 * Small, renderless component that registers global keyboard shortcuts using
 * our shared `useHotkeys` utility. It wires keys into playback controls
 * provided by `usePlayerStore` / PlaybackController.
 *
 * Scope (V1, per request):
 *   - Space: Play/Pause toggle
 *   - Left Arrow: Previous track
 *   - Right Arrow: Next track
 *
 * Behavior details:
 * - `useHotkeys` already guards against firing inside text inputs (per util).
 * - We read the minimal slice from the player store to avoid unnecessary
 *   re-renders and keep the component inert outside of key presses.
 * - We do not render any UI; this component solely binds handlers on mount.
 *
 * Integration:
 * - Mount once near the app root (e.g., in AppShell).
 * - `enableDefaults: true` lets the util register any foundational shortcuts
 *   (e.g., escape to close modals) while we append playback-specific ones via
 *   the `extra` array below.
 */

const clamp = (v: number, min = 0, max = 1) => (v < min ? min : v > max ? max : v);

const GlobalHotkeys: React.FC = () => {
  // Select only what we need from the store to minimize subscriptions.
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const play = usePlayerStore((s) => s.play);
  const pause = usePlayerStore((s) => s.pause);
  const next = usePlayerStore((s) => s.next);
  const prev = usePlayerStore((s) => s.prev);

  // (Optional future hook-ups if desired later)
  // const setVolume = usePlayerStore((s) => s.setVolume);
  // const volume = usePlayerStore((s) => s.volume);

  useHotkeys({
    enableDefaults: true,
    extra: [
      // Space → toggle play/pause
      {
        keys: [" "], // note: a single space denotes Spacebar in our util
        description: "Play/Pause",
        handler: (e: KeyboardEvent) => {
          e.preventDefault(); // prevent page scrolling
          if (isPlaying) pause();
          else play();
        },
      },

      // Left Arrow → previous track
      {
        keys: ["ArrowLeft"],
        description: "Previous track",
        handler: (e: KeyboardEvent) => {
          e.preventDefault();
          prev();
        },
      },

      // Right Arrow → next track
      {
        keys: ["ArrowRight"],
        description: "Next track",
        handler: (e: KeyboardEvent) => {
          e.preventDefault();
          next();
        },
      },

      // ---------------------------------------------------------------------
      // NOTE:
      // The following examples are commented-out stubs for future expansion
      // (kept here for developer convenience). Uncomment to enable when
      // product decisions allow:
      //
      // // Up Arrow → volume up (small step)
      // {
      //   keys: ["ArrowUp"],
      //   description: "Volume up",
      //   handler: (e: KeyboardEvent) => {
      //     e.preventDefault();
      //     const step = 0.05;
      //     setVolume(clamp((usePlayerStore.getState().volume ?? 1) + step));
      //   },
      // },
      //
      // // Down Arrow → volume down (small step)
      // {
      //   keys: ["ArrowDown"],
      //   description: "Volume down",
      //   handler: (e: KeyboardEvent) => {
      //     e.preventDefault();
      //     const step = 0.05;
      //     setVolume(clamp((usePlayerStore.getState().volume ?? 1) - step));
      //   },
      // },
      // ---------------------------------------------------------------------
    ],
  });

  return null;
};

export default GlobalHotkeys;
