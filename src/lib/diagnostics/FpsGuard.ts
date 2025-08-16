// src/lib/diagnostics/FpsGuard.ts
// Purpose: Maintain 55–60 FPS by applying a conservative quality ladder.
// Order: disable bloom -> disable AA -> reduce particles -> reduce buffer scale.
// Includes hysteresis to avoid thrash. All mutations are pushed via callbacks,
// so this module stays decoupled from React and the Three scene controller.

type LadderControls = {
  /** Bloom on/off and strength setter */
  setBloomEnabled: (on: boolean) => void;
  /** Toggle anti‑aliasing (FXAA/SMAA) */
  setAaEnabled: (on: boolean) => void;
  /** Mutate particle count target (the visualizer should rebuild geometry off this) */
  setParticleBudget: (count: number) => void;
  /** Adjust offscreen buffer scale (e.g., renderer.setPixelRatio or composer ratio) */
  setBufferScale: (scale: number) => void;
  /** Read current budgets to compute next step */
  getState: () => {
    bloomEnabled: boolean;
    aaEnabled: boolean;
    particleBudget: number; // current target
    bufferScale: number; // 0.5..1
  };
};

export type FpsGuardOptions = {
  targetFps?: number; // default 58
  lowerHysteresis?: number; // default 55 (apply)
  upperHysteresis?: number; // default 59 (recover)
  windowSize?: number; // samples in rolling window; default 60 (approx 1s @60Hz)
  checkIntervalMs?: number; // throttle decisions; default 800ms
  minParticles?: number; // absolute floor
  maxParticles?: number; // optional for recovery
  minBufferScale?: number; // 0.5
  maxBufferScale?: number; // 1
};

export class FpsGuard {
  private rafId: number | null = null;
  private lastTs = 0;
  private fpsSamples: number[] = [];
  private lastDecision = 0;

  private opts: Required<FpsGuardOptions>;
  private ctl: LadderControls;
  private paused = false;
  private recovering = false;

  constructor(controls: LadderControls, opts: FpsGuardOptions = {}) {
    this.ctl = controls;
    this.opts = {
      targetFps: opts.targetFps ?? 58,
      lowerHysteresis: opts.lowerHysteresis ?? 55,
      upperHysteresis: opts.upperHysteresis ?? 59,
      windowSize: opts.windowSize ?? 60,
      checkIntervalMs: opts.checkIntervalMs ?? 800,
      minParticles: opts.minParticles ?? 8_000,
      maxParticles: opts.maxParticles ?? 120_000,
      minBufferScale: opts.minBufferScale ?? 0.5,
      maxBufferScale: opts.maxBufferScale ?? 1.0,
    };
  }

  start() {
    if (this.rafId !== null) return;
    this.lastTs = performance.now();
    const loop = (t: number) => {
      const dt = t - this.lastTs;
      this.lastTs = t;
      if (dt > 0) {
        const fps = 1000 / dt;
        this.recordFps(fps);
      }
      this.rafId = requestAnimationFrame(loop);
    };
    this.rafId = requestAnimationFrame(loop);
  }

  stop() {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  pause(p: boolean) {
    this.paused = p;
  }

  private recordFps(fps: number) {
    const w = this.opts.windowSize;
    this.fpsSamples.push(Math.min(120, Math.max(1, fps)));
    if (this.fpsSamples.length > w) this.fpsSamples.shift();

    const now = performance.now();
    if (now - this.lastDecision < this.opts.checkIntervalMs) return;
    this.lastDecision = now;

    if (this.paused || this.fpsSamples.length < w * 0.5) return;

    const avg = this.fpsSamples.reduce((a, b) => a + b, 0) / this.fpsSamples.length;

    if (avg < this.opts.lowerHysteresis) {
      this.applyLadderDown();
      this.recovering = false;
      return;
    }

    if (avg > this.opts.upperHysteresis) {
      // Consider stepping back up cautiously
      this.applyLadderUp();
      this.recovering = true;
    }
  }

  private applyLadderDown() {
    const s = this.ctl.getState();

    // 1) Disable bloom
    if (s.bloomEnabled) {
      this.ctl.setBloomEnabled(false);
      return;
    }

    // 2) Disable AA
    if (s.aaEnabled) {
      this.ctl.setAaEnabled(false);
      return;
    }

    // 3) Reduce particles by ~12.5%
    if (s.particleBudget > this.opts.minParticles) {
      const next = Math.max(this.opts.minParticles, Math.floor(s.particleBudget * 0.875));
      this.ctl.setParticleBudget(next);
      return;
    }

    // 4) Reduce buffer scale by 0.05 steps
    if (s.bufferScale > this.opts.minBufferScale) {
      const next = Math.max(this.opts.minBufferScale, parseFloat((s.bufferScale - 0.05).toFixed(2)));
      this.ctl.setBufferScale(next);
      return;
    }
  }

  private applyLadderUp() {
    const s = this.ctl.getState();

    // Recover in reverse order, one step at a time
    // 4) Increase buffer scale
    if (s.bufferScale < this.opts.maxBufferScale) {
      const next = Math.min(this.opts.maxBufferScale, parseFloat((s.bufferScale + 0.05).toFixed(2)));
      this.ctl.setBufferScale(next);
      return;
    }

    // 3) Increase particles by ~12.5%
    if (s.particleBudget < this.opts.maxParticles) {
      const next = Math.min(this.opts.maxParticles, Math.floor(s.particleBudget * 1.125));
      this.ctl.setParticleBudget(next);
      return;
    }

    // 2) Re-enable AA
    if (!s.aaEnabled) {
      this.ctl.setAaEnabled(true);
      return;
    }

    // 1) Re-enable bloom
    if (!s.bloomEnabled) {
      // Let guard opt back in; UI can cap strength elsewhere.
      this.ctl.setBloomEnabled(true);
      return;
    }
  }

  getAverages() {
    const avg =
      this.fpsSamples.length === 0
        ? 0
        : this.fpsSamples.reduce((a, b) => a + b, 0) / this.fpsSamples.length;
    return { avg, samples: this.fpsSamples.length };
  }
}
