import { Box3, BufferGeometry, Group, Mesh, type Object3D } from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js'
import { acceleratedRaycast, computeBoundsTree } from 'three-mesh-bvh'
import { partByObject, skeletonBone, type PartRef } from '../content'
import type { SkeletonBone } from '../content-types'

BufferGeometry.prototype.computeBoundsTree = computeBoundsTree
Mesh.prototype.raycast = acceleratedRaycast

export interface BodyMesh {
  mesh: Mesh
  ref: PartRef
  mirrored: boolean
}

export interface BoneMesh {
  mesh: Mesh
  bone: SkeletonBone
}

export interface Body {
  root: Group
  muscles: BodyMesh[]
  head: Mesh[]
  /** Neutral fill between left and right halves; never picked, but blocks picking rays. */
  filler: Mesh[]
  bounds: Box3
}

type Role = 'muscle' | 'head' | 'filler' | 'bone'

const SIDE_SUFFIX = /\.[rl]$/

// GLTFLoader strips '.' from obj.name; the original glTF node name is kept in userData.name.
const nodeName = (node: Object3D) => node.userData.name as string

/** Calls `visit` for every role-tagged node of both halves with its meshes and base object name. */
function collect(right: Object3D, left: Object3D, visit: (role: Role, object: string, meshes: Mesh[], mirrored: boolean) => void) {
  for (const [root, mirrored] of [[right, false], [left, true]] as const) {
    root.traverse((node) => {
      const role = node.userData.role as Role | undefined
      if (!role) return
      // Midline objects exist once in the right half; the mirror keeps paired parts only.
      if (mirrored && !SIDE_SUFFIX.test(nodeName(node))) {
        node.visible = false
        return
      }
      const meshes: Mesh[] = []
      node.traverse((child) => {
        if (child instanceof Mesh) meshes.push(child)
      })
      visit(role, nodeName(node).replace(SIDE_SUFFIX, ''), meshes, mirrored)
    })
  }
}

/** Z-Anatomy GLBs hold the right half only; the left half is a mirrored clone. */
async function loadHalves(url: string, onProgress: (fraction: number | null) => void) {
  const gltf = await new GLTFLoader()
    .setMeshoptDecoder(MeshoptDecoder)
    .loadAsync(url, (e) => onProgress(e.lengthComputable ? e.loaded / e.total : null))
  const right = gltf.scene
  const left = right.clone()
  left.scale.x = -1
  return { right, left, root: new Group().add(right, left) }
}

export async function loadBody(url: string, onProgress: (fraction: number | null) => void): Promise<Body> {
  const { right, left, root } = await loadHalves(url, onProgress)
  const body: Body = { root, muscles: [], head: [], filler: [], bounds: new Box3().setFromObject(right) }
  collect(right, left, (role, object, meshes, mirrored) => {
    if (role === 'head' || role === 'filler') body[role].push(...meshes)
    if (role !== 'muscle') return
    const ref = partByObject(object)
    if (!ref) throw new Error(`Object "${object}" trong body.glb không có trong content/muscles.json`)
    for (const mesh of meshes) body.muscles.push({ mesh, ref, mirrored })
  })
  return body
}

export async function loadBones(url: string): Promise<{ root: Group; bones: BoneMesh[] }> {
  const { right, left, root } = await loadHalves(url, () => {})
  const bones: BoneMesh[] = []
  collect(right, left, (role, object, meshes) => {
    if (role !== 'bone') return
    const bone = skeletonBone(object)
    if (!bone) throw new Error(`Object "${object}" trong bones.glb không có trong content/skeleton.json`)
    for (const mesh of meshes) bones.push({ mesh, bone })
  })
  return { root, bones }
}

// Mirrored meshes share geometry with the right half, so each BVH is built once.
export function buildBoundsTrees(meshes: Mesh[]) {
  for (const mesh of meshes) if (!mesh.geometry.boundsTree) mesh.geometry.computeBoundsTree()
}
