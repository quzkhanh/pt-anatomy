export {}

declare global {
  interface Window {
    __ptDebug?: {
      flip(): void
      screenPoint(muscleId: string): { x: number; y: number } | null
      stats(): { fps: number; pickMs: number; pixelRatio: number; readyMs: number }
    }
  }
}
