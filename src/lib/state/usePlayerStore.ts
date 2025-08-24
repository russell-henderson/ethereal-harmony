import { persist, createJSONStorage } from "zustand/middleware";

import type { PlayerStore, Track, Playlist } from './types';

/**
 * Returns the top N most played tracks from the queue, sorted by playCount descending.
 */
export const selectMostPlayed = (s: PlayerStore, count = 10) =>
  [...s.queue]
    .filter((t: Track) => typeof t.playCount === 'number' && t.playCount > 0)
    .sort((a: Track, b: Track) => (b.playCount ?? 0) - (a.playCount ?? 0))
    .slice(0, count);
/** Discovery selectors */
export const selectRecentlyAdded = (s: PlayerStore, count = 10) =>
  [...s.queue]
    .sort((a: Track, b: Track) => (b.addedAt ?? 0) - (a.addedAt ?? 0))
    .slice(0, count);

export const selectNotPlayedYet = (s: PlayerStore) =>
  s.queue.filter((t: Track) => !t.playCount || t.playCount === 0);
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
// import { devtools } from "zustand/middleware";

const storage = createJSONStorage(() => localStorage);

/* ---------------------------------- Types --------------------------------- */



// Helper for delegating to PlaybackController (stub for now)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function withController(_fn: (pc: unknown) => void) {
  // TODO: wire to actual PlaybackController instance
}

// -------------------- Zustand Player Store (CLEAN REWRITE, 2025-08-24) --------------------
// This store manages the player queue, playlists, and transport state. All state fields and methods are
// explicitly typed and documented. Persist config is correct for Zustand v4+.

export const usePlayerStore = create<PlayerStore>()(
  persist(
    (set, get) => ({
      current: null,
      queue: [],
      index: -1,
      playbackState: "idle",
      isPlaying: false,
      position: 0,
      duration: 0,
      volume: 1,
      muted: false,
      playbackRate: 1,
      playlists: [],
      hasHydrated: false,
      deletePlaylist: (playlistId: string) => {
        set((s: PlayerStore) => ({ playlists: s.playlists.filter((p: Playlist) => p.id !== playlistId) }));
      },
      addToPlaylist: (playlistId: string, trackId: string) => {
        set((s: PlayerStore) => ({
          playlists: s.playlists.map((p: Playlist) =>
            p.id === playlistId && !p.trackIds.includes(trackId)
              ? { ...p, trackIds: [...p.trackIds, trackId] }
              : p
          ),
        }));
      },
      removeFromPlaylist: (playlistId: string, trackId: string) => {
        set((s: PlayerStore) => ({
          playlists: s.playlists.map((p: Playlist) =>
            p.id === playlistId
              ? { ...p, trackIds: p.trackIds.filter((id: string) => id !== trackId) }
              : p
          ),
        }));
      },
  setQueue: (tracks: Track[], startIndex: number = 0) => {
        const now = Date.now();
        const safeIndex = tracks.length === 0 ? -1 : Math.min(Math.max(startIndex, 0), tracks.length - 1);
        const normTracks = tracks.map((t: Track) => ({
          ...t,
          addedAt: t.addedAt ?? now,
          playCount: t.playCount ?? 0,
        }));
        set({ queue: [...normTracks], index: safeIndex });
        withController((pc) => {
          // @ts-expect-error: pc is unknown until PlaybackController is typed
          if (pc.replaceQueue) {
            // @ts-expect-error: pc is unknown until PlaybackController is typed
            pc.replaceQueue(normTracks, safeIndex);
            return;
          }
          if (safeIndex >= 0) {
            const t = normTracks[safeIndex];
            // @ts-expect-error: pc is unknown until PlaybackController is typed
            pc.loadAndPlay?.(t);
          }
        });
      },
      addToQueue: (track: Track) => {
        const now = Date.now();
        set((s) => ({
          queue: [
            ...s.queue,
            {
              ...track,
              addedAt: track.addedAt ?? now,
              playCount: track.playCount ?? 0,
            },
          ],
        }));
      },
      addManyToQueue: (tracks: Track[]) => {
        if (!tracks?.length) return;
        set((s: PlayerStore) => ({ queue: [...s.queue, ...tracks] }));
      },
      removeFromQueue: (index: number) => {
        set((s: PlayerStore) => {
          if (index < 0 || index >= s.queue.length) return s;
          const newQueue = [...s.queue.slice(0, index), ...s.queue.slice(index + 1)];
          let newIndex = s.index;
          if (newQueue.length === 0) {
            newIndex = -1;
          } else if (index < s.index) {
            newIndex = s.index - 1;
          } else if (index === s.index) {
            newIndex = Math.min(s.index, newQueue.length - 1);
            const track = newQueue[newIndex];
            if (track) withController((pc) => {
              // @ts-expect-error: pc is unknown until PlaybackController is typed
              pc.loadAndPlay?.(track);
            });
          }
          return { queue: newQueue, index: newIndex };
        });
      },
      removeTrackFromQueue: (trackId: string) => {
        set((s: PlayerStore) => {
          const idx = s.queue.findIndex((t: Track) => t.id === trackId);
          if (idx === -1) return s;
          const newQueue = [...s.queue.slice(0, idx), ...s.queue.slice(idx + 1)];
          let newIndex = s.index;
          if (newQueue.length === 0) {
            newIndex = -1;
          } else if (idx < s.index) {
            newIndex = s.index - 1;
          } else if (idx === s.index) {
            newIndex = Math.min(s.index, newQueue.length - 1);
            const track = newQueue[newIndex];
            if (track) withController((pc) => {
              // @ts-expect-error: pc is unknown until PlaybackController is typed
              pc.loadAndPlay?.(track);
            });
          }
          return { queue: newQueue, index: newIndex };
        });
      },
      clearQueue: () => {
        set({ queue: [], index: -1 });
      },
      setCurrentIndex: (idx: number) => {
        const { queue } = get() as PlayerStore;
        if (queue.length === 0) {
          set({ index: -1 });
          return;
        }
        const clamped = Math.min(Math.max(idx, 0), queue.length - 1);
        set((s: PlayerStore) => {
          const track = s.queue[clamped];
          if (!track) return { index: clamped };
          const newQueue = s.queue.map((t: Track, i: number) =>
            i === clamped ? { ...t, playCount: (t.playCount ?? 0) + 1 } : t
          );
          return { index: clamped, queue: newQueue };
        });
        const track = (get() as PlayerStore).queue[clamped];
        if (track) withController((pc) => {
          // @ts-expect-error: pc is unknown until PlaybackController is typed
          pc.loadAndPlay?.(track);
        });
      },
      next: () => {
        const s = get();
        if (s.queue.length === 0) {
          set({ index: -1 });
          return;
        }
        const nextIndex = Math.min(s.index + 1, s.queue.length - 1);
        set((state: PlayerStore) => {
          const track = state.queue[nextIndex];
          if (!track) return { index: nextIndex };
          const newQueue = state.queue.map((t: Track, i: number) =>
            i === nextIndex ? { ...t, playCount: (t.playCount ?? 0) + 1 } : t
          );
          return { index: nextIndex, queue: newQueue };
        });
        const track = get().queue[nextIndex];
        if (track) withController((pc) => {
          // @ts-expect-error: pc is unknown until PlaybackController is typed
          pc.loadAndPlay?.(track);
        });
      },
      prev: () => {
        const s = get();
        if (s.queue.length === 0) {
          set({ index: -1 });
          return;
        }
        const prevIndex = Math.max(s.index - 1, 0);
        set((state: PlayerStore) => {
          const track = state.queue[prevIndex];
          if (!track) return { index: prevIndex };
          const newQueue = state.queue.map((t: Track, i: number) =>
            i === prevIndex ? { ...t, playCount: (t.playCount ?? 0) + 1 } : t
          );
          return { index: prevIndex, queue: newQueue };
        });
        const track = get().queue[prevIndex];
        if (track) withController((pc) => {
          // @ts-expect-error: pc is unknown until PlaybackController is typed
          pc.loadAndPlay?.(track);
        });
      },
      play: () => withController((pc) => {
        // @ts-expect-error: pc is unknown until PlaybackController is typed
        pc.play?.();
      }),
      pause: () => withController((pc) => {
        // @ts-expect-error: pc is unknown until PlaybackController is typed
        pc.pause?.();
      }),
      togglePlay: () => withController((pc) => {
        // @ts-expect-error: pc is unknown until PlaybackController is typed
        pc.toggle?.();
      }),
      seek: (seconds: number) => {
        if (typeof seconds !== "number" || !Number.isFinite(seconds)) return;
        withController((pc) => {
          // @ts-expect-error: pc is unknown until PlaybackController is typed
          pc.seek?.(seconds);
        });
      },
      playIndex: (idx: number) => {
        const { queue } = get();
        if (queue.length === 0) return;
        const clamped = Math.min(Math.max(idx, 0), queue.length - 1);
        set((state: PlayerStore) => {
          const track = state.queue[clamped];
          if (!track) return { index: clamped };
          const newQueue = state.queue.map((t: Track, i: number) =>
            i === clamped ? { ...t, playCount: (t.playCount ?? 0) + 1 } : t
          );
          return { index: clamped, queue: newQueue };
        });
        const track = get().queue[clamped];
        if (track) withController((pc) => {
          // @ts-expect-error: pc is unknown until PlaybackController is typed
          pc.loadAndPlay?.(track);
        });
      }
    }),
    {
      name: "player-v2",
      version: 2,
      storage: storage as unknown as import("zustand/middleware").PersistStorage<unknown>,
      partialize: (s: PlayerStore) => ({ queue: s.queue, index: s.index, playlists: s.playlists }),
      migrate: (persisted: unknown, fromVersion: number) => {
        if (!persisted || typeof persisted !== "object") return persisted;
        const p = persisted as { queue?: unknown; index?: unknown; currentIndex?: unknown };
        if (fromVersion <= 1) {
          const queue: Track[] = Array.isArray(p.queue) ? (p.queue as Track[]) : [];
          let index =
            typeof p.index === "number"
              ? (p.index as number)
              : typeof p.currentIndex === "number"
                ? (p.currentIndex as number)
                : -1;
          if (queue.length === 0) index = -1;
          else index = Math.min(Math.max(index, 0), queue.length - 1);
          return { ...persisted, queue, index };
        }
        return persisted;
      },
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      onRehydrateStorage: (_state) => {
        // Zustand expects (state) => void | (state, error) => void
        // We set hasHydrated after hydration
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        return (storeState?: PlayerStore, _error?: unknown) => {
          try {
            if (storeState) {
              (storeState as PlayerStore).hasHydrated = true;
            }
          } catch {
            // ignore
          }
        };
      }
    }
  )
);
// Removed duplicate store definition at the bottom of the file

