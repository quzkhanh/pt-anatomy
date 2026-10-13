import { Box3, DirectionalLight, HemisphereLight, PerspectiveCamera, Scene, Vector2, Vector3, WebGLRenderer } from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import type { PartRef } from '../content'
import { LIGHTING, readThemeColors } from '../theme'
import { applyHighlight, createMaterials, isMuscleVisible, type HighlightState } from './highlight'
import { createCameraRig } from './camera'
import { buildBoundsTrees, loadBody } from './model'
import { createPicker } from './picking'
import { QUALITY, QualityGovernor } from './quality'

const MODEL_URL = `${import.meta.env.BASE_URL}models/body.glb`
const TAP_SLOP_PX = 6
const CAMERA = { fov: 35, near: 0.01, far: 20, distance: 1.6, minDistance: 0.25, maxDistance: 2.5 }
const SUN_POSITION = new Vector3(1, 2, 3)

export interface ViewerStats {
  fps: number
  pickMs: number
  pixelRatio: number
  readyMs: number
}

export interface Viewer {
  select(muscleId: string | null): void
  setSuperficialHidden(hidden: boolean): void
  flip(): void
  focus(muscleId: string): void
  screenPoint(muscleId: string): { x: number; y: number } | null
  stats(): ViewerStats
  dispose(): void
}

interface ViewerOptions {
  onPick: (ref: PartRef | null) => void
  onProgress: (fraction: number | null) => void
}

declare global {
  interface Window {
    __ptDebug?: Viewer
  }
}

export async function createViewer(canvas: HTMLCanvasElement, { onPick, onProgress }: ViewerOptions): Promise<Viewer> {
  const body = await loadBody(MODEL_URL, onProgress)
  const colors = readThemeColors()
  const renderer = new WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' })
  const governor = new QualityGovernor(Math.min(devicePixelRatio, QUALITY.maxRatio))
  renderer.setPixelRatio(governor.ratio)

  const scene = new Scene()
  scene.background = colors.background
  const camera = new PerspectiveCamera(CAMERA.fov, 1, CAMERA.near, CAMERA.far)
  const sun = new DirectionalLight(LIGHTING.sky, LIGHTING.sun)
  sun.position.copy(SUN_POSITION)
  camera.add(sun)
  scene.add(new HemisphereLight(LIGHTING.sky, LIGHTING.ground, LIGHTING.hemisphere), camera, body.root)

  const materials = createMaterials(colors)
  for (const mesh of body.head) mesh.material = materials.head
  const state: HighlightState = { selected: null, superficialHidden: false }
  applyHighlight(body, materials, state)

  const center = body.bounds.getCenter(new Vector3()).setX(0)
  const height = body.bounds.getSize(new Vector3()).y
  const controls = new OrbitControls(camera, canvas)
  controls.enableDamping = true
  controls.enablePan = false
  controls.target.copy(center)
  controls.minDistance = height * CAMERA.minDistance
  controls.maxDistance = height * CAMERA.maxDistance
  camera.position.set(0, center.y, center.z + height * CAMERA.distance)

  let needsRender = true
  const requestRender = () => {
    needsRender = true
  }
  controls.addEventListener('change', requestRender)
  const rig = createCameraRig(camera, controls, requestRender)
  controls.addEventListener('start', rig.cancel)
  const update = () => {
    applyHighlight(body, materials, state)
    requestRender()
  }

  const pick = createPicker(camera, canvas, body.muscles, body.head)
  let pickMs = 0
  const down = new Vector2()
  const onPointerDown = (e: PointerEvent) => down.set(e.clientX, e.clientY)
  const onPointerUp = (e: PointerEvent) => {
    if (down.distanceTo(new Vector2(e.clientX, e.clientY)) > TAP_SLOP_PX) return
    const started = performance.now()
    const hit = pick(e.clientX, e.clientY)
    state.selected = hit?.ref.muscle.id ?? null
    update()
    pickMs = performance.now() - started
    onPick(hit?.ref ?? null)
  }
  canvas.addEventListener('pointerdown', onPointerDown)
  canvas.addEventListener('pointerup', onPointerUp)

  const resize = () => {
    renderer.setSize(canvas.clientWidth, canvas.clientHeight, false)
    camera.aspect = canvas.clientWidth / canvas.clientHeight
    camera.updateProjectionMatrix()
    requestRender()
  }
  const observer = new ResizeObserver(resize)
  observer.observe(canvas)
  resize()

  let fps = 0
  let frames = 0
  let second = performance.now()
  renderer.setAnimationLoop((now) => {
    const animating = rig.update(now)
    controls.update()
    if (!needsRender && !animating) return
    needsRender = false
    renderer.render(scene, camera)
    frames++
    if (now - second >= 1000) {
      fps = frames
      frames = 0
      second = now
    }
    if (governor.frame(now)) {
      renderer.setPixelRatio(governor.ratio)
      needsRender = true
    }
  })
  renderer.render(scene, camera)
  const readyMs = performance.now()
  // Building BVHs takes a few hundred ms on phones; do it after the first frame is on screen.
  requestAnimationFrame(() => setTimeout(() => buildBoundsTrees(body)))

  const centerOf = (muscleId: string) => {
    const mesh = body.muscles.find((m) => m.ref.muscle.id === muscleId && !m.mirrored)?.mesh
    return mesh ? new Box3().setFromObject(mesh).getCenter(new Vector3()) : null
  }

  return {
    select(muscleId) {
      state.selected = muscleId
      update()
    },
    setSuperficialHidden(hidden) {
      state.superficialHidden = hidden
      applyHighlight(body, materials, state)
      if (state.selected && !isMuscleVisible(body, state.selected)) {
        state.selected = null
        onPick(null)
      }
      update()
    },
    flip: rig.flip,
    focus(muscleId) {
      const point = centerOf(muscleId)
      if (point) rig.faceTowards(point)
    },
    screenPoint(muscleId) {
      const point = centerOf(muscleId)?.project(camera)
      if (!point) return null
      const rect = canvas.getBoundingClientRect()
      return { x: rect.left + ((point.x + 1) / 2) * rect.width, y: rect.top + ((1 - point.y) / 2) * rect.height }
    },
    stats: () => ({ fps, pickMs, pixelRatio: governor.ratio, readyMs }),
    dispose() {
      renderer.setAnimationLoop(null)
      observer.disconnect()
      canvas.removeEventListener('pointerdown', onPointerDown)
      canvas.removeEventListener('pointerup', onPointerUp)
      controls.dispose()
      renderer.dispose()
    },
  }
}
