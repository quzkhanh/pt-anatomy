import { Box3, DirectionalLight, type Object3D, HemisphereLight, PerspectiveCamera, Scene, Vector2, Vector3, WebGLRenderer } from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import type { PartRef } from '../content'
import type { SkeletonBone } from '../content-types'
import { LIGHTING, readThemeColors } from '../theme'
import { anyVisible, applyHighlight, covers, createMaterials, NO_HIGHLIGHT, type HighlightState, type SceneHighlight } from './highlight'
import { createCameraRig } from './camera'
import { buildBoundsTrees, loadBody, loadBones, type BodyMesh, type BoneMesh } from './model'
import { createPicker } from './picking'
import { QUALITY, QualityGovernor } from './quality'

const MODEL_URL = `${import.meta.env.BASE_URL}models/body.glb`
const BONES_URL = `${import.meta.env.BASE_URL}models/bones.glb`
const TAP_SLOP_PX = 6
const CAMERA = { fov: 35, near: 0.01, far: 20, distance: 2.1, minDistance: 0.25, maxDistance: 2.5 }
const SUN_POSITION = new Vector3(2, 3, 1.5)

export interface ViewerStats {
  fps: number
  pickMs: number
  pixelRatio: number
  readyMs: number
}

export type PickHit = { kind: 'muscle'; ref: PartRef } | { kind: 'bone'; bone: SkeletonBone }

export interface Viewer {
  highlight(highlight: SceneHighlight): void
  setSuperficialHidden(hidden: boolean): void
  /** Shows bones instead of muscles; bones.glb is fetched the first time. Rejects when that fails. */
  setSkeleton(on: boolean): Promise<void>
  flip(): void
  turn(radians: number): void
  focus(refs: string[]): void
  screenPoint(ref: string): { x: number; y: number } | null
  boneScreenPoint(object: string): { x: number; y: number } | null
  stats(): ViewerStats
  dispose(): void
}

interface ViewerOptions {
  onPick: (hit: PickHit | null) => void
  onProgress: (fraction: number | null) => void
  /** The browser dropped the WebGL context (too many contexts, GPU reset): the viewer is dead. */
  onContextLost: () => void
  /** The user started rotating or zooming. */
  onGesture: () => void
}

declare global {
  interface Window {
    __ptDebug?: Viewer
  }
}

export async function createViewer(canvas: HTMLCanvasElement, { onPick, onProgress, onContextLost, onGesture }: ViewerOptions): Promise<Viewer> {
  const body = await loadBody(MODEL_URL, onProgress)
  const colors = readThemeColors()
  const renderer = new WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' })
  const governor = new QualityGovernor(Math.min(devicePixelRatio, QUALITY.maxRatio))
  renderer.setPixelRatio(governor.ratio)

  const scene = new Scene()
  scene.background = colors.background
  const camera = new PerspectiveCamera(CAMERA.fov, 1, CAMERA.near, CAMERA.far)
  const sun = new DirectionalLight(colors.sky, LIGHTING.sun)
  sun.position.copy(SUN_POSITION)
  camera.add(sun)
  scene.add(new HemisphereLight(colors.sky, colors.ground, LIGHTING.hemisphere), camera, body.root)

  const materials = createMaterials(colors)
  for (const mesh of body.head) mesh.material = materials.head
  for (const mesh of body.filler) mesh.material = materials.muscle
  const state: HighlightState = { ...NO_HIGHLIGHT, superficialHidden: false, skeleton: false }
  let bones: BoneMesh[] = []
  let bonesLoading: Promise<void> | null = null
  applyHighlight(body, bones, materials, state)

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
  controls.addEventListener('start', onGesture)
  const update = () => {
    applyHighlight(body, bones, materials, state)
    requestRender()
  }

  const pick = createPicker(camera, canvas)
  const muscleByMesh = new Map<Object3D, BodyMesh>(body.muscles.map((m) => [m.mesh, m]))
  const boneByMesh = new Map<Object3D, BoneMesh>()
  const pickTargets = () => [
    ...body.muscles.filter((m) => m.mesh.visible).map((m) => m.mesh),
    ...body.head,
    ...(state.skeleton ? bones.map((b) => b.mesh) : body.filler),
  ]
  const pickHit = (x: number, y: number): PickHit | null => {
    const object = pick(x, y, pickTargets(), (o) => muscleByMesh.has(o) || boneByMesh.has(o))
    const muscle = object && muscleByMesh.get(object)
    if (muscle) return { kind: 'muscle', ref: muscle.ref }
    const bone = object && boneByMesh.get(object)
    return bone ? { kind: 'bone', bone: bone.bone } : null
  }
  let pickMs = 0
  const downs = new Map<number, Vector2>()
  let multiTouch = false
  const onPointerDown = (e: PointerEvent) => {
    downs.set(e.pointerId, new Vector2(e.clientX, e.clientY))
    if (downs.size > 1) multiTouch = true
  }
  const release = (e: PointerEvent) => {
    const down = downs.get(e.pointerId)
    const wasMulti = multiTouch
    downs.delete(e.pointerId)
    if (downs.size === 0) multiTouch = false
    return wasMulti ? undefined : down
  }
  const onPointerCancel = (e: PointerEvent) => void release(e)
  const onPointerUp = (e: PointerEvent) => {
    const down = release(e)
    if (!down || down.distanceTo(new Vector2(e.clientX, e.clientY)) > TAP_SLOP_PX) return
    const started = performance.now()
    const hit = pickHit(e.clientX, e.clientY)
    pickMs = performance.now() - started
    onPick(hit)
  }
  const onLost = (e: Event) => {
    e.preventDefault()
    renderer.setAnimationLoop(null)
    onContextLost()
  }
  canvas.addEventListener('webglcontextlost', onLost)
  canvas.addEventListener('pointerdown', onPointerDown)
  canvas.addEventListener('pointerup', onPointerUp)
  canvas.addEventListener('pointercancel', onPointerCancel)

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
  requestAnimationFrame(() => setTimeout(() => buildBoundsTrees([...body.muscles.map((m) => m.mesh), ...body.head, ...body.filler])))

  // Both halves for focus, so a paired muscle is viewed head-on rather than from its right side.
  const centerOf = (refs: string[], bothSides: boolean) => {
    const box = new Box3()
    for (const m of body.muscles) if ((bothSides || !m.mirrored) && covers(refs, m.ref)) box.expandByObject(m.mesh)
    return box.isEmpty() ? null : box.getCenter(new Vector3())
  }

  async function ensureBones() {
    bonesLoading ??= loadBones(BONES_URL)
      .then((loaded) => {
        for (const b of loaded.bones) boneByMesh.set(b.mesh, b)
        buildBoundsTrees(loaded.bones.map((b) => b.mesh))
        bones = loaded.bones
        scene.add(loaded.root)
      })
      .catch((error) => {
        bonesLoading = null
        throw error
      })
    await bonesLoading
  }

  const toScreen = (world: Vector3) => {
    const point = world.clone().project(camera)
    const rect = canvas.getBoundingClientRect()
    return { x: rect.left + ((point.x + 1) / 2) * rect.width, y: rect.top + ((1 - point.y) / 2) * rect.height }
  }

  return {
    highlight(highlight) {
      Object.assign(state, highlight)
      update()
    },
    async setSkeleton(on) {
      if (on) await ensureBones()
      state.skeleton = on
      update()
    },
    setSuperficialHidden(hidden) {
      state.superficialHidden = hidden
      applyHighlight(body, bones, materials, state)
      if (state.primary.length && !anyVisible(body, state.primary)) {
        Object.assign(state, NO_HIGHLIGHT)
        onPick(null)
      }
      update()
    },
    flip: rig.flip,
    turn: rig.turn,
    focus(refs) {
      const point = centerOf(refs, true)
      if (point) rig.faceTowards(point)
    },
    screenPoint(ref) {
      const point = centerOf([ref], false)
      return point && toScreen(point)
    },
    boneScreenPoint(object) {
      const bone = bones.find((b) => b.bone.object === object && b.mesh.visible)
      return bone ? toScreen(new Box3().setFromObject(bone.mesh).getCenter(new Vector3())) : null
    },
    stats: () => ({ fps, pickMs, pixelRatio: governor.ratio, readyMs }),
    dispose() {
      renderer.setAnimationLoop(null)
      observer.disconnect()
      canvas.removeEventListener('webglcontextlost', onLost)
      canvas.removeEventListener('pointerdown', onPointerDown)
      canvas.removeEventListener('pointerup', onPointerUp)
      canvas.removeEventListener('pointercancel', onPointerCancel)
      controls.dispose()
      renderer.dispose()
    },
  }
}
