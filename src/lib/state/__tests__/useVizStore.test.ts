// src/lib/state/__tests__/useVizStore.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { useVizStore } from '../useVizStore';

// Reset store state before each test
beforeEach(() => {
  useVizStore.setState({
    theme: 'dark',
    hdr: false,
    dimmer: false,
    presetId: 'nebula',
    params: {
      intensity: 0.4,
      bloom: 0.18,
      motionScale: 0.25,
      smooth: 0.8,
      baseColor: '#1A2B45',
      reactiveHue: '#7F6A9F',
      accent: '#00F0FF',
      particleCount: 40_000,
    },
    hasHydrated: false,
  });
});

describe('useVizStore', () => {

  describe('Default state', () => {
    it('should have correct default values', () => {
      const state = useVizStore.getState();
      expect(state.theme).toBe('dark');
      expect(state.hdr).toBe(false);
      expect(state.dimmer).toBe(false);
      expect(state.presetId).toBe('nebula');
      expect(state.params.intensity).toBe(0.4);
      expect(state.params.bloom).toBe(0.18);
      expect(state.params.motionScale).toBe(0.25);
      expect(state.params.smooth).toBe(0.8);
      expect(state.params.particleCount).toBe(40_000);
    });
  });

  describe('setParam', () => {
    it('should update intensity', () => {
      useVizStore.getState().setParam('intensity', 0.8);
      expect(useVizStore.getState().params.intensity).toBe(0.8);
    });

    it('should clamp intensity to 0-1 range', () => {
      useVizStore.getState().setParam('intensity', 1.5);
      expect(useVizStore.getState().params.intensity).toBeLessThanOrEqual(1);

      useVizStore.getState().setParam('intensity', -0.5);
      expect(useVizStore.getState().params.intensity).toBeGreaterThanOrEqual(0);
    });

    it('should update bloom', () => {
      useVizStore.getState().setParam('bloom', 0.2);
      expect(useVizStore.getState().params.bloom).toBe(0.2);
    });

    it('should clamp bloom to 0-0.25 range', () => {
      useVizStore.getState().setParam('bloom', 0.5);
      expect(useVizStore.getState().params.bloom).toBeLessThanOrEqual(0.25);
    });

    it('should update motionScale', () => {
      useVizStore.getState().setParam('motionScale', 0.5);
      expect(useVizStore.getState().params.motionScale).toBe(0.5);
    });

    it('should update baseColor', () => {
      useVizStore.getState().setParam('baseColor', '#FF0000');
      expect(useVizStore.getState().params.baseColor).toBe('#FF0000');
    });

    it('should update particleCount', () => {
      useVizStore.getState().setParam('particleCount', 50_000);
      expect(useVizStore.getState().params.particleCount).toBe(50_000);
    });

    it('should clamp particleCount to valid range', () => {
      useVizStore.getState().setParam('particleCount', 500_000);
      expect(useVizStore.getState().params.particleCount).toBeLessThanOrEqual(250_000);

      useVizStore.getState().setParam('particleCount', 500);
      expect(useVizStore.getState().params.particleCount).toBeGreaterThanOrEqual(1_000);
    });
  });

  describe('setPreset', () => {
    it('should set preset to nebula', () => {
      useVizStore.getState().setPreset('nebula');
      expect(useVizStore.getState().presetId).toBe('nebula');
      expect(useVizStore.getState().params.intensity).toBe(0.4);
      expect(useVizStore.getState().params.motionScale).toBe(0.25);
    });

    it('should set preset to glass-waves', () => {
      useVizStore.getState().setPreset('glass-waves');
      expect(useVizStore.getState().presetId).toBe('glass-waves');
      expect(useVizStore.getState().params.intensity).toBe(0.6);
      expect(useVizStore.getState().params.motionScale).toBe(0.35);
    });

    it('should set preset to strobe-pulse', () => {
      useVizStore.getState().setPreset('strobe-pulse');
      expect(useVizStore.getState().presetId).toBe('strobe-pulse');
      expect(useVizStore.getState().params.intensity).toBe(0.8);
      expect(useVizStore.getState().params.motionScale).toBe(0.5);
    });
  });

  describe('cyclePreset', () => {
    it('should cycle from nebula to glass-waves', () => {
      useVizStore.setState({ presetId: 'nebula' });
      useVizStore.getState().cyclePreset();
      expect(useVizStore.getState().presetId).toBe('glass-waves');
    });

    it('should cycle from glass-waves to strobe-pulse', () => {
      useVizStore.setState({ presetId: 'glass-waves' });
      useVizStore.getState().cyclePreset();
      expect(useVizStore.getState().presetId).toBe('strobe-pulse');
    });

    it('should cycle from strobe-pulse back to nebula', () => {
      useVizStore.setState({ presetId: 'strobe-pulse' });
      useVizStore.getState().cyclePreset();
      expect(useVizStore.getState().presetId).toBe('nebula');
    });
  });

  describe('toggleHDR', () => {
    it('should toggle HDR from false to true', () => {
      useVizStore.setState({ hdr: false });
      useVizStore.getState().toggleHDR();
      expect(useVizStore.getState().hdr).toBe(true);
    });

    it('should toggle HDR from true to false', () => {
      useVizStore.setState({ hdr: true });
      useVizStore.getState().toggleHDR();
      expect(useVizStore.getState().hdr).toBe(false);
    });
  });

  describe('toggleDimmer', () => {
    it('should toggle dimmer from false to true', () => {
      useVizStore.setState({ dimmer: false });
      useVizStore.getState().toggleDimmer();
      expect(useVizStore.getState().dimmer).toBe(true);
    });

    it('should toggle dimmer from true to false', () => {
      useVizStore.setState({ dimmer: true });
      useVizStore.getState().toggleDimmer();
      expect(useVizStore.getState().dimmer).toBe(false);
    });
  });
});

