// src/components/player/MediaKeyBridge.tsx
/**
 * MediaKeyBridge (Phase 2)
 * -----------------------------------------------------------------------------
 * Bridges hardware/media keys to **PlaybackController** (NOT the raw engine).
 *
 * What it does
 * - Registers Media Session action handlers (play/pause/prev/next/seekto/seek±)
 *   and delegates them to the controller.
 * - Safe on SSR and in browsers without MediaSession (no-ops).
 *
 * Why this exists when PlaybackController also updates MediaSession?
 * - The controller sets metadata and *may* register actions, but this bridge
 *   ensures a single, centralized place in the React tree to bind handlers
 *   and to re-bind them on hot reloads. Both implementations point to the same
 *   controller methods, so there’s no divergence.
 */

import React, { useEffect } from "react";
import playbackController from "@/lib/audio/PlaybackController";

const MediaKeyBridge: React.FC = () => {
  useEffect(() => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;

    const ms = navigator.mediaSession;

    // Helper to guard handler assignments across varying TS DOM lib versions
    const setHandler = (action: any, handler: any) => {
      try {
        // @ts-expect-error - browser types vary
        ms.setActionHandler(action, handler);
      } catch {
        /* ignore */
      }
    };

    // Map actions to controller
    setHandler("play", async () => {
      await playbackController.play();
    });
    setHandler("pause", async () => {
      await playbackController.pause();
    });
    setHandler("previoustrack", async () => {
      await playbackController.prevTrack(true);
    });
    setHandler("nexttrack", async () => {
      await playbackController.nextTrack(true);
    });
    setHandler("seekto", (details: any) => {
      const pos = Number(details?.seekTime ?? 0);
      playbackController.seek(pos);
    });
    setHandler("seekforward", () => playbackController.seekBy(10));
    setHandler("seekbackward", () => playbackController.seekBy(-10));

    // Cleanup: unset handlers on unmount to avoid dangling references
    return () => {
      const clear = (action: any) => setHandler(action, null);
      clear("play");
      clear("pause");
      clear("previoustrack");
      clear("nexttrack");
      clear("seekto");
      clear("seekforward");
      clear("seekbackward");
    };
  }, []);

  // No UI; purely behavioral
  return null;
};

export default MediaKeyBridge;
