import {
  Box3,
  CircleGeometry,
  DirectionalLight,
  HemisphereLight,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  Scene,
  Spherical,
  Vector3,
  WebGLRenderer,
} from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { LIGHTING, readThemeColors } from '../theme'
import type { Highlight } from '../viewer/highlight'
import { rimMaterial } from '../viewer/material'
import { createMannequin } from './mannequin'
import { sampleMotion, type Motion } from './motion'
import { solvePose } from './pose'
import { createProps } from './props'

const FOV = 32
const FIT_MARGIN = 1.05
const FRAME_SAMPLES = 16
const SUN_POSITION = new Vector3(2, 3, 1.5)
const FLOOR_RADIUS = 1.4
const ELEVATION = Math.PI / 2.3
const MAX_PIXEL_RATIO = 2
const PROP_RIM = 0.1

/** Camera azimuths (radians) for the view buttons. The 3/4 view is the default: a side view lets plates hide the body. */
export const VIEWS = { front: 0, angle: -Math.PI / 4, side: -Math.PI / 2, back: Math.PI } as const
export type View = keyof typeof VIEWS

export function createMotionPlayer(canvas: HTMLCanvasElement, onPhase: (phase: string) => void) {
  const colors = readThemeColors()
  const renderer = new WebGLRenderer({ canvas, antialias: true })
  renderer.setPixelRatio(Math.min(devicePixelRatio, MAX_PIXEL_RATIO))
  const scene = new Scene()
  scene.background = colors.background
  const camera = new PerspectiveCamera(FOV, 1, 0.05, 30)
  const sun = new DirectionalLight(colors.sky, LIGHTING.sun)
  sun.position.copy(SUN_POSITION)
  camera.add(sun)
  scene.add(new HemisphereLight(colors.sky, colors.ground, LIGHTING.hemisphere), camera)
  const floor = new Mesh(new CircleGeometry(FLOOR_RADIUS, 48), new MeshBasicMaterial({ color: colors.floor }))
  floor.rotation.x = -Math.PI / 2
  scene.add(floor)

  const mannequin = createMannequin(
    { skin: colors.muscle, primary: colors.selected, secondary: colors.secondary, rim: colors.rim },
    LIGHTING.rim,
  )
  scene.add(mannequin.root)
  const propMaterials = {
    metal: rimMaterial(colors.prop, colors.rim, PROP_RIM),
    heavy: rimMaterial(colors.propHeavy, colors.rim, PROP_RIM),
    pad: rimMaterial(colors.pad, colors.rim, PROP_RIM),
    band: rimMaterial(colors.band, colors.rim, PROP_RIM),
  }
  let props: ReturnType<typeof createProps> | null = null

  const controls = new OrbitControls(camera, canvas)
  // No damping: with the loop paused nothing would call controls.update() to finish the glide.
  controls.enableDamping = false
  controls.enablePan = false

  let motion: Motion | null = null
  let time = 0
  let speed = 1
  let playing = true
  let visible = true
  let frame = 0
  let last = 0
  let phase = ''

  function draw() {
    if (!motion) return
    const sample = sampleMotion(motion, time)
    const joints = solvePose(sample.pose)
    mannequin.update(joints)
    props?.update(joints)
    if (sample.phase !== phase) onPhase((phase = sample.phase))
    controls.update()
    renderer.render(scene, camera)
  }

  function loop(now: number) {
    if (motion) time = (time + ((now - last) / 1000) * (speed / motion.seconds)) % 1
    last = now
    draw()
    // Keep the clock running across frames: re-reading performance.now() here would drop each frame's draw time.
    frame = requestAnimationFrame(loop)
  }

  const schedule = () => {
    if (!frame && playing && visible && motion) {
      last = performance.now()
      frame = requestAnimationFrame(loop)
    }
  }
  const stop = () => {
    cancelAnimationFrame(frame)
    frame = 0
  }

  /** Frame the whole repetition: union of every joint over the cycle plus the static props. */
  function fit(m: Motion) {
    const box = new Box3()
    for (let i = 0; i < FRAME_SAMPLES; i++) {
      const j = solvePose(sampleMotion(m, i / FRAME_SAMPLES).pose)
      for (const p of [j.head, j.pelvis, j.l.grip, j.r.grip, j.l.toe, j.r.toe, j.l.heel, j.r.heel, j.l.elbow, j.r.elbow, j.l.knee, j.r.knee]) box.expandByPoint(p)
      // Held props (bar plates overhead) widen the frame too.
      props?.update(j)
      if (props) box.union(new Box3().setFromObject(props.root))
    }
    const center = box.getCenter(new Vector3())
    const radius = box.getSize(new Vector3()).length() / 2
    const distance = (radius * FIT_MARGIN) / Math.sin((FOV * Math.PI) / 360)
    controls.target.copy(center)
    floor.position.set(center.x, 0, center.z)
    controls.minDistance = distance * 0.5
    controls.maxDistance = distance * 2
    const s = new Spherical().setFromVector3(camera.position.clone().sub(center))
    camera.position.setFromSpherical(new Spherical(distance, ELEVATION, motion ? s.theta : VIEWS.angle)).add(center)
    camera.lookAt(center)
  }

  function resize() {
    const { clientWidth: w, clientHeight: h } = canvas
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    camera.updateProjectionMatrix()
    draw()
  }
  const observer = new ResizeObserver(resize)
  observer.observe(canvas)
  controls.addEventListener('change', () => !frame && renderer.render(scene, camera))

  return {
    setMotion(next: Motion, highlight: Highlight) {
      if (props) {
        scene.remove(props.root)
        props.dispose()
      }
      props = createProps(next.props, propMaterials)
      scene.add(props.root)
      mannequin.setHighlight(highlight)
      fit(next)
      motion = next
      time = 0
      phase = ''
      draw()
      schedule()
    },
    setPlaying(next: boolean) {
      playing = next
      if (next) schedule()
      else stop()
    },
    setVisible(next: boolean) {
      visible = next
      if (next) schedule()
      else stop()
    },
    setSpeed: (next: number) => (speed = next),
    setView(view: View) {
      const s = new Spherical().setFromVector3(camera.position.clone().sub(controls.target))
      s.theta = VIEWS[view]
      camera.position.setFromSpherical(s).add(controls.target)
      camera.lookAt(controls.target)
      draw()
    },
    /** Whether a frame is scheduled; lets tests check the loop stops when hidden. */
    running: () => frame !== 0,
    /** For tests and screenshots: jump to a cycle position and draw once. */
    seek(t: number) {
      time = t
      draw()
    },
    dispose() {
      stop()
      observer.disconnect()
      controls.dispose()
      mannequin.dispose()
      props?.dispose()
      for (const m of Object.values(propMaterials)) m.dispose()
      floor.geometry.dispose()
      floor.material.dispose()
      renderer.dispose()
      // Browsers cap live WebGL contexts (~16) and drop the oldest — the main body viewer.
      renderer.forceContextLoss()
    },
  }
}

export type MotionPlayer = ReturnType<typeof createMotionPlayer>

declare global {
  interface Window {
    __ptMotion?: MotionPlayer
  }
}
