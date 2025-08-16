/**
 * PostProcessing
 * - Wraps EffectComposer with RenderPass + optional passes (Bloom, FXAA/SMAA).
 * - Always constructs a composer, even if HDR/post is disabled (prevents null calls).
 * - Safe setSize(): tolerates partial init and updates AA uniforms.
 */

import {
  WebGLRenderer,
  Scene,
  Camera,
  NoToneMapping,
  ACESFilmicToneMapping,
} from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { SMAAPass } from "three/examples/jsm/postprocessing/SMAAPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { FXAAShader } from "three/examples/jsm/shaders/FXAAShader.js";

export type PostOptions = {
  /** enable HDR tone mapping path */
  hdrEnabled: boolean;
  /** tone mapping exposure */
  exposure: number; // [0.6..1.6] (clamped by store)
  /** which AA should be used; if both false, no post AA */
  aaEnabled: boolean; // for V1, we use FXAA by default when true
  /** scene bloom strength, 0 disables the pass */
  bloomStrength: number; // [0..~0.35]
  /** DPR override from guard (0.5..1) */
  bufferScale: number; // DPR scale from FpsGuard/useVizStore
};

export class PostProcessing {
  private renderer: WebGLRenderer;
  private composer?: EffectComposer;
  private renderPass?: RenderPass;
  private bloomPass?: UnrealBloomPass;
  private smaaPass?: SMAAPass;
  private fxaaPass?: ShaderPass;

  private width = 1;
  private height = 1;
  private dpr = 1;

  private _opts: PostOptions;

  constructor(renderer: WebGLRenderer, scene: Scene, camera: Camera, opts: PostOptions) {
    this.renderer = renderer;
    this._opts = opts;

    // Initialize renderer tone mapping path
    this.applyHdr(opts.hdrEnabled, opts.exposure);

    // Create composer + passes immediately (composer always exists)
    this.composer = new EffectComposer(this.renderer);

    this.renderPass = new RenderPass(scene, camera);
    this.composer.addPass(this.renderPass);

    // Bloom (enabled when strength > 0)
    if (opts.bloomStrength > 0) {
      const bloom = new UnrealBloomPass(/* resolution */ undefined as any, /* strength */ opts.bloomStrength, /* radius */ 0.4, /* threshold */ 0.85);
      this.bloomPass = bloom;
      this.composer.addPass(bloom);
    }

    // AA: prefer FXAA for simplicity and perf (SMAA optional if you toggle later)
    if (opts.aaEnabled) {
      this.fxaaPass = new ShaderPass(FXAAShader);
      this.composer.addPass(this.fxaaPass);
      // SMAA alternative: uncomment to experiment, but only enable one AA pass at once
      // this.smaaPass = new SMAAPass(this.width, this.height);
      // this.composer.addPass(this.smaaPass);
    }
  }

  /** Apply HDR/tone-mapping mode + exposure */
  private applyHdr(hdrOn: boolean, exposure: number) {
    if (hdrOn) {
      this.renderer.toneMapping = ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = exposure;
    } else {
      this.renderer.toneMapping = NoToneMapping;
      this.renderer.toneMappingExposure = 1.0;
    }
  }

  /** Update size and DPR (call on init and on resize) */
  setSize(width: number, height: number, devicePixelRatio: number) {
    // record desired values
    this.width = Math.max(1, Math.floor(width));
    this.height = Math.max(1, Math.floor(height));
    this.dpr = Math.max(0.25, Math.min(2, devicePixelRatio)); // clamp for safety

    // Update renderer first
    this.renderer.setPixelRatio(this.dpr * (this._opts.bufferScale || 1));
    this.renderer.setSize(this.width, this.height, false);

    // Composer may not exist momentarily if constructor errored; guard calls
    if (this.composer) {
      this.composer.setPixelRatio(this.dpr * (this._opts.bufferScale || 1));
      this.composer.setSize(this.width, this.height);
    }

    // FXAA uniform expects inverse resolution in *rendering* pixels
    if (this.fxaaPass && this.fxaaPass.uniforms?.["resolution"]) {
      const invW = 1 / (this.width * this.dpr);
      const invH = 1 / (this.height * this.dpr);
      this.fxaaPass.uniforms["resolution"].value.set(invW, invH);
    }

    // SMAA size update (if used)
    if (this.smaaPass) {
      this.smaaPass.setSize(this.width, this.height);
    }
  }

  /** Toggle HDR on/off and update exposure */
  setHdrEnabled(on: boolean) {
    this._opts.hdrEnabled = !!on;
    this.applyHdr(this._opts.hdrEnabled, this._opts.exposure);
  }

  setExposure(exposure: number) {
    this._opts.exposure = exposure;
    this.applyHdr(this._opts.hdrEnabled, this._opts.exposure);
  }

  /** Enable/disable post AA; rebuild AA pass in place */
  setAAEnabled(on: boolean) {
    this._opts.aaEnabled = !!on;

    if (!this.composer) return;

    // Remove existing AA passes if present
    if (this.fxaaPass) {
      this.composer.removePass(this.fxaaPass);
      this.fxaaPass.dispose?.();
      this.fxaaPass = undefined;
    }
    if (this.smaaPass) {
      this.composer.removePass(this.smaaPass);
      (this.smaaPass as any).dispose?.();
      this.smaaPass = undefined;
    }

    if (this._opts.aaEnabled) {
      // Re-add FXAA (default)
      this.fxaaPass = new ShaderPass(FXAAShader);
      this.composer.addPass(this.fxaaPass);
      // Recompute resolution uniforms
      if (this.fxaaPass.uniforms?.["resolution"]) {
        const invW = 1 / (this.width * this.dpr);
        const invH = 1 / (this.height * this.dpr);
        this.fxaaPass.uniforms["resolution"].value.set(invW, invH);
      }
    }
  }

  /** Adjust bloom strength dynamically; add/remove pass if toggled to/from zero */
  setBloomStrength(strength: number) {
    this._opts.bloomStrength = Math.max(0, strength);

    if (!this.composer) return;

    if (this._opts.bloomStrength <= 0) {
      if (this.bloomPass) {
        this.composer.removePass(this.bloomPass);
        (this.bloomPass as any).dispose?.();
        this.bloomPass = undefined;
      }
      return;
    }

    if (!this.bloomPass) {
      this.bloomPass = new UnrealBloomPass(undefined as any, this._opts.bloomStrength, 0.4, 0.85);
      this.composer.addPass(this.bloomPass);
    } else {
      this.bloomPass.strength = this._opts.bloomStrength;
    }
  }

  /** Change DPR scaling from guard/store and re-apply */
  setBufferScale(scale: number) {
    this._opts.bufferScale = scale;
    this.setSize(this.width, this.height, this.dpr);
  }

  /** Render one frame (always via composer to keep codepath consistent) */
  render() {
    this.composer?.render();
  }

  /** Cleanup */
  dispose() {
    this.bloomPass = undefined;
    this.fxaaPass = undefined;
    this.smaaPass = undefined;
    if (this.composer) {
      // EffectComposer lacks a formal dispose in older examples; GC will collect.
      this.composer = undefined;
    }
  }
}
