// src/lib/visualizer/QualityPresets.ts
/**
 * QualityPresets
 * -----------------------------------------------------------------------------
 * Central mapping of QualityTier → concrete Three.js visualizer settings.
 *
 * Consumers:
 *   - useVizStore.applyQualityPreset(tier)
 *   - AdaptiveGuard (degrade/upgrade steps based on rolling FPS)
 *   - SceneController / WebGLCanvas (resolution scale, AA, post, particle counts)
 *
 * Design goals:
 *   1) Single source of truth for tiered rendering knobs.
 *   2) Predictable adaptive ladder: SMALL → MEDIUM → LARGE trade-offs.
 *   3) Safe bounds so we never request "impossible" settings of the scene.
 *
 * Notes:
 *   - All values are "intent". Scene code should clamp to hardware support
 *     (e.g., if WebGL2 or certain post passes are unavailable).
 *   - Resolution is expressed as a scale factor (0.66…1.0) relative to canvas size.
 *   - AA strategy is declarative; renderer will map to FXAA pass or TAA, etc.
 *   - Bloom can be fully disabled at lower tiers to protect frame budget.
 *
 * Tier rationale (from blueprint & changelog):
 *   - Target 55–60 FPS on a mid-range reference device.
 *   - Adaptive guard reduces: bloom → particles → resolution → AA → finally fallback.
 *   - First launch probe informs the starting tier (see `inferInitialTierFromProbe`).
 */

export type AAKind = "none" | "fxaa" | "taa";
export type QualityTier = "ultra" | "high" | "medium" | "low" | "fallback";

/** Ordered strongest → weakest (used by ladder helpers). */
export const QUALITY_ORDER = ["ultra", "high", "medium", "low", "fallback"] as const;

export type QualityPreset = {
  /** Human readable label for settings UI and diagnostics overlay. */
  label: string;

  /** Render buffer resolution scale (1.0 = native; < 1.0 = internal downscale). */
  resolutionScale: number; // 0.66 … 1.0

  /** Particle instance count target for ParticlesField. Scene clamps to safe bounds. */
  particleCount: number;

  /** Post-processing: bloom on/off and tuning. Scene may ignore if post not available. */
  bloomEnabled: boolean;
  bloomStrength: number; // 0 … 2.5 (scene clamps)
  bloomThreshold: number; // 0 … 1
  bloomRadius: number; // pass-specific radius

  /** Anti-aliasing strategy (mapped by renderer layer). */
  aa: AAKind;

  /** HDR pipeline (tone mapping + float buffers). Scene may disable if not supported. */
  hdr: boolean;

  /** Motion budget: cap for subtle camera/mesh motion (helps reduced motion and perf). */
  motionScaleMax: number; // 0 … 1

  /** Misc scene toggles */
  dither: boolean;
  postEnabled: boolean;

  /** Optional hints for SceneController tuning. */
  hints?: {
    /** Shadow toggles for future scene elements; we default off for V1 visuals. */
    shadows?: boolean;
    /** If true, prefer half float buffers; otherwise 8-bit targets. */
    preferHalfFloat?: boolean;
  };
};

/**
 * Canonical presets, tuned for our visual style and target devices.
 * Particle counts are chosen to scale roughly 2× per tier where possible.
 * Bloom is the most visually expensive pass and is the first to step down.
 */
export const QUALITY_PRESETS: Record<QualityTier, QualityPreset> = {
  ultra: {
    label: "Ultra",
    resolutionScale: 1.0,
    particleCount: 220_000,
    bloomEnabled: true,
    bloomStrength: 1.2,
    bloomThreshold: 0.75,
    bloomRadius: 0.6,
    aa: "taa",
    hdr: true,
    motionScaleMax: 1.0,
    dither: true,
    postEnabled: true,
    hints: { shadows: false, preferHalfFloat: true },
  },

  high: {
    label: "High",
    resolutionScale: 0.9,
    particleCount: 160_000,
    bloomEnabled: true,
    bloomStrength: 0.95,
    bloomThreshold: 0.78,
    bloomRadius: 0.55,
    aa: "fxaa",
    hdr: true,
    motionScaleMax: 0.9,
    dither: true,
    postEnabled: true,
    hints: { shadows: false, preferHalfFloat: true },
  },

  medium: {
    label: "Medium",
    resolutionScale: 0.8,
    particleCount: 110_000,
    bloomEnabled: true,
    bloomStrength: 0.7,
    bloomThreshold: 0.8,
    bloomRadius: 0.48,
    aa: "fxaa",
    hdr: true,
    motionScaleMax: 0.8,
    dither: true,
    postEnabled: true,
    hints: { shadows: false, preferHalfFloat: true },
  },

  low: {
    label: "Low",
    resolutionScale: 0.72,
    particleCount: 70_000,
    bloomEnabled: false,
    bloomStrength: 0.0,
    bloomThreshold: 0.85,
    bloomRadius: 0.45,
    aa: "fxaa",
    hdr: false,
    motionScaleMax: 0.7,
    dither: true,
    postEnabled: true,
    hints: { shadows: false, preferHalfFloat: false },
  },

  /**
   * Fallback is the "must keep responsive" floor. No bloom, no AA, smaller buffer.
   * Visual identity remains intact via particles + mist with conservative params.
   */
  fallback: {
    label: "Fallback",
    resolutionScale: 0.66,
    particleCount: 40_000,
    bloomEnabled: false,
    bloomStrength: 0.0,
    bloomThreshold: 1.0,
    bloomRadius: 0.4,
    aa: "none",
    hdr: false,
    motionScaleMax: 0.6,
    dither: true,
    postEnabled: false,
    hints: { shadows: false, preferHalfFloat: false },
  },
};

// -----------------------------------------------------------------------------
// Adaptive ladder
// -----------------------------------------------------------------------------

/**
 * The adaptive guard degrades settings in small, reversible steps.
 * We encode those steps here so SceneController/AdaptiveGuard/useVizStore
 * all share the exact same semantics.
 */
export type AdaptiveStep =
  | "bloom-→-0.8" // reduce bloom strength by 0.2 (clamped ≥ 0)
  | "bloom-off" // full disable
  | "particles-×-0.85" // reduce particle count by 15%
  | "resolution-×-0.92" // reduce internal render scale by ~8%
  | "aa→fxaa" // switch to FXAA if TAA
  | "aa→none" // disable AA
  | "post-off" // disable all post
  | "tier-down" // move to next lower tier
  | "tier-up"; // (used when recovering)

export const ADAPTIVE_DEGRADE_SEQUENCE: AdaptiveStep[] = [
  "bloom-→-0.8",
  "bloom-off",
  "particles-×-0.85",
  "resolution-×-0.92",
  "aa→fxaa",
  "aa→none",
  "post-off",
  "tier-down",
];

export const ADAPTIVE_RECOVER_SEQUENCE: AdaptiveStep[] = [
  "tier-up",
  // Note: fine-grained "undo" steps are left to the next preset jump,
  // which is simpler and avoids oscillation.
];

/** Safe clamp helpers used by mutation utilities. */
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const clampScale = (v: number) => Math.max(0.5, Math.min(1, v)); // safety guard
const clampParticles = (v: number) => Math.max(5_000, Math.min(500_000, Math.round(v)));

/**
 * Return a new preset with a single adaptive step applied.
 * (Pure function — does not mutate the original.)
 */
export function applyAdaptiveStep(preset: QualityPreset, step: AdaptiveStep): QualityPreset {
  switch (step) {
    case "bloom-→-0.8": {
      if (!preset.bloomEnabled) return preset;
      const strength = Math.max(0, preset.bloomStrength - 0.2);
      return { ...preset, bloomStrength: strength };
    }
    case "bloom-off": {
      if (!preset.bloomEnabled) return preset;
      return { ...preset, bloomEnabled: false, bloomStrength: 0 };
    }
    case "particles-×-0.85": {
      const next = clampParticles(preset.particleCount * 0.85);
      return { ...preset, particleCount: next };
    }
    case "resolution-×-0.92": {
      const next = clampScale(preset.resolutionScale * 0.92);
      return { ...preset, resolutionScale: next };
    }
    case "aa→fxaa": {
      if (preset.aa === "taa") return { ...preset, aa: "fxaa" };
      return preset;
    }
    case "aa→none": {
      if (preset.aa !== "none") return { ...preset, aa: "none" };
      return preset;
    }
    case "post-off": {
      if (!preset.postEnabled) return preset;
      return { ...preset, postEnabled: false, bloomEnabled: false, bloomStrength: 0 };
    }
    // 'tier-down' and 'tier-up' are handled by helpers that change the tier,
    // not the shape of this preset.
    default:
      return preset;
  }
}

// -----------------------------------------------------------------------------
// Tier helpers
// -----------------------------------------------------------------------------

export function getTierIndex(tier: QualityTier): number {
  return QUALITY_ORDER.indexOf(tier);
}

export function tierFromIndex(idx: number): QualityTier {
  const i = Math.max(0, Math.min(QUALITY_ORDER.length - 1, idx));
  return QUALITY_ORDER[i] as QualityTier;
}

export function nextLowerTier(tier: QualityTier): QualityTier {
  return tierFromIndex(getTierIndex(tier) + 1);
}

export function nextHigherTier(tier: QualityTier): QualityTier {
  return tierFromIndex(getTierIndex(tier) - 1);
}

/**
 * Given a current tier and step, return the next tier and preset.
 * Non-tier steps return the same tier with a mutated preset.
 */
export function stepPreset(
  tier: QualityTier,
  preset: QualityPreset,
  step: AdaptiveStep
): { tier: QualityTier; preset: QualityPreset } {
  if (step === "tier-down") {
    const t = nextLowerTier(tier);
    return { tier: t, preset: QUALITY_PRESETS[t] };
  }
  if (step === "tier-up") {
    const t = nextHigherTier(tier);
    return { tier: t, preset: QUALITY_PRESETS[t] };
  }
  return { tier, preset: applyAdaptiveStep(preset, step) };
}

// -----------------------------------------------------------------------------
// Probe → initial tier heuristic
// -----------------------------------------------------------------------------

export type ProbeSnapshot = {
  /** Rolling FPS during an initial light scene (if measured). */
  fps?: number;
  /** Device memory hint in GB (Chrome-only; undefined elsewhere). */
  deviceMemory?: number;
  /** 0 (worst) … 3 (best) GPU tier if using detect-gpu style probe. */
  gpuTier?: number;
  /** Battery saver mode detected. */
  batterySaver?: boolean;
  /** Mobile UA hint. */
  isMobile?: boolean;
};

/**
 * Heuristic mapping from device hints to a starting quality tier.
 * This is intentionally conservative; the AdaptiveGuard can always promote.
 */
export function inferInitialTierFromProbe(p: ProbeSnapshot): QualityTier {
  // Battery saver or very low fps → start low/fallback.
  if (p.batterySaver) return "low";
  if (p.fps !== undefined && p.fps < 50) return "low";

  // Device memory hint: <= 2 GB → low; 3–4 GB → medium
  if (p.deviceMemory !== undefined) {
    if (p.deviceMemory <= 2) return "low";
    if (p.deviceMemory <= 4) return "medium";
  }

  // GPU tier (rough guide; 0-3 scale)
  if (p.gpuTier !== undefined) {
    if (p.gpuTier <= 0) return "low";
    if (p.gpuTier === 1) return "medium";
    if (p.gpuTier === 2) return "high";
    if (p.gpuTier >= 3) return "ultra";
  }

  // Mobile devices tend to prefer medium as a safe start.
  if (p.isMobile) return "medium";

  // Default to high on desktop where no hints are available.
  return "high";
}

// -----------------------------------------------------------------------------
// Safety & normalization
// -----------------------------------------------------------------------------

/**
 * Normalize a preset to safe bounds. Call this before applying into scene.
 */
export function normalizePreset(p: QualityPreset): QualityPreset {
  return {
    ...p,
    resolutionScale: clampScale(p.resolutionScale),
    particleCount: clampParticles(p.particleCount),
    bloomStrength: clamp01(p.bloomStrength) * 2.5, // cap to 2.5 for our pipeline
    bloomThreshold: clamp01(p.bloomThreshold),
    bloomRadius: Math.max(0, Math.min(1.2, p.bloomRadius)),
    motionScaleMax: clamp01(p.motionScaleMax),
  };
}

/** Convenience to fetch a normalized preset for a tier. */
export function getPresetForTier(tier: QualityTier): QualityPreset {
  return normalizePreset(QUALITY_PRESETS[tier]);
}
