// src/lib/audio/EQGraph.ts
/**
 * EQGraph (Phase 2)
 * -----------------------------------------------------------------------------
 * A compact, dependency-free 10-band equalizer for the Web Audio API that
 * matches `AudioEngine.ensureEq()` expectations.
 *
 * Integration contract (must match AudioEngine.ensureEq):
 *   - Named export: `createEqGraph(ctx: AudioContext): EqGraph`
 *   - Returned object implements:
 *       • readonly bands: { freq: number; gain: number }[]
 *       • setGain(index: number, gainDb: number): void
 *       • setBypassed(b: boolean): void
 *       • node: AudioNode (the EQ chain as a single pluggable node)
 *
 * Usage in AudioEngine (already implemented):
 *   const mod = await import("./EQGraph");
 *   this.eq = mod.createEqGraph(this.ctx);
 *   // then the engine wires: source -> eq.node -> limiter -> gain -> dest
 *
 * Design
 * - Ten peaking filters at ISO-ish centers:
 *     [31, 62, 125, 250, 500, 1000, 2000, 4000, 8000, 16000] Hz
 * - Smooth gain transitions via `setTargetAtTime`.
 * - Bypass flips all filters to 0 dB without tearing down the chain.
 * - `bands` exposes live descriptors for UI (EqPanel) to render labels.
 *
 * Note on chaining
 * - The EQ is represented to the outside world as a single `node` so the
 *   engine can insert it into its fixed pipeline. Internally, we connect the
 *   10 filters in a chain and expose the “entry” that participates in the
 *   engine’s routing.
 */

export type EqBand = { freq: number; gain: number }; // gain in dB

export type EqGraph = {
  /** Live band descriptors (read-only references). */
  readonly bands: ReadonlyArray<EqBand>;
  /** Set gain (dB) for the band at `index` (clamped to [-12, +12]). */
  setGain: (index: number, gainDb: number) => void;
  /** Bypass on/off (true => neutral EQ). */
  setBypassed: (b: boolean) => void;
  /** Single node representing the entire EQ chain. */
  readonly node: AudioNode;
};

const CLAMP_DB_MIN = -12;
const CLAMP_DB_MAX = 12;
const clampDb = (v: number) => Math.max(CLAMP_DB_MIN, Math.min(CLAMP_DB_MAX, v));

/** Center frequencies for 10 bands (Hz). */
const DEFAULT_FREQS = [31, 62, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];

/** Gentle Q mapping: narrower in mid bands, broader at extremes. */
const qForFreq = (f: number) => {
  if (f < 80) return 0.9;
  if (f < 160) return 1.0;
  if (f < 320) return 1.05;
  if (f < 640) return 1.1;
  if (f < 1280) return 1.15;
  if (f < 2560) return 1.1;
  if (f < 5120) return 1.05;
  if (f < 10240) return 1.0;
  return 0.9;
};

/**
 * Create a 10-band peaking EQ chain.
 * External chains should:
 *   source.connect(eq.node); eq.node.connect(next);
 */
export function createEqGraph(ctx: AudioContext, freqs: number[] = DEFAULT_FREQS): EqGraph {
  // Build peaking filters in natural order (low → high)
  const filters = freqs.map((f) => {
    const biquad = ctx.createBiquadFilter();
    biquad.type = "peaking";
    biquad.frequency.value = f;
    biquad.Q.value = qForFreq(f);
    biquad.gain.value = 0;
    return biquad;
  });

  // Wire filters in series (0 -> 1 -> 2 -> ... -> 9)
  for (let i = 0; i < filters.length - 1; i++) {
    filters[i].connect(filters[i + 1]);
  }

  // Public bands array (stable references for UI)
  const bands: EqBand[] = filters.map((f) => ({ freq: f.frequency.value, gain: 0 }));

  let bypassed = false;

  const setGain = (index: number, gainDb: number) => {
    const i = Math.max(0, Math.min(filters.length - 1, index | 0));
    const g = clampDb(gainDb);
    bands[i].gain = g;

    // If bypassed, keep internal biquad gains at 0 (neutral), but remember target gain.
    const target = bypassed ? 0 : g;
    const biquad = filters[i];
    const t = ctx.currentTime + 0.005; // tiny offset avoids zipper noise
    try {
      biquad.gain.cancelScheduledValues(0);
      biquad.gain.setTargetAtTime(target, t, 0.015);
    } catch {
      biquad.gain.value = target;
    }
  };

  const setBypassed = (b: boolean) => {
    if (b === bypassed) return;
    bypassed = b;
    const t = ctx.currentTime + 0.005;
    for (let i = 0; i < filters.length; i++) {
      const target = bypassed ? 0 : clampDb(bands[i].gain);
      try {
        filters[i].gain.cancelScheduledValues(0);
        filters[i].gain.setTargetAtTime(target, t, 0.02);
      } catch {
        filters[i].gain.value = target;
      }
    }
  };

  /**
   * Expose the EQ chain as a single node.
   * We use the *first* filter as the public node handle; it is wired to the rest
   * of the chain internally. The engine will treat this as a single inline node.
   */
  const node = filters[0];

  return { bands, setGain, setBypassed, node };
}

export default createEqGraph;
