/**
 * src/lib/state/usePlayerStore.ts
 * Ethereal Harmony — Player Store (Zustand, Phase 1 aligned with Phase 2)
 *
 * Responsibilities:
 *  - Source of truth for playback queue + current index only.
 *  - Delegates transport (play/pause/seek/load) to the audio engine's PlaybackController.
 *  - Persists queue and index locally with safe SSR/rehydration behavior.
 *  - Exposes selectors to minimize re-renders.
 *
 * IMPORTANT:
 *  - Do NOT persist transport state (playing, position, volume) — engine owns it.
 *  - Use primitive selectors from this file in components to avoid render loops.
 */

import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { persist, createJSONStorage } from "zustand/middleware";

/* ---------------------------------- Types --------------------------------- */

export type Track = {
  id: string;
  title: string;
  artist: string;
  album?: string;
  url: string;          // media URL or object URL
  artworkUrl?: string;  // data URL or https
  duration?: number;    // seconds (optional; engine may update)
};

type PlayerState = {
  queue: Track[];
  currentIndex: number; // -1 = none selected
  hasHydrated: boolean; // gate UI reads until rehydrate completes

  // Queue management
  setQueue: (tracks: Track[], startIndex?: number) => void;
  addToQueue: (track: Track) => void;
  addManyToQueue: (tracks: Track[]) => void;
  removeFromQueue: (trackId: string) => void;
  clearQueue: () => void;
  setCurrentIndex: (idx: number) => void;
  next: () => void;
  prev: () => void;

  // Transport delegates (engine-owned)
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  seek: (seconds: number) => void;
  playIndex: (idx: number) => void;
};

/* ------------------------- SSR-safe JSON storage -------------------------- */

const storage = createJSONStorage<Partial<PlayerState>>(() => {
  if (typeof window === "undefined") return undefined as unknown as Storage;
  return window.localStorage;
});

/* -------------------- PlaybackController (runtime link) ------------------- */
/**
 * We keep a loose runtime link to the engine. This avoids hard coupling and is
 * SSR-friendly. The engine can optionally expose a global handle:
 *   globalThis.__EH_PLAYBACK
 * or export one of the common names from "@/lib/audio/PlaybackController":
 *   - playback (preferred)
 *   - default
 *   - playbackController
 */
type MaybePlayback = {
  loadAndPlay?: (track: Track) => void | Promise<void>;
  replaceQueue?: (tracks: Track[], startIndex: number) => void | Promise<void>;
  play?: () => void;
  pause?: () => void;
  toggle?: () => void;
  seek?: (seconds: number) => void;
};

let cachedController: MaybePlayback | null = null;

const getPlaybackController = async (): Promise<MaybePlayback | null> => {
  if (cachedController) return cachedController;

  // 1) Global registration (engine may assign this during bootstrap)
  const g = globalThis as Record<string, unknown>;
  if (g && g.__EH_PLAYBACK) {
    cachedController = g.__EH_PLAYBACK as MaybePlayback;
    return cachedController;
  }

  // 2) Dynamic import (code-split friendly)
  try {
  const mod = (await import("@/lib/audio/PlaybackController")) as Record<string, unknown>;
    cachedController =
      (mod?.playback as MaybePlayback) ??
      (mod?.default as MaybePlayback) ??
      (mod?.playbackController as MaybePlayback) ??
      null;
  } catch {
    cachedController = null;
  }
  return cachedController;
};

/** Fire-and-forget helper to interact with the controller when available. */
const withController = (fn: (pc: MaybePlayback) => void) => {
  // Immediate path if already cached/global
  if (cachedController) {
    fn(cachedController);
    return;
  }
  const g = globalThis as Record<string, unknown>;
  if (g && g.__EH_PLAYBACK) {
    cachedController = g.__EH_PLAYBACK as MaybePlayback;
    fn(cachedController);
    return;
  }
  // Defer: load on microtask to keep UI responsive
  queueMicrotask(() => {
    void getPlaybackController().then((pc) => {
      if (pc) fn(pc);
    });
  });
};

/* --------------------------------- Store ---------------------------------- */

export const usePlayerStore = create<PlayerState>()(
  devtools(
    persist(
      (set, get) => ({
        queue: [],
        currentIndex: -1,
        hasHydrated: false,

        /* ------------------------- Queue management ------------------------ */

        setQueue: (tracks, startIndex = 0) => {
          const safeIndex =
            tracks.length === 0 ? -1 : Math.min(Math.max(startIndex, 0), tracks.length - 1);

          set({ queue: [...tracks], currentIndex: safeIndex });

          // Hint engine to adopt queue or load+play current track.
          withController((pc) => {
            if (pc.replaceQueue) {
              pc.replaceQueue(tracks, safeIndex);
              return;
            }
            if (safeIndex >= 0) {
              const t = tracks[safeIndex];
              pc.loadAndPlay?.(t);
            }
          });
        },

        addToQueue: (track) => {
          set((s) => ({ queue: [...s.queue, track] }));
        },

        addManyToQueue: (tracks) => {
          if (!tracks?.length) return;
          set((s) => ({ queue: [...s.queue, ...tracks] }));
        },

        removeFromQueue: (trackId) => {
          set((s) => {
            const idx = s.queue.findIndex((t) => t.id === trackId);
            if (idx === -1) return s;

            const newQueue = [...s.queue.slice(0, idx), ...s.queue.slice(idx + 1)];
            let newIndex = s.currentIndex;

            if (newQueue.length === 0) {
              newIndex = -1;
            } else if (idx < s.currentIndex) {
              newIndex = s.currentIndex - 1;
            } else if (idx === s.currentIndex) {
              newIndex = Math.min(s.currentIndex, newQueue.length - 1);
              // Optionally auto-load the next item
              const track = newQueue[newIndex];
              if (track) withController((pc) => pc.loadAndPlay?.(track));
            }

            return { queue: newQueue, currentIndex: newIndex };
          });
        },

        clearQueue: () => {
          set({ queue: [], currentIndex: -1 });
        },

        setCurrentIndex: (idx) => {
          const { queue } = get();
          if (queue.length === 0) {
            set({ currentIndex: -1 });
            return;
          }
          const clamped = Math.min(Math.max(idx, 0), queue.length - 1);
          set({ currentIndex: clamped });

          const track = queue[clamped];
          if (track) withController((pc) => pc.loadAndPlay?.(track));
        },

        next: () => {
          const s = get();
          if (s.queue.length === 0) {
            set({ currentIndex: -1 });
            return;
          }
          const nextIndex = Math.min(s.currentIndex + 1, s.queue.length - 1);
          set({ currentIndex: nextIndex });

          const track = s.queue[nextIndex];
          if (track) withController((pc) => pc.loadAndPlay?.(track));
        },

        prev: () => {
          const s = get();
          if (s.queue.length === 0) {
            set({ currentIndex: -1 });
            return;
          }
          const prevIndex = Math.max(s.currentIndex - 1, 0);
          set({ currentIndex: prevIndex });

          const track = s.queue[prevIndex];
          if (track) withController((pc) => pc.loadAndPlay?.(track));
        },

        /* ---------------------- Transport (delegated) ---------------------- */

        play: () => withController((pc) => pc.play?.()),
        pause: () => withController((pc) => pc.pause?.()),
        togglePlay: () => withController((pc) => pc.toggle?.()),
        seek: (seconds) => {
          if (typeof seconds !== "number" || !Number.isFinite(seconds)) return;
          withController((pc) => pc.seek?.(seconds));
        },
        playIndex: (idx) => {
          const { queue } = get();
          if (queue.length === 0) return;

          const clamped = Math.min(Math.max(idx, 0), queue.length - 1);
          set({ currentIndex: clamped });

          const track = queue[clamped];
          if (track) withController((pc) => pc.loadAndPlay?.(track));
        },
      }),
      {
        name: "player-v2",
        version: 2,
  storage: storage as unknown as import("zustand/middleware").PersistStorage<unknown>,

        // Persist only queue + index (transport is engine-owned)
        partialize: (s) => ({ queue: s.queue, currentIndex: s.currentIndex }),

        // Defensive migration to keep index valid if queue shape changed.
        migrate: (persisted: unknown, fromVersion: number) => {
          if (!persisted || typeof persisted !== "object") return persisted;
          const p = persisted as { queue?: unknown; currentIndex?: unknown };
          if (fromVersion <= 1) {
            const queue: Track[] = Array.isArray(p.queue) ? (p.queue as Track[]) : [];
            let currentIndex =
              typeof p.currentIndex === "number" ? (p.currentIndex as number) : -1;

            if (queue.length === 0) currentIndex = -1;
            else currentIndex = Math.min(Math.max(currentIndex, 0), queue.length - 1);

            return { ...persisted, queue, currentIndex };
          }
          return persisted;
        },

        // Hydration lifecycle: flip the flag after rehydrate completes.
        onRehydrateStorage: () => {
          // before hydration (no-op)
          return () => {
            // after hydration
            try {
              // `usePlayerStore` is defined by the time this runs
              usePlayerStore.setState({ hasHydrated: true });
            } catch {
              // ignore — store may be tearing down
            }
          };
        },
      }
    ),
    { name: "usePlayerStore" }
  )
);

/* -------------------------------- Selectors ------------------------------- */
/** Use these to avoid unnecessary re-renders */
export const selectQueue = (s: PlayerState) => s.queue;
export const selectCurrentIndex = (s: PlayerState) => s.currentIndex;
export const selectHasHydrated = (s: PlayerState) => s.hasHydrated;
export const selectCurrentTrack = (s: PlayerState) =>
  s.currentIndex >= 0 && s.currentIndex < s.queue.length
    ? s.queue[s.currentIndex]
    : undefined;
export const selectIsEmpty = (s: PlayerState) => s.queue.length === 0;
