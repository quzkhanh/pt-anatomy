import { Raycaster, Vector2, type Camera, type Mesh, type Object3D } from 'three'
import type { BodyMesh } from './model'

// A tap that misses every muscle retries on rings around the finger, nearest ring first.
const RING_RADII_PX = [0, 6, 12]
const RING_SAMPLES = 8

export function createPicker(camera: Camera, canvas: HTMLCanvasElement, muscles: BodyMesh[], occluders: Mesh[]) {
  const raycaster = new Raycaster()
  raycaster.firstHitOnly = true
  const ndc = new Vector2()
  const byMesh = new Map<Object3D, BodyMesh>(muscles.map((m) => [m.mesh, m]))

  return (clientX: number, clientY: number): BodyMesh | null => {
    const rect = canvas.getBoundingClientRect()
    const targets = [...muscles.filter((m) => m.mesh.visible).map((m) => m.mesh), ...occluders]
    for (const radius of RING_RADII_PX) {
      const samples = radius === 0 ? 1 : RING_SAMPLES
      let best: { body: BodyMesh; distance: number } | null = null
      for (let i = 0; i < samples; i++) {
        const angle = (i / samples) * Math.PI * 2
        const x = clientX + radius * Math.cos(angle)
        const y = clientY + radius * Math.sin(angle)
        ndc.set(((x - rect.left) / rect.width) * 2 - 1, -((y - rect.top) / rect.height) * 2 + 1)
        raycaster.setFromCamera(ndc, camera)
        const hit = raycaster.intersectObjects(targets, false)[0]
        const body = hit && byMesh.get(hit.object)
        if (body && (!best || hit.distance < best.distance)) best = { body, distance: hit.distance }
      }
      if (best) return best.body
    }
    return null
  }
}
