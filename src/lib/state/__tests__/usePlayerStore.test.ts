// src/lib/state/__tests__/usePlayerStore.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { usePlayerStore } from '../usePlayerStore';
import type { Track } from '../types';

// Reset store state before each test
beforeEach(() => {
  // Reset store state
  usePlayerStore.setState({
    current: null,
    queue: [],
    index: -1,
    playbackState: 'idle',
    isPlaying: false,
    position: 0,
    duration: 0,
    volume: 1,
    muted: false,
    playbackRate: 1,
    playlists: [],
    hasHydrated: false,
  });
});

describe('usePlayerStore', () => {

  describe('Default state', () => {
    it('should have correct default values', () => {
      const state = usePlayerStore.getState();
      expect(state.current).toBeNull();
      expect(state.queue).toEqual([]);
      expect(state.index).toBe(-1);
      expect(state.playbackState).toBe('idle');
      expect(state.isPlaying).toBe(false);
      expect(state.position).toBe(0);
      expect(state.duration).toBe(0);
      expect(state.volume).toBe(1);
      expect(state.muted).toBe(false);
      expect(state.playbackRate).toBe(1);
      expect(state.playlists).toEqual([]);
    });
  });

  describe('setQueue', () => {
    it('should set queue with tracks and index', () => {
      const track1: Track = {
        id: '1',
        title: 'Test Track 1',
        url: 'blob:test1',
        source: 'local',
      };
      const track2: Track = {
        id: '2',
        title: 'Test Track 2',
        url: 'blob:test2',
        source: 'local',
      };

      usePlayerStore.getState().setQueue([track1, track2], 0);

      const state = usePlayerStore.getState();
      expect(state.queue).toHaveLength(2);
      expect(state.queue[0].id).toBe('1');
      expect(state.queue[1].id).toBe('2');
      expect(state.index).toBe(0);
      expect(state.queue[0].addedAt).toBeDefined();
      expect(state.queue[0].playCount).toBe(0);
    });

    it('should clamp index to valid range', () => {
      const track: Track = {
        id: '1',
        title: 'Test',
        url: 'blob:test',
        source: 'local',
      };

      usePlayerStore.getState().setQueue([track], 5);
      expect(usePlayerStore.getState().index).toBe(0);

      usePlayerStore.getState().setQueue([track], -1);
      expect(usePlayerStore.getState().index).toBe(0);
    });

    it('should set index to -1 for empty queue', () => {
      usePlayerStore.getState().setQueue([], 0);
      expect(usePlayerStore.getState().index).toBe(-1);
    });
  });

  describe('addToQueue', () => {
    it('should add track to queue', () => {
      const track: Track = {
        id: '1',
        title: 'Test Track',
        url: 'blob:test',
        source: 'local',
      };

      usePlayerStore.getState().addToQueue(track);

      const state = usePlayerStore.getState();
      expect(state.queue).toHaveLength(1);
      expect(state.queue[0].id).toBe('1');
      expect(state.queue[0].addedAt).toBeDefined();
      expect(state.queue[0].playCount).toBe(0);
    });

    it('should append to existing queue', () => {
      const track1: Track = { id: '1', title: 'Track 1', url: 'blob:1', source: 'local' };
      const track2: Track = { id: '2', title: 'Track 2', url: 'blob:2', source: 'local' };

      usePlayerStore.getState().setQueue([track1], 0);
      usePlayerStore.getState().addToQueue(track2);

      const state = usePlayerStore.getState();
      expect(state.queue).toHaveLength(2);
      expect(state.queue[1].id).toBe('2');
    });
  });

  describe('addManyToQueue', () => {
    it('should add multiple tracks to queue', () => {
      const tracks: Track[] = [
        { id: '1', title: 'Track 1', url: 'blob:1', source: 'local' },
        { id: '2', title: 'Track 2', url: 'blob:2', source: 'local' },
      ];

      usePlayerStore.getState().addManyToQueue(tracks);

      expect(usePlayerStore.getState().queue).toHaveLength(2);
    });

    it('should not modify queue if tracks array is empty', () => {
      usePlayerStore.getState().setQueue([{ id: '1', title: 'Track', url: 'blob:1', source: 'local' }], 0);
      const before = usePlayerStore.getState().queue.length;

      usePlayerStore.getState().addManyToQueue([]);

      expect(usePlayerStore.getState().queue).toHaveLength(before);
    });
  });

  describe('removeFromQueue', () => {
    it('should remove track at index', () => {
      const tracks: Track[] = [
        { id: '1', title: 'Track 1', url: 'blob:1', source: 'local' },
        { id: '2', title: 'Track 2', url: 'blob:2', source: 'local' },
        { id: '3', title: 'Track 3', url: 'blob:3', source: 'local' },
      ];

      usePlayerStore.getState().setQueue(tracks, 1);
      usePlayerStore.getState().removeFromQueue(1);

      const state = usePlayerStore.getState();
      expect(state.queue).toHaveLength(2);
      expect(state.queue[0].id).toBe('1');
      expect(state.queue[1].id).toBe('3');
    });

    it('should adjust index when removing before current', () => {
      const tracks: Track[] = [
        { id: '1', title: 'Track 1', url: 'blob:1', source: 'local' },
        { id: '2', title: 'Track 2', url: 'blob:2', source: 'local' },
      ];

      usePlayerStore.getState().setQueue(tracks, 1);
      usePlayerStore.getState().removeFromQueue(0);

      expect(usePlayerStore.getState().index).toBe(0);
    });

    it('should not modify queue for invalid index', () => {
      const tracks: Track[] = [{ id: '1', title: 'Track', url: 'blob:1', source: 'local' }];
      usePlayerStore.getState().setQueue(tracks, 0);

      usePlayerStore.getState().removeFromQueue(5);
      expect(usePlayerStore.getState().queue).toHaveLength(1);

      usePlayerStore.getState().removeFromQueue(-1);
      expect(usePlayerStore.getState().queue).toHaveLength(1);
    });
  });
});

