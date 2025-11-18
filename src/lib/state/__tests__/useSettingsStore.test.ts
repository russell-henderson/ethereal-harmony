// src/lib/state/__tests__/useSettingsStore.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { useSettingsStore } from '../useSettingsStore';

// Reset store state before each test
beforeEach(() => {
  useSettingsStore.setState({
    theme: 'dark',
    view: 'player',
    reducedMotion: undefined,
    vizPreset: 'medium',
    hdrEnabled: true,
    dimmerEnabled: false,
    dimmerStrength: 0.25,
    hotkeysEnabled: true,
    showStats: false,
    searchQuery: '',
    hasHydrated: false,
  });
});

describe('useSettingsStore', () => {

  describe('Default state', () => {
    it('should have correct default values', () => {
      const state = useSettingsStore.getState();
      expect(state.theme).toBe('dark');
      expect(state.view).toBe('player');
      expect(state.reducedMotion).toBeUndefined();
      expect(state.vizPreset).toBe('medium');
      expect(state.hdrEnabled).toBe(true);
      expect(state.dimmerEnabled).toBe(false);
      expect(state.dimmerStrength).toBe(0.25);
      expect(state.hotkeysEnabled).toBe(true);
      expect(state.showStats).toBe(false);
      expect(state.searchQuery).toBe('');
    });
  });

  describe('setTheme', () => {
    it('should set theme to dark', () => {
      useSettingsStore.getState().setTheme('dark');
      expect(useSettingsStore.getState().theme).toBe('dark');
    });

    it('should set theme to system', () => {
      useSettingsStore.getState().setTheme('system');
      expect(useSettingsStore.getState().theme).toBe('system');
    });
  });

  describe('toggleTheme', () => {
    it('should toggle from dark to system', () => {
      useSettingsStore.setState({ theme: 'dark' });
      useSettingsStore.getState().toggleTheme();
      expect(useSettingsStore.getState().theme).toBe('system');
    });

    it('should toggle from system to dark', () => {
      useSettingsStore.setState({ theme: 'system' });
      useSettingsStore.getState().toggleTheme();
      expect(useSettingsStore.getState().theme).toBe('dark');
    });
  });

  describe('setView', () => {
    it('should set view to player', () => {
      useSettingsStore.getState().setView('player');
      expect(useSettingsStore.getState().view).toBe('player');
    });

    it('should set view to settings', () => {
      useSettingsStore.getState().setView('settings');
      expect(useSettingsStore.getState().view).toBe('settings');
    });

    it('should set view to stream', () => {
      useSettingsStore.getState().setView('stream');
      expect(useSettingsStore.getState().view).toBe('stream');
    });
  });

  describe('setReducedMotion', () => {
    it('should set reducedMotion to true', () => {
      useSettingsStore.getState().setReducedMotion(true);
      expect(useSettingsStore.getState().reducedMotion).toBe(true);
    });

    it('should set reducedMotion to false', () => {
      useSettingsStore.getState().setReducedMotion(false);
      expect(useSettingsStore.getState().reducedMotion).toBe(false);
    });

    it('should set reducedMotion to undefined', () => {
      useSettingsStore.setState({ reducedMotion: true });
      useSettingsStore.getState().setReducedMotion(undefined);
      expect(useSettingsStore.getState().reducedMotion).toBeUndefined();
    });
  });

  describe('setVizPreset', () => {
    it('should set vizPreset to low', () => {
      useSettingsStore.getState().setVizPreset('low');
      expect(useSettingsStore.getState().vizPreset).toBe('low');
    });

    it('should set vizPreset to medium', () => {
      useSettingsStore.getState().setVizPreset('medium');
      expect(useSettingsStore.getState().vizPreset).toBe('medium');
    });

    it('should set vizPreset to high', () => {
      useSettingsStore.getState().setVizPreset('high');
      expect(useSettingsStore.getState().vizPreset).toBe('high');
    });

    it('should set vizPreset to ultra', () => {
      useSettingsStore.getState().setVizPreset('ultra');
      expect(useSettingsStore.getState().vizPreset).toBe('ultra');
    });
  });

  describe('setHdrEnabled', () => {
    it('should enable HDR', () => {
      useSettingsStore.getState().setHdrEnabled(true);
      expect(useSettingsStore.getState().hdrEnabled).toBe(true);
    });

    it('should disable HDR', () => {
      useSettingsStore.setState({ hdrEnabled: true });
      useSettingsStore.getState().setHdrEnabled(false);
      expect(useSettingsStore.getState().hdrEnabled).toBe(false);
    });
  });

  describe('setDimmerEnabled', () => {
    it('should enable dimmer', () => {
      useSettingsStore.getState().setDimmerEnabled(true);
      expect(useSettingsStore.getState().dimmerEnabled).toBe(true);
    });

    it('should disable dimmer', () => {
      useSettingsStore.setState({ dimmerEnabled: true });
      useSettingsStore.getState().setDimmerEnabled(false);
      expect(useSettingsStore.getState().dimmerEnabled).toBe(false);
    });
  });

  describe('setDimmerStrength', () => {
    it('should set dimmer strength', () => {
      useSettingsStore.getState().setDimmerStrength(0.5);
      expect(useSettingsStore.getState().dimmerStrength).toBe(0.5);
    });

    it('should clamp dimmer strength to 0-1 range', () => {
      useSettingsStore.getState().setDimmerStrength(1.5);
      expect(useSettingsStore.getState().dimmerStrength).toBeLessThanOrEqual(1);

      useSettingsStore.getState().setDimmerStrength(-0.5);
      expect(useSettingsStore.getState().dimmerStrength).toBeGreaterThanOrEqual(0);
    });
  });

  describe('setSearchQuery', () => {
    it('should set search query', () => {
      useSettingsStore.getState().setSearchQuery('test query');
      expect(useSettingsStore.getState().searchQuery).toBe('test query');
    });

    it('should clear search query', () => {
      useSettingsStore.setState({ searchQuery: 'test' });
      useSettingsStore.getState().setSearchQuery('');
      expect(useSettingsStore.getState().searchQuery).toBe('');
    });
  });
});

