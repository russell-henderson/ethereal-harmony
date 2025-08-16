// src/lib/visualizer/SceneController.ts
import * as THREE from "three";
import {
  type QualityTier,
  type QualityPreset,
  getPresetForTier,
  normalizePreset,
} from "./QualityPresets";

/**
 * SceneController
 * -----------------------------------------------------------------------------
 * Non-React controller that owns the Three.js scene graph and all render-time
 * configuration. It does *not* touch audio playback; it only consumes an
 * analyser-like data source to drive uniforms.
 *
 * Responsibilities:
 *  - Create/own Scene + Camera + a minimal visual (audio-reactive particle field).
 *  - Maintain a compact set of shader uniforms updated from an external analyser.
 *  - Apply quality presets (particle counts, post-FX toggles, HDR hints).
 *  - Expose a small public API for the React wrapper (SceneCanvas) and stores.
 *
 * Out of scope (Phase 1):
 *  - Post-processing composer (FXAA/TAA/Bloom) — controller exposes flags but
 *    uses in-shader "bloom-ish" additive shaping as a placeholder.
 *  - Routing / UI / telemetry.
 *
 * Lifecycle:
 *  const ctrl = new SceneController({ renderer, canvas, initialTier: "high" })
 *  ctrl.mount()        // constructs scene graph
 *  ctrl.update(dt)     // per-frame (from RAF in SceneCanvas)
 *  ctrl.setTier("low") // dynamic quality change
 *  ctrl.dispose()      // release GPU resources
 */

// ----------------------------------------------------------------------------
// External contracts (lightweight & defensive)
// ----------------------------------------------------------------------------

/** Minimal analyser interface used by the controller. */
export interface AnalyserBus {
  /** Rolling average of full-band loudness (0..1). */
  getRms(): number;
  /** Coarse band energies (0..1). All optional. */
  getBass?(): number;
  getMid?(): number;
  getTreble?(): number;
}

/** Options accepted by the controller. */
export interface SceneControllerOptions {
  renderer: THREE.WebGLRenderer;
  canvas: HTMLCanvasElement;
  initialTier?: QualityTier;
  /** If provided, overrides the initial tier mapping. */
  presetOverride?: Partial<QualityPreset>;
  /** Optional analyser; can be attached later via setAnalyser(). */
  analyser?: AnalyserBus | null;

  /** Visual toggles that may also be changed later. */
  hdr?: boolean;
  dimmer?: boolean;

  /** Camera initial params (kept intentionally simple). */
  fov?: number; // degrees
  near?: number;
  far?: number;
}

/** Public API surface for Viz store / React wrapper. */
export interface ISceneController {
  mount(): void;
  update(dt: number): void;
  resize(width: number, height: number): void;
  dispose(): void;

  /** Quality / features */
  setTier(tier: QualityTier): void;
  applyPreset(preset: Partial<QualityPreset>): void;
  getTier(): QualityTier;
  getPreset(): QualityPreset;

  setHDR(on: boolean): void;
  setDimmer(on: boolean): void;

  /** External drivers */
  setAnalyser(bus: AnalyserBus | null): void;

  /** Read-only handles for advanced integrations */
  getScene(): THREE.Scene;
  getCamera(): THREE.PerspectiveCamera;
  getRenderer(): THREE.WebGLRenderer;
}

// ----------------------------------------------------------------------------
// Internals
// ----------------------------------------------------------------------------

type Uniforms = {
  uTime: { value: number };
  uAudioRms: { value: number };
  uAudioBass: { value: number };
  uAudioMid: { value: number };
  uAudioTreble: { value: number };
  uDimmer: { value: number };
  uMotionScale: { value: number };
  uBloomMix: { value: number };
  uColorA: { value: THREE.Color };
  uColorB: { value: THREE.Color };
};

const DEFAULT_COLORS = {
  a: new THREE.Color("#00F0FF"), // Radiant Aqua (highlight)
  b: new THREE.Color("#7F6A9F"), // Soft Lavender (accent)
};

/** Small utility: dispose safely if object has a dispose() method. */
const safeDispose = (obj: any) => {
  try {
    if (obj && typeof obj.dispose === "function") obj.dispose();
  } catch {
    /* no-op */
  }
};

export class SceneController implements ISceneController {
  private renderer: THREE.WebGLRenderer;
  private canvas: HTMLCanvasElement;

  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;

  private particleMesh: THREE.Points | null = null;
  private particleGeometry: THREE.BufferGeometry | null = null;
  private particleMaterial: THREE.ShaderMaterial | null = null;

  private uniforms!: Uniforms;

  private tier: QualityTier;
  private preset: QualityPreset;

  private analyser: AnalyserBus | null;

  // Runtime flags
  private hdr: boolean;
  private dimmer: boolean;

  // Frame clock
  private time = 0;

  constructor(opts: SceneControllerOptions) {
    this.renderer = opts.renderer;
    this.canvas = opts.canvas;

    this.tier = opts.initialTier ?? "high";
    this.preset = normalizePreset({
      ...getPresetForTier(this.tier),
      ...(opts.presetOverride ?? {}),
    });

    this.analyser = opts.analyser ?? null;
    this.hdr = !!opts.hdr;
    this.dimmer = !!opts.dimmer;

    // Camera defaults
    const fov = opts.fov ?? 55;
    const near = opts.near ?? 0.1;
    const far = opts.far ?? 100;

    // Initialize core containers and camera
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(fov, 1, near, far);
    this.camera.position.set(0, 0, 6);

    // Renderer hints (HDR placeholder — true HDR requires float buffers/post)
    this.applyRendererHints();
  }

  // --------------------------------------------------------------------------
  // Public API
  // --------------------------------------------------------------------------

  mount(): void {
    // Set initial viewport
    this.resize(this.canvas.clientWidth || 1, this.canvas.clientHeight || 1);

    // Uniforms shared across materials
    this.uniforms = {
      uTime: { value: 0 },
      uAudioRms: { value: 0 },
      uAudioBass: { value: 0 },
      uAudioMid: { value: 0 },
      uAudioTreble: { value: 0 },
      uDimmer: { value: this.dimmer ? 1 : 0 },
      uMotionScale: { value: this.preset.motionScaleMax },
      uBloomMix: { value: this.preset.bloomEnabled ? 1 : 0 },
      uColorA: { value: DEFAULT_COLORS.a.clone() },
      uColorB: { value: DEFAULT_COLORS.b.clone() },
    };

    // Create the particle field matching the quality preset
    this.rebuildParticles(this.preset.particleCount);

    // Ambient fog-like tint for depth cueing (cheap)
    const bg = new THREE.Color("#1A2B45"); // Deep Indigo
    this.scene.fog = new THREE.Fog(bg.getHex(), 12, 22);
  }

  update(dt: number): void {
    // Advance time for shader motion. Clamp to avoid large jumps.
    const step = Math.min(0.05, Math.max(0, dt));
    this.time += step;
    this.uniforms.uTime.value = this.time;

    // Analyse audio — values are 0..1
    if (this.analyser) {
      const rms = clamp01(this.analyser.getRms?.() ?? 0);
      const bass = clamp01(this.analyser.getBass?.() ?? rms * 0.9);
      const mid = clamp01(this.analyser.getMid?.() ?? rms * 0.7);
      const treble = clamp01(this.analyser.getTreble?.() ?? rms * 0.5);

      // Slight easing to reduce harsh jitter
      this.uniforms.uAudioRms.value = lerp(this.uniforms.uAudioRms.value, rms, 0.25);
      this.uniforms.uAudioBass.value = lerp(this.uniforms.uAudioBass.value, bass, 0.25);
      this.uniforms.uAudioMid.value = lerp(this.uniforms.uAudioMid.value, mid, 0.25);
      this.uniforms.uAudioTreble.value = lerp(this.uniforms.uAudioTreble.value, treble, 0.25);
    }

    // Update any cheap camera motion driven by audio (scaled by motionScale)
    const ms = this.preset.motionScaleMax;
    const wobble = this.uniforms.uAudioBass.value * 0.05 * ms;
    this.camera.position.x = Math.sin(this.time * 0.6) * wobble;
    this.camera.position.y = Math.cos(this.time * 0.4) * wobble;
    this.camera.lookAt(0, 0, 0);

    // Render — SceneCanvas owns the RAF cadence and clears/etc.
    this.renderer.render(this.scene, this.camera);
  }

  resize(width: number, height: number): void {
    const w = Math.max(1, width);
    const h = Math.max(1, height);

    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    // The actual renderer size & DPR are managed by SceneCanvas.
  }

  dispose(): void {
    // Teardown GPU resources
    if (this.particleMesh) {
      this.scene.remove(this.particleMesh);
    }
    safeDispose(this.particleMaterial);
    safeDispose(this.particleGeometry);

    // Clear refs
    this.particleMesh = null;
    this.particleGeometry = null;
    this.particleMaterial = null;

    // Scene-level disposals (if we add textures, etc., later)
    // Intentionally not disposing the renderer; SceneCanvas owns it.
  }

  // ----- Quality / Features ---------------------------------------------------

  setTier(tier: QualityTier): void {
    if (tier === this.tier) return;
    this.tier = tier;
    this.preset = normalizePreset(getPresetForTier(tier));
    this.applyPreset(this.preset);
  }

  applyPreset(partial: Partial<QualityPreset>): void {
    // Merge and normalize
    this.preset = normalizePreset({ ...this.preset, ...partial });

    // Particle count may require geometry rebuild
    if (typeof partial.particleCount === "number") {
      this.rebuildParticles(this.preset.particleCount);
    }

    // Update uniforms & flags
    this.uniforms.uMotionScale.value = this.preset.motionScaleMax;
    this.uniforms.uBloomMix.value = this.preset.bloomEnabled ? 1 : 0;

    // Renderer hints (HDR placeholder)
    this.applyRendererHints();

    // (AA/Post toggles are acknowledged but realized in a future composer)
  }

  getTier(): QualityTier {
    return this.tier;
  }

  getPreset(): QualityPreset {
    return this.preset;
  }

  setHDR(on: boolean): void {
    this.hdr = !!on;
    this.applyRendererHints();
  }

  setDimmer(on: boolean): void {
    this.dimmer = !!on;
    this.uniforms.uDimmer.value = this.dimmer ? 1 : 0;
  }

  // ----- External drivers -----------------------------------------------------

  setAnalyser(bus: AnalyserBus | null): void {
    this.analyser = bus;
  }

  // ----- Read-only handles ----------------------------------------------------

  getScene(): THREE.Scene {
    return this.scene;
  }

  getCamera(): THREE.PerspectiveCamera {
    return this.camera;
  }

  getRenderer(): THREE.WebGLRenderer {
    return this.renderer;
  }

  // ----------------------------------------------------------------------------
  // Private helpers
  // ----------------------------------------------------------------------------

  /** (Re)build the particle field to match the requested instance count. */
  private rebuildParticles(count: number): void {
    // Remove old mesh
    if (this.particleMesh) {
      this.scene.remove(this.particleMesh);
      safeDispose(this.particleMaterial);
      safeDispose(this.particleGeometry);
      this.particleMesh = null;
      this.particleMaterial = null;
      this.particleGeometry = null;
    }

    // Geometry: distribute points within a stretched sphere shell to suggest depth.
    const positions = new Float32Array(count * 3);
    const seeds = new Float32Array(count);
    const tmp = new THREE.Vector3();

    for (let i = 0; i < count; i++) {
      // Fibonacci-ish distribution on unit sphere, then scale to shell radius
      const r1 = Math.random();
      const r2 = Math.random();
      const theta = 2 * Math.PI * r1;
      const phi = Math.acos(2 * r2 - 1);
      tmp.setFromSphericalCoords(1, phi, theta);

      // Radial band (0.5..1.0) to leave center less dense for readability
      const radius = 1.0 + Math.random() * 2.6; // 1..3.6
      // Slight anisotropy to create a "nebula" look
      tmp.multiply(new THREE.Vector3(1.0, 0.82, 1.0)).multiplyScalar(radius);

      positions[i * 3 + 0] = tmp.x;
      positions[i * 3 + 1] = tmp.y;
      positions[i * 3 + 2] = tmp.z;

      // Seed influences per-point twinkle/velocity
      seeds[i] = Math.random();
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));

    // Material: audio-reactive shimmer
    const material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: this.uniforms as any,
      vertexShader: PARTICLE_VS,
      fragmentShader: PARTICLE_FS,
    });

    const points = new THREE.Points(geometry, material);
    points.frustumCulled = false;

    // Keep references
    this.particleGeometry = geometry;
    this.particleMaterial = material;
    this.particleMesh = points;

    // Insert into scene
    this.scene.add(points);
  }

  /** Apply renderer-level hints based on toggles/preset. */
  private applyRendererHints(): void {
    // "HDR" placeholder: actual HDR would require float render targets and tone mapping.
    // We approximate with a mild exposure boost only when hdr flag is true.
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = this.hdr ? 1.1 : 1.0;

    // Dithering helps gradients on LDR displays
    (this.renderer as any).dither = this.preset.dither === true;
  }
}

// ----------------------------------------------------------------------------
// Shaders
// ----------------------------------------------------------------------------

// Vertex shader: places particles and applies subtle audio/time displacement.
const PARTICLE_VS = /* glsl */ `
attribute float aSeed;

uniform float uTime;
uniform float uAudioRms;
uniform float uAudioBass;
uniform float uAudioMid;
uniform float uAudioTreble;
uniform float uMotionScale;

varying float vTwinkle;
varying float vDepth;

void main() {
  vec3 p = position;

  // Seed-based orbit with slow drift; bass adds pulsation magnitude.
  float seed = aSeed * 43758.5453123;
  float t = uTime * (0.25 + fract(seed));
  float wob = (uAudioBass * 0.65 + uAudioRms * 0.35) * uMotionScale;

  // Low-frequency circular drift around origin (cheap orbital look)
  p.x += sin(t * 0.7 + seed) * wob * 0.6;
  p.y += cos(t * 0.6 + seed * 1.7) * wob * 0.4;
  p.z += sin(t * 0.5 + seed * 2.1) * wob * 0.5;

  // Audio-reactive scale inward/outward to "breathe" with the music
  float breathe = 1.0 + (uAudioRms * 0.08 + uAudioMid * 0.04) * uMotionScale;
  p *= breathe;

  vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mvPosition;

  // Size attenuates with distance; add a little treble sparkle
  float dist = length(mvPosition.xyz);
  float baseSize = 1.6 + uAudioTreble * 0.8;
  gl_PointSize = baseSize * (300.0 / max(60.0, dist * 60.0));

  // Varying for fragment
  vDepth = clamp(dist / 26.0, 0.0, 1.0);
  vTwinkle = fract(seed + uTime * (0.3 + uAudioTreble * 1.5));
}
`;

// Fragment shader: soft round sprite with gradient color and optional "bloom mix".
const PARTICLE_FS = /* glsl */ `
precision highp float;

uniform float uDimmer;
uniform float uBloomMix;
uniform vec3  uColorA;
uniform vec3  uColorB;
uniform float uAudioRms;
uniform float uAudioTreble;

varying float vTwinkle;
varying float vDepth;

void main() {
  // Normalized point coordinates (-1..1)
  vec2 uv = gl_PointCoord * 2.0 - 1.0;
  float r2 = dot(uv, uv);

  // Soft disc: falloff towards edges
  float alpha = smoothstep(1.0, 0.0, r2);

  // Twinkle modulates alpha subtly, more at the center
  float tw = (sin(vTwinkle * 6.28318) * 0.5 + 0.5) * 0.25 * (1.0 - r2);
  alpha *= 0.85 + tw;

  // Color blend from A to B based on depth
  vec3 col = mix(uColorA, uColorB, vDepth);

  // "Bloom mix" is a placeholder — we bias brightness if enabled
  float energy = (0.9 + uBloomMix * 0.6) * (0.7 + uAudioRms * 0.6 + uAudioTreble * 0.2);

  // Dimmer reduces contribution to avoid washing out the UI
  float dim = mix(1.0, 0.72, uDimmer);

  gl_FragColor = vec4(col * energy * dim, alpha * dim);

  // Premultiply for better compositing on glass backgrounds
  gl_FragColor.rgb *= gl_FragColor.a;
}
`;

// ----------------------------------------------------------------------------
// Small math helpers
// ----------------------------------------------------------------------------

function clamp01(v: number): number {
  if (v < 0) return 0;
  if (v > 1) return 1;
  return v;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export default SceneController;
