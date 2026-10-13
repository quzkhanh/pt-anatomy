import { Box3, BufferGeometry, Group, Mesh, type Object3D } from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js'
import { acceleratedRaycast, computeBoundsTree } from 'three-mesh-bvh'
import { partByObject, type PartRef } from '../content'

BufferGeometry.prototype.computeBoundsTree = computeBoundsTree
Mesh.prototype.raycast = acceleratedRaycast

export interface BodyMesh {
  mesh: Mesh
  ref: PartRef
  mirrored: boolean
}

export interface Body {
  root: Group
  muscles: BodyMesh[]
  head: Mesh[]
  /** Neutral fill between left and right halves; never picked, but blocks picking rays. */
  filler: Mesh[]
  bounds: Box3
}

const SIDE_SUFFIX = /\.[rl]$/

// GLTFLoader strips '.' from obj.name; the original glTF node name is kept in userData.name.
const nodeName = (node: Object3D) => node.userData.name as string

function collect(root: Object3D, mirrored: boolean, body: Body) {
  root.traverse((node) => {
    const role = node.userData.role as 'muscle' | 'head' | 'filler' | undefined
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
    if (role !== 'muscle') {
      body[role].push(...meshes)
      return
    }
    const object = nodeName(node).replace(SIDE_SUFFIX, '')
    const ref = partByObject(object)
    if (!ref) throw new Error(`Object "${object}" trong body.glb không có trong content/muscles.json`)
    for (const mesh of meshes) body.muscles.push({ mesh, ref, mirrored })
  })
}

export async function loadBody(url: string, onProgress: (fraction: number | null) => void): Promise<Body> {
  const gltf = await new GLTFLoader()
    .setMeshoptDecoder(MeshoptDecoder)
    .loadAsync(url, (e) => onProgress(e.lengthComputable ? e.loaded / e.total : null))
  const right = gltf.scene
  const left = right.clone()
  left.scale.x = -1
  const body: Body = { root: new Group().add(right, left), muscles: [], head: [], filler: [], bounds: new Box3().setFromObject(right) }
  collect(right, false, body)
  collect(left, true, body)
  return body
}

// Mirrored meshes share geometry with the right half, so each BVH is built once.
export function buildBoundsTrees(body: Body) {
  for (const mesh of [...body.muscles.map((m) => m.mesh), ...body.head, ...body.filler]) {
    if (!mesh.geometry.boundsTree) mesh.geometry.computeBoundsTree()
  }
}
