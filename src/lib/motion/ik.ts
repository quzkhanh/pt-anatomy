import { Vector3 } from 'three'

const EPS = 1e-6
const FALLBACK_AXES = [new Vector3(0, 0, 1), new Vector3(1, 0, 0)]

/** Unit vector of `v` with its component along unit `axis` removed, or null when nothing is left. */
function orthogonal(v: Vector3, axis: Vector3): Vector3 | null {
  const out = v.clone().addScaledVector(axis, -v.dot(axis))
  return out.lengthSq() < EPS ? null : out.normalize()
}

/**
 * Analytic two-bone IK (law of cosines). The middle joint bends towards `pole`, a direction in world
 * space. A target out of reach straightens the limb towards it; the result never contains NaN.
 * `bend` is the unit direction the middle joint was pushed towards (orthogonal to root→target).
 */
export function solveTwoBone(root: Vector3, target: Vector3, pole: Vector3, a: number, b: number) {
  const toTarget = target.clone().sub(root)
  const distance = Math.min(Math.max(toTarget.length(), Math.abs(a - b) + EPS), a + b - EPS)
  const dir = toTarget.lengthSq() < EPS ? (orthogonal(pole, new Vector3(0, 1, 0)) ?? new Vector3(0, -1, 0)) : toTarget.normalize()
  const bend =
    orthogonal(pole, dir) ?? FALLBACK_AXES.map((axis) => orthogonal(axis, dir)).find((v) => v !== null)!
  const cosRoot = Math.min(1, Math.max(-1, (a * a + distance * distance - b * b) / (2 * a * distance)))
  const sinRoot = Math.sqrt(1 - cosRoot * cosRoot)
  const mid = root.clone().addScaledVector(dir, a * cosRoot).addScaledVector(bend, a * sinRoot)
  const end = root.clone().addScaledVector(dir, distance)
  return { mid, end: mid.clone().add(end.sub(mid).setLength(b)), bend }
}
