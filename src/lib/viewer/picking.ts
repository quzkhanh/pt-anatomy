import { Raycaster, Vector2, type Camera, type Mesh, type Object3D } from 'three'

// A tap that misses everything pickable retries on rings around the finger, nearest ring first.
const RING_RADII_PX = [0, 6, 12]
const RING_SAMPLES = 8

/** Returns the nearest pickable mesh under a tap; `targets` also holds occluders, which block but are never returned. */
export function createPicker(camera: Camera, canvas: HTMLCanvasElement) {
  const raycaster = new Raycaster()
  raycaster.firstHitOnly = true
  const ndc = new Vector2()

  return (clientX: number, clientY: number, targets: Mesh[], pickable: (mesh: Object3D) => boolean): Object3D | null => {
    const rect = canvas.getBoundingClientRect()
    for (const radius of RING_RADII_PX) {
      const samples = radius === 0 ? 1 : RING_SAMPLES
      let best: { object: Object3D; distance: number } | null = null
      for (let i = 0; i < samples; i++) {
        const angle = (i / samples) * Math.PI * 2
        const x = clientX + radius * Math.cos(angle)
        const y = clientY + radius * Math.sin(angle)
        ndc.set(((x - rect.left) / rect.width) * 2 - 1, -((y - rect.top) / rect.height) * 2 + 1)
        raycaster.setFromCamera(ndc, camera)
        const hit = raycaster.intersectObjects(targets, false)[0]
        if (hit && pickable(hit.object) && (!best || hit.distance < best.distance)) best = { object: hit.object, distance: hit.distance }
      }
      if (best) return best.object
    }
    return null
  }
}
