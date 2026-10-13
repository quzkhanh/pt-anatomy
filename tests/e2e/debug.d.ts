export {}

declare global {
  interface Window {
    __ptDebug?: {
      flip(): void
      screenPoint(ref: string): { x: number; y: number } | null
      stats(): { fps: number; pickMs: number; pixelRatio: number; readyMs: number }
    }
  }
}
