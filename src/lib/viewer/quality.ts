export const QUALITY = {
  minFps: 45,
  windowMs: 2000,
  // Rendering is on-demand: a gap this long means interaction stopped, so the window restarts.
  gapMs: 250,
  step: 0.25,
  minRatio: 1,
  maxRatio: 2,
} as const

export class QualityGovernor {
  ratio: number
  private times: number[] = []

  constructor(ratio: number) {
    this.ratio = ratio
  }

  frame(now: number): boolean {
    const t = this.times
    if (t.length && now - t[t.length - 1] > QUALITY.gapMs) t.length = 0
    t.push(now)
    const span = now - t[0]
    if (span < QUALITY.windowMs) return false
    const fps = ((t.length - 1) * 1000) / span
    while (now - t[0] > QUALITY.windowMs) t.shift()
    if (fps >= QUALITY.minFps || this.ratio <= QUALITY.minRatio) return false
    this.ratio = Math.max(QUALITY.minRatio, this.ratio - QUALITY.step)
    t.length = 0
    return true
  }
}
