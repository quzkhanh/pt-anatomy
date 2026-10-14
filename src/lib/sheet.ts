export type Snap = 'peek' | 'half' | 'full'

const SNAPS: Snap[] = ['peek', 'half', 'full']
const FLICK_PX_PER_MS = 0.5
const SNAP_EPSILON_PX = 1

/**
 * Snap to settle on after a drag ends at `offset` (px from fully open). A fast flick goes to the next snap
 * in its direction from where the sheet is now (negative velocity = upwards = more open); a slow release
 * picks the nearest snap.
 */
export function settle(offsets: Record<Snap, number>, offset: number, velocity: number): Snap {
  if (Math.abs(velocity) > FLICK_PX_PER_MS) {
    const up = velocity < 0
    const ahead = SNAPS.filter((s) => (up ? offsets[s] < offset - SNAP_EPSILON_PX : offsets[s] > offset + SNAP_EPSILON_PX))
    if (!ahead.length) return up ? 'full' : 'peek'
    return ahead.reduce((best, s) => (Math.abs(offsets[s] - offset) < Math.abs(offsets[best] - offset) ? s : best))
  }
  return SNAPS.reduce((best, s) => (Math.abs(offsets[s] - offset) < Math.abs(offsets[best] - offset) ? s : best))
}

const DRAG_SLOP_PX = 8

export interface PointerSample {
  pointerId: number
  clientY: number
  timeStamp: number
}

/**
 * Drag state for a bottom sheet. Only the first pointer drives it; a drag starts after a small slop so
 * taps on buttons inside still work. `onOffset(null)` means "no drag: show the current snap".
 */
export function createSheetDrag(
  current: () => { snap: Snap; offsets: Record<Snap, number> },
  onOffset: (offset: number | null) => void,
  onSnap: (snap: Snap) => void,
) {
  let g: { id: number; startY: number; startOffset: number; lastY: number; lastT: number; velocity: number; active: boolean; offset: number } | null =
    null
  return {
    begin(e: PointerSample) {
      if (g) return
      const { snap, offsets } = current()
      g = { id: e.pointerId, startY: e.clientY, startOffset: offsets[snap], lastY: e.clientY, lastT: e.timeStamp, velocity: 0, active: false, offset: offsets[snap] }
    },
    /** Returns true on the move that starts the drag, so the caller can capture the pointer. */
    move(e: PointerSample): boolean {
      if (!g || e.pointerId !== g.id) return false
      const dy = e.clientY - g.startY
      const starting = !g.active && Math.abs(dy) >= DRAG_SLOP_PX
      if (!g.active && !starting) return false
      g.active = true
      g.velocity = (e.clientY - g.lastY) / Math.max(1, e.timeStamp - g.lastT)
      g.lastY = e.clientY
      g.lastT = e.timeStamp
      g.offset = Math.min(current().offsets.peek, Math.max(0, g.startOffset + dy))
      onOffset(g.offset)
      return starting
    },
    end(e: PointerSample) {
      if (!g || e.pointerId !== g.id) return
      const { active, offset, velocity } = g
      g = null
      onOffset(null)
      if (active) onSnap(settle(current().offsets, offset, velocity))
    },
    cancel() {
      g = null
      onOffset(null)
    },
  }
}
