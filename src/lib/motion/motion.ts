import { lerpPose, type Pose, type Vec } from './pose'

/** Where a moving prop is held: between the grips, one grip, an ankle, or across the hips. */
export type Attach = 'grips' | 'gripL' | 'gripR' | 'ankleL' | 'ankleR' | 'kneeL' | 'kneeR' | 'shoulderL' | 'shoulderR' | 'hips'

export type PropSpec =
  | { kind: 'barbell'; at: Attach }
  /** `upright`: held vertically by its top head (goblet hold, two-hand overhead extension). */
  | { kind: 'dumbbell'; at: Attach; grip?: 'across' | 'neutral' | 'upright' }
  | { kind: 'kettlebell'; at: Attach }
  | { kind: 'wheel'; at: Attach }
  | { kind: 'cable'; from: Vec; to: Attach }
  /**
   * Machine pad that moves with the body (leg-extension shin pad, calf-raise shoulder pad): a roller
   * across the body resting on the `face` side of the joint ('front' = flexor/anterior side of that limb).
   * 'outside'/'inside' pads (hip abduction/adduction machines) stand upright against that side of the joint.
   */
  | {
      kind: 'roller'
      at: Attach
      face: 'front' | 'back' | 'top' | 'outside' | 'inside'
      /** Pad length in metres (default 0.32) and its sideways shift away from the midline (default 0). */
      length?: number
      outward?: number
      /** Slide the pad along the limb towards the next joint up (ankle → knee, knee → hip), metres. */
      slide?: number
    }
  /** A straight hand-held bar of `length` (lat-pulldown bar, cable straight bar), centred between the grips. */
  | { kind: 'handle'; at: Attach; length: number }
  /** A bar pivoting on the floor at `pivot`, held at `at` (T-bar, landmine); `plates` loads discs near the hands. */
  | { kind: 'lever'; pivot: Vec; at: Attach; plates?: boolean; /** Bar length past the hands, m (default 0.2). */ overhang?: number }
  | { kind: 'band'; a: Attach; b: Attach }
  /** A flat plate under both soles that moves with the feet (leg-press footplate). `size` = [width, length] in metres. */
  | { kind: 'sole'; size: [number, number] }
  /** Flat-topped box: benches, seats, pads, steps. `rot` in degrees. */
  | { kind: 'block'; center: Vec; size: Vec; rot?: Vec }
  /** Static bar: pull-up bar, dip bars, machine frames. */
  | { kind: 'rod'; from: Vec; to: Vec; radius?: number }

export interface Key {
  /** Position in the cycle, 0 ≤ t < 1, increasing. */
  t: number
  pose: Pose
  /** Short Vietnamese label of the movement phase that starts at this key, e.g. "Hạ xuống". */
  phase: string
}

export interface Motion {
  keys: Key[]
  props: PropSpec[]
  /** Seconds per repetition at 1× speed. */
  seconds: number
}

const ease = (x: number) => x * x * (3 - 2 * x)
const clamp01 = (x: number) => Math.min(1, Math.max(0, x))

/**
 * Pose at cycle position `t` (wraps). Consecutive keys with the same phase label form one movement:
 * it is eased once (start and end) and passes through its middle keys at speed instead of stalling;
 * the last key blends back into the first.
 */
export function sampleMotion(motion: Motion, t: number) {
  const { keys } = motion
  const n = keys.length
  const u = ((t % 1) + 1) % 1
  let i = n - 1
  while (i > 0 && keys[i].t > u) i--
  const phase = keys[i].phase
  let first = i
  while (first > 0 && keys[first - 1].phase === phase) first--
  let next = i + 1
  while (next < n && keys[next].phase === phase) next++
  const start = keys[first].t
  const end = next < n ? keys[next].t : 1 + keys[0].t
  const tt = start + ease(clamp01((u - start) / (end - start))) * (end - start)
  let j = first
  while (j + 1 < next && keys[j + 1].t <= tt) j++
  const a = keys[j]
  const b = j + 1 < n ? keys[j + 1] : keys[0]
  const bt = j + 1 < n ? b.t : 1 + b.t
  return { pose: lerpPose(a.pose, b.pose, bt === a.t ? 0 : clamp01((tt - a.t) / (bt - a.t))), phase }
}
