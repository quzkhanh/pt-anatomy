import { MathUtils, Spherical, Vector3, type PerspectiveCamera } from 'three'
import type { OrbitControls } from 'three/addons/controls/OrbitControls.js'

const TWEEN_MS = 450

const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches
const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2)

export function createCameraRig(camera: PerspectiveCamera, controls: OrbitControls, requestRender: () => void) {
  const offset = new Vector3()
  let tween: { from: Spherical; to: Spherical; start: number } | null = null

  const current = () => new Spherical().setFromVector3(offset.copy(camera.position).sub(controls.target))
  const place = (s: Spherical) => {
    camera.position.setFromSpherical(s).add(controls.target)
    camera.lookAt(controls.target)
  }

  function orbitTo(theta: number) {
    const from = current()
    const to = from.clone()
    to.theta = from.theta + Math.atan2(Math.sin(theta - from.theta), Math.cos(theta - from.theta))
    tween = null
    if (reducedMotion()) place(to)
    else tween = { from, to, start: performance.now() }
    requestRender()
  }

  return {
    flip: () => orbitTo((tween?.to.theta ?? current().theta) + Math.PI),
    turn: (radians: number) => orbitTo((tween?.to.theta ?? current().theta) + radians),
    faceTowards: (point: Vector3) =>
      orbitTo(Math.atan2(point.x - controls.target.x, point.z - controls.target.z)),
    cancel: () => {
      tween = null
    },
    update(now: number): boolean {
      if (!tween) return false
      const t = Math.min(1, (now - tween.start) / TWEEN_MS)
      const s = tween.from.clone()
      s.theta = MathUtils.lerp(tween.from.theta, tween.to.theta, easeInOut(t))
      place(s)
      if (t === 1) tween = null
      return true
    },
  }
}
