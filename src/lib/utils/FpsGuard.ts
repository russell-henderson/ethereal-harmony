// src/lib/utils/FpsGuard.ts
export type AdjustDir = 'up' | 'down'

export class FpsGuard {
  private last = performance.now()
  private emaFps = 60
  private lastAdjust = this.last
  private readonly adjustIntervalMs = 2000

  constructor(private onAdjust: (dir: AdjustDir, fps: number) => void) {}

  tick(now: number) {
    const dt = now - this.last
    this.last = now
    if (dt <= 0) return

    const inst = 1000 / dt
    this.emaFps = this.emaFps * 0.9 + inst * 0.1

    if (now - this.lastAdjust < this.adjustIntervalMs) return

    if (this.emaFps < 48) {
      this.onAdjust('down', this.emaFps)
      this.lastAdjust = now
      return
    }
    if (this.emaFps > 59) {
      this.onAdjust('up', this.emaFps)
      this.lastAdjust = now
    }
  }
}
