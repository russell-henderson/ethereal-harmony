// src/lib/audio/AnalyserBus.ts
/**
 * AnalyserBus (Phase 2)
 * -----------------------------------------------------------------------------
 * A tiny, allocation-conscious wrapper around the shared Web Audio AnalyserNode.
 *
 * Why this exists
 * - We want a single, stable surface that EVERY consumer (SceneController,
 *   meters, visual widgets) uses to sample audio data. That keeps our Web Audio
 *   graph simple and avoids each consumer touching the analyser directly.
 *
 * What it provides
 * - A lazily acquired AnalyserNode from the PlaybackController/AudioEngine.
 * - Stable, re-usable internal buffers to minimize per-frame allocations.
 * - A strict façade API that SceneController should use exclusively:
 *     • getFrequencyData(out: Uint8Array)
 *     • getTimeDomainData(out: Uint8Array | Float32Array)
 *   …plus convenience helpers for band energies and configuration:
 *     • sample(): { low, mid, high, rms }
 *     • sampleBands(bands: Array<[lowHz, highHz]>): number[]
 *     • setFFTSize(size), setSmoothing(value)
 *
 * Defaults (per build plan)
 * - FFT size: 2048 (=> 1024 frequency bins)
 * - Smoothing: 0.8
 *
 * Notes
 * - This module is framework-agnostic and safe to import anywhere (no React).
 * - The underlying AudioContext is created lazily by the engine when we ask
 *   for the analyser node for the first time.
 */

import { playbackController } from "@/lib/audio/PlaybackController";

export type BandEnergies = { low: number; mid: number; high: number; rms: number };

/** Clamp to [0,1]. */
const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n);
/** Coerce to a reasonable power-of-two FFT in [32..32768]. */
const toNearestPow2 = (n: number) => {
  const x = Math.max(32, Math.min(32768, Math.floor(n || 2048)));
  return 1 << Math.round(Math.log2(x));
};

class AnalyserBus {
  // ---- Node & buffers -------------------------------------------------------
  private analyser: AnalyserNode;

  /** Cached buffers to avoid allocations in animation frames. */
  private freqU8: Uint8Array;     // frequency domain [0..255]
  private timeU8: Uint8Array;     // time domain [0..255], optional path
  private timeF32: Float32Array;  // time domain [-1..1], preferred path

  // ---- Config (defaults per plan) ------------------------------------------
  private _fftSize = 2048;
  private _smoothing = 0.8;

  constructor() {
    // Acquire (and thereby lazily create) the engine/analyser.
    this.analyser = playbackController.getAnalyser();

    // Apply defaults
    this.analyser.fftSize = this._fftSize;
    this.analyser.smoothingTimeConstant = this._smoothing;

    // Allocate buffers sized to the node
    this.freqU8 = new Uint8Array(this.analyser.frequencyBinCount);
    this.timeU8 = new Uint8Array(this.analyser.fftSize);
    this.timeF32 = new Float32Array(this.analyser.fftSize);
  }

  // ==========================================================================
  // Public façade — SceneController should ONLY use these two methods
  // ==========================================================================

  /**
   * Write frequency-domain data into `out` (0..255). Length must be
   * >= analyser.frequencyBinCount. Extra capacity is ignored.
   */
  getFrequencyData(out: Uint8Array): void {
    // Fast-path: if caller provided correct length, write into it directly.
    if (out.length >= this.analyser.frequencyBinCount) {
      this.analyser.getByteFrequencyData(out);
      return;
    }
    // Otherwise, fill our cached buffer then copy what fits.
    this._readFreq();
    out.set(this.freqU8.subarray(0, out.length));
  }

  /**
   * Write time-domain data into `out`.
   * - If `out` is Float32Array, we use getFloatTimeDomainData (range ~[-1..1]).
   * - If `out` is Uint8Array, we use getByteTimeDomainData (range [0..255]).
   * Length must be >= analyser.fftSize. Extra capacity is ignored.
   */
  getTimeDomainData(out: Uint8Array | Float32Array): void {
    if (out instanceof Float32Array) {
      if (out.length >= this.analyser.fftSize) {
        this.analyser.getFloatTimeDomainData(out);
      } else {
        this._readTimeF32();
        out.set(this.timeF32.subarray(0, out.length));
      }
    } else {
      if (out.length >= this.analyser.fftSize) {
        this.analyser.getByteTimeDomainData(out);
      } else {
        this._readTimeU8();
        out.set(this.timeU8.subarray(0, out.length));
      }
    }
  }

  // ==========================================================================
  // Convenience: band energies + RMS
  // ==========================================================================

  /**
   * Returns low/mid/high band averages and RMS (all normalized to 0..1).
   * Bins:
   *   low: 20..250 Hz
   *   mid: 250..2000 Hz
   *   high: 2000..16000 Hz
   */
  sample(): BandEnergies {
    this._readFreq();
    this._readTimeF32();

    const sampleRate = this.analyser.context.sampleRate || 48000;
    const nyquist = sampleRate / 2;
    const bins = this.analyser.frequencyBinCount;

    const binForHz = (hz: number) =>
      Math.max(0, Math.min(bins - 1, Math.round((hz / nyquist) * (bins - 1))));

    const avgRange = (arr: Uint8Array, startHz: number, endHz: number) => {
      const a = binForHz(Math.min(startHz, endHz));
      const b = binForHz(Math.max(startHz, endHz));
      let sum = 0;
      const n = b - a + 1;
      for (let i = a; i <= b; i++) sum += arr[i];
      return n > 0 ? (sum / n) / 255 : 0;
    };

    const low = avgRange(this.freqU8, 20, 250);
    const mid = avgRange(this.freqU8, 250, 2000);
    const high = avgRange(this.freqU8, 2000, 16000);

    // RMS over float time data (already ~[-1..1])
    let sq = 0;
    const L = this.timeF32.length || 1;
    for (let i = 0; i < L; i++) {
      const v = this.timeF32[i];
      sq += v * v;
    }
    const rms = clamp01(Math.sqrt(sq / L));

    return { low, mid, high, rms };
  }

  /**
   * Return averages for a custom list of bands, each defined as [lowHz, highHz].
   * The returned values are normalized to 0..1 (byte scale).
   */
  sampleBands(bands: Array<[number, number]>): number[] {
    this._readFreq();

    const sampleRate = this.analyser.context.sampleRate || 48000;
    const nyquist = sampleRate / 2;
    const bins = this.analyser.frequencyBinCount;

    const binForHz = (hz: number) =>
      Math.max(0, Math.min(bins - 1, Math.round((hz / nyquist) * (bins - 1))));

    const out: number[] = new Array(bands.length);
    for (let j = 0; j < bands.length; j++) {
      const [lo, hi] = bands[j];
      const a = binForHz(Math.min(lo, hi));
      const b = binForHz(Math.max(lo, hi));
      let sum = 0;
      const n = b - a + 1;
      for (let i = a; i <= b; i++) sum += this.freqU8[i];
      out[j] = n > 0 ? (sum / n) / 255 : 0;
    }
    return out;
  }

  // ==========================================================================
  // Configuration
  // ==========================================================================

  /** Update FFT size (power of two). Buffers are reallocated accordingly. */
  setFFTSize(size: number) {
    const pow2 = toNearestPow2(size);
    if (pow2 === this._fftSize) return;
    this._fftSize = pow2;
    this.analyser.fftSize = pow2;
    this._reallocate();
  }

  /** Alias to match varied call sites. */
  setFftSize(size: number) {
    this.setFFTSize(size);
  }

  /** Update smoothing (0..1). */
  setSmoothing(value: number) {
    const v = clamp01(value);
    if (v === this._smoothing) return;
    this._smoothing = v;
    this.analyser.smoothingTimeConstant = v;
  }

  get fftSize() {
    return this._fftSize;
  }
  get smoothing() {
    return this._smoothing;
  }
  get frequencyBinCount() {
    return this.analyser.frequencyBinCount;
  }

  /** Escape hatch for advanced consumers (prefer using the façade). */
  getNode(): AnalyserNode {
    return this.analyser;
  }

  // ==========================================================================
  // Internal reads & buffer management
  // ==========================================================================

  /** Ensure freqU8 matches analyser.frequencyBinCount and fill it. */
  private _readFreq() {
    if (this.freqU8.length !== this.analyser.frequencyBinCount) {
      this.freqU8 = new Uint8Array(this.analyser.frequencyBinCount);
    }
    this.analyser.getByteFrequencyData(this.freqU8);
  }

  /** Ensure timeU8 matches analyser.fftSize and fill it. */
  private _readTimeU8() {
    if (this.timeU8.length !== this.analyser.fftSize) {
      this.timeU8 = new Uint8Array(this.analyser.fftSize);
    }
    this.analyser.getByteTimeDomainData(this.timeU8);
  }

  /** Ensure timeF32 matches analyser.fftSize and fill it. */
  private _readTimeF32() {
    if (this.timeF32.length !== this.analyser.fftSize) {
      this.timeF32 = new Float32Array(this.analyser.fftSize);
    }
    this.analyser.getFloatTimeDomainData(this.timeF32);
  }

  /** Reallocate all internal buffers after FFT size changes. */
  private _reallocate() {
    this.freqU8 = new Uint8Array(this.analyser.frequencyBinCount);
    this.timeU8 = new Uint8Array(this.analyser.fftSize);
    this.timeF32 = new Float32Array(this.analyser.fftSize);
  }
}

// Singleton export for app-wide use (one analyser bus for the entire app).
export const analyserBus = new AnalyserBus();
export default analyserBus;
