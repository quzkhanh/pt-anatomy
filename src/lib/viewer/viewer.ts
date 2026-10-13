import {
  Box3,
  Color,
  DirectionalLight,
  HemisphereLight,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  PerspectiveCamera,
  Raycaster,
  Scene,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js'
import { colors } from '../theme'

export type Role = 'muscle' | 'bone'

export interface Part {
  name: string
  side: 'r' | 'l' | null
  role: Role
}

const TAP_SLOP_PX = 6

const materials: Record<Role | 'selected', MeshStandardMaterial> = {
  muscle: new MeshStandardMaterial({ color: colors.muscle, roughness: 0.6 }),
  bone: new MeshStandardMaterial({ color: colors.bone, roughness: 0.8 }),
  selected: new MeshStandardMaterial({ color: colors.selected, roughness: 0.5 }),
}

function parsePart(obj: Object3D, mirrored: boolean): Part | null {
  const role = obj.userData.role as Role | undefined
  if (!role) return null
  // GLTFLoader strips '.' from obj.name; the original glTF node name is kept in userData.name.
  const [, base, side] = (obj.userData.name as string).match(/^(.*?)(?:\.([rl]))?$/)!
  return { name: base, side: side ? (mirrored ? 'l' : 'r') : null, role }
}

export async function createViewer(canvas: HTMLCanvasElement, onSelect: (part: Part | null) => void) {
  const renderer = new WebGLRenderer({ canvas, antialias: true })
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
  const scene = new Scene()
  scene.background = new Color(colors.background)
  const camera = new PerspectiveCamera(35, 1, 0.01, 20)
  const controls = new OrbitControls(camera, canvas)
  controls.enableDamping = true
  scene.add(new HemisphereLight(0xffffff, 0x404040, 1.5))
  const sun = new DirectionalLight(0xffffff, 1.5)
  sun.position.set(1, 2, 3)
  camera.add(sun)
  scene.add(camera)

  const gltf = await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync(`${import.meta.env.BASE_URL}models/body.glb`)
  const right = gltf.scene
  const left = right.clone()
  left.scale.x = -1
  // Midline objects (spine, sternum...) are only needed once; the mirror keeps paired parts only.
  left.traverse((o) => o.userData.role && !/\.[rl]$/.test(o.userData.name) && (o.visible = false))
  scene.add(right, left)

  const parts = new Map<Mesh, Part>()
  for (const [root, mirrored] of [[right, false], [left, true]] as const) {
    root.traverse((o) => {
      const part = parsePart(o, mirrored)
      if (!part) return
      o.traverse((m) => {
        if (m instanceof Mesh) {
          m.material = materials[part.role]
          parts.set(m, part)
        }
      })
    })
  }

  const box = new Box3().setFromObject(right)
  const center = box.getCenter(new Vector3())
  center.x = 0
  controls.target.copy(center)
  camera.position.set(0, center.y, box.getSize(new Vector3()).y * 1.6)

  let selected: Part | null = null
  const raycaster = new Raycaster()
  const down = new Vector2()
  canvas.addEventListener('pointerdown', (e) => down.set(e.clientX, e.clientY))
  canvas.addEventListener('pointerup', (e) => {
    if (down.distanceTo(new Vector2(e.clientX, e.clientY)) > TAP_SLOP_PX) return
    const rect = canvas.getBoundingClientRect()
    raycaster.setFromCamera(
      new Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1),
      camera,
    )
    const hit = raycaster.intersectObjects([right, left], true).find((h) => h.object.visible && parts.has(h.object as Mesh))
    selected = hit ? parts.get(hit.object as Mesh)! : null
    for (const [mesh, part] of parts) {
      mesh.material = part === selected ? materials.selected : materials[part.role]
    }
    onSelect(selected)
  })

  const resize = () => {
    const { clientWidth: w, clientHeight: h } = canvas
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    camera.updateProjectionMatrix()
  }
  new ResizeObserver(resize).observe(canvas)

  let frames = 0
  let fps = 0
  let last = performance.now()
  renderer.setAnimationLoop((now) => {
    controls.update()
    renderer.render(scene, camera)
    frames++
    if (now - last >= 1000) {
      fps = frames
      frames = 0
      last = now
    }
  })

  return {
    fps: () => fps,
    triangles: () => renderer.info.render.triangles,
  }
}
