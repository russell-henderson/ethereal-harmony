// src/lib/audio/Limiter.ts
/**
 * Limiter (Phase 2)
 * -----------------------------------------------------------------------------
 * Compact limiter built on Web Audio's DynamicsCompressorNode.
 *
 * Goals:
 *  - Provide a drop-in "node" that can sit in the engine chain:
 *        source -> [eq?] -> limiter.node -> gain -> destination
 *  - Ergonomic setters for common parameters with safe clamps.
 *  - Optional bypass that switches to a neutral transfer curve.
 *  - Zero external dependencies; framework-agnostic.
 *
 * Notes:
 *  - This module exposes ONLY a single node (DynamicsCompressorNode) so it can
 *    be inserted anywhere a normal AudioNode is expected.
 *  - If you need makeup gain, keep it in the engine's master gain stage to
 *    maintain a single-node limiter API (fits our chain and stores).
 */

export type Limiter = {
  /** The actual node to insert in your chain. */
  node: DynamicsCompressorNode;

  /** Set threshold/ceiling in dB (e.g., -1). */
  setCeiling: (db: number) => void;

  /** Set soft knee in dB (e.g., 30). */
  setKnee: (db: number) => void;

  /** Set compression ratio (e.g., 12 means 12:1). */
  setRatio: (ratio: number) => void;

  /** Set attack (seconds). Typical values: 0.002..0.01 */
  setAttack: (sec: number) => void;

  /** Set release (seconds). Typical values: 0.08..0.5 */
  setRelease: (sec: number) => void;

  /** Enable/disable processing (true => neutral curve). */
  setBypassed: (b: boolean) => void;

  /** Current gain reduction in dB (negative). */
  getReduction: () => number;
};

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/** Create a limiter node with sensible defaults for music playback. */
export function createLimiter(ctx: AudioContext, opts?: Partial<{
  ceiling: number; // dB, default -1.0
  knee: number;    // dB, default 30
  ratio: number;   // unitless, default 12
  attack: number;  // seconds, default 0.003
  release: number; // seconds, default 0.250
  bypassed: boolean; // default false
}>): Limiter {
  const node = ctx.createDynamicsCompressor();

  // Defaults tuned for transparent peak limiting
  const ceiling = opts?.ceiling ?? -1.0;
  const knee = opts?.knee ?? 30.0;
  const ratio = opts?.ratio ?? 12.0;
  const attack = opts?.attack ?? 0.003;
  const release = opts?.release ?? 0.250;

  // Apply defaults (clamped to safe ranges of Web Audio)
  node.threshold.value = clamp(ceiling, -60, 0);
  node.knee.value = clamp(knee, 0, 40);
  node.ratio.value = clamp(ratio, 1, 20);
  node.attack.value = clamp(attack, 0.0005, 1);
  node.release.value = clamp(release, 0.02, 1);

  let bypassed = !!opts?.bypassed;

  // Neutral values cached so we can flip without losing user settings
  const live = {
    threshold: node.threshold.value,
    knee: node.knee.value,
    ratio: node.ratio.value,
    attack: node.attack.value,
    release: node.release.value,
  };

  // Neutral/"bypass" curve — effectively transparent
  const neutral = { threshold: 0, knee: 0, ratio: 1, attack: 0.001, release: 0.05 };

  const applyParams = (p: typeof live) => {
    const t = ctx.currentTime + 0.002; // tiny offset reduces zipper noise
    try {
      node.threshold.cancelScheduledValues(0);
      node.knee.cancelScheduledValues(0);
      node.ratio.cancelScheduledValues(0);
      node.attack.cancelScheduledValues(0);
      node.release.cancelScheduledValues(0);

      node.threshold.setTargetAtTime(p.threshold, t, 0.01);
      node.knee.setTargetAtTime(p.knee, t, 0.01);
      node.ratio.setTargetAtTime(p.ratio, t, 0.01);
      node.attack.setTargetAtTime(p.attack, t, 0.01);
      node.release.setTargetAtTime(p.release, t, 0.02);
    } catch {
      node.threshold.value = p.threshold;
      node.knee.value = p.knee;
      node.ratio.value = p.ratio;
      node.attack.value = p.attack;
      node.release.value = p.release;
    }
  };

  const api: Limiter = {
    node,

    setCeiling(db: number) {
      live.threshold = clamp(db, -60, 0);
      applyParams(bypassed ? neutral : live);
    },

    setKnee(db: number) {
      live.knee = clamp(db, 0, 40);
      applyParams(bypassed ? neutral : live);
    },

    setRatio(r: number) {
      live.ratio = clamp(r, 1, 20);
      applyParams(bypassed ? neutral : live);
    },

    setAttack(sec: number) {
      live.attack = clamp(sec, 0.0005, 1);
      applyParams(bypassed ? neutral : live);
    },

    setRelease(sec: number) {
      live.release = clamp(sec, 0.02, 1);
      applyParams(bypassed ? neutral : live);
    },

    setBypassed(b: boolean) {
      if (bypassed === b) return;
      bypassed = b;
      applyParams(bypassed ? neutral : live);
    },

    getReduction() {
      // Negative dB (e.g., -5.2). Some browsers expose reduction as AudioParam-like number.
      return typeof (node as any).reduction === "number" ? (node as any).reduction : 0;
    },
  };

  // Honor initial bypass
  if (bypassed) applyParams(neutral);

  return api;
}

export default createLimiter;
