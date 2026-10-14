import { BoxGeometry, CylinderGeometry, Euler, Group, MathUtils, Mesh, SphereGeometry, Vector3, type BufferGeometry, type Material } from 'three'
import type { Attach, PropSpec } from './motion'
import type { Joints } from './pose'

const UP = new Vector3(0, 1, 0)
/** Olympic bar with 45 cm (bumper-size) plates: the bar sits 0.225 m above the floor. */
const BAR = { length: 1.8, radius: 0.014, plateRadius: 0.225, plateWidth: 0.05, plateOffset: 0.68 }
const DUMBBELL = { handle: 0.13, radius: 0.016, head: 0.055, headWidth: 0.06 }
const KETTLEBELL = { reach: 0.13, radius: 0.085 }
const WHEEL = { radius: 0.1, width: 0.06, axle: 0.32 }
const CABLE = { radius: 0.004, pulley: 0.04, handle: 0.025 }
const HIP_BAR_LIFT = 0.12
/** Plates sit on the free end of the bar, beyond the hands (the pivot end stays on the floor). */
const LEVER = { overhang: 0.2, plateAhead: 0.13 }
const SOLE_THICKNESS = 0.03
const ROLLER = { radius: 0.05, length: 0.32, gap: 0.11 }

/** World point of an attachment and the axis a held bar lies along there. */
function attachPoint(j: Joints, at: Attach) {
  switch (at) {
    case 'grips':
      return { point: j.l.grip.clone().lerp(j.r.grip, 0.5), axis: j.l.grip.clone().sub(j.r.grip).normalize() }
    case 'hips':
      return {
        point: j.pelvis.clone().add(new Vector3(0, 0, HIP_BAR_LIFT).applyQuaternion(j.pelvisQ)),
        axis: new Vector3(1, 0, 0).applyQuaternion(j.pelvisQ),
      }
    default: {
      const side = at.endsWith('L') ? j.l : j.r
      const joint = at.startsWith('grip') ? side.grip : at.startsWith('knee') ? side.knee : at.startsWith('shoulder') ? side.shoulder : side.ankle
      // A held handle runs across the palm.
      const hand = side.grip.clone().sub(side.wrist).normalize()
      return { point: joint.clone(), axis: new Vector3().crossVectors(hand, side.palm).normalize() }
    }
  }
}

function stretch(mesh: Mesh, from: Vector3, to: Vector3, radius: number) {
  const dir = to.clone().sub(from)
  mesh.position.copy(from).add(to).multiplyScalar(0.5)
  mesh.quaternion.setFromUnitVectors(UP, dir.clone().normalize())
  mesh.scale.set(radius, Math.max(dir.length(), 1e-4), radius)
}

/** A bar of `length` centred on `center` along `axis`, with discs of `discRadius` at ±`discOffset`. */
function barbellParts(add: (g: BufferGeometry, m?: Material) => Mesh, cylinder: BufferGeometry, heavy: Material) {
  const bar = add(cylinder)
  const plates = [add(cylinder, heavy), add(cylinder, heavy)]
  return (center: Vector3, axis: Vector3, length: number, radius: number, discRadius: number, discWidth: number, discOffset: number) => {
    const half = axis.clone().multiplyScalar(length / 2)
    stretch(bar, center.clone().sub(half), center.clone().add(half), radius)
    plates.forEach((plate, i) => {
      const c = center.clone().addScaledVector(axis, (i ? 1 : -1) * discOffset)
      const w = axis.clone().multiplyScalar(discWidth / 2)
      stretch(plate, c.clone().sub(w), c.clone().add(w), discRadius)
    })
  }
}

export function createProps(specs: PropSpec[], materials: { metal: Material; heavy: Material; pad: Material; band: Material }) {
  const root = new Group()
  // Per instance so dispose() frees them (see mannequin.ts: shared geometries leak WebGL contexts).
  const CYLINDER = new CylinderGeometry(1, 1, 1, 14)
  const BALL = new SphereGeometry(1, 12, 8)
  const updates: ((j: Joints) => void)[] = []
  const add = (geometry: BufferGeometry, material: Material = materials.metal) => {
    const mesh = new Mesh(geometry, material)
    root.add(mesh)
    return mesh
  }

  for (const spec of specs) {
    switch (spec.kind) {
      case 'barbell': {
        const draw = barbellParts(add, CYLINDER, materials.heavy)
        updates.push((j) => {
          const { point, axis } = attachPoint(j, spec.at)
          draw(point, axis, BAR.length, BAR.radius, BAR.plateRadius, BAR.plateWidth, BAR.plateOffset)
        })
        break
      }
      case 'dumbbell': {
        const draw = barbellParts(add, CYLINDER, materials.heavy)
        updates.push((j) => {
          const { point, axis } = attachPoint(j, spec.at)
          const side = spec.at.endsWith('R') ? j.r : j.l
          // 'neutral' turns the handle a quarter turn as if the forearm were in mid-rotation (thumb up).
          const along = spec.grip === 'neutral' ? side.palm.clone() : spec.grip === 'upright' ? UP.clone() : axis
          const reach = DUMBBELL.handle / 2 + DUMBBELL.headWidth / 2
          // Upright: the hands cup the top head, so the bell hangs below them.
          const center = spec.grip === 'upright' ? point.clone().addScaledVector(UP, -reach) : point
          draw(center, along.normalize(), DUMBBELL.handle + DUMBBELL.headWidth, DUMBBELL.radius, DUMBBELL.head, DUMBBELL.headWidth, reach)
        })
        break
      }
      case 'kettlebell': {
        const bell = add(BALL, materials.heavy)
        bell.scale.setScalar(KETTLEBELL.radius)
        updates.push((j) => {
          const forearm = j.l.grip.clone().sub(j.l.wrist).add(j.r.grip.clone().sub(j.r.wrist)).normalize()
          bell.position.copy(attachPoint(j, spec.at).point).addScaledVector(forearm, KETTLEBELL.reach)
        })
        break
      }
      case 'wheel': {
        const draw = barbellParts(add, CYLINDER, materials.heavy)
        updates.push((j) => {
          const { point, axis } = attachPoint(j, spec.at)
          draw(point, axis, WHEEL.axle, BAR.radius, WHEEL.radius, WHEEL.width, 0)
        })
        break
      }
      case 'handle': {
        const bar = add(CYLINDER)
        updates.push((j) => {
          const { point, axis } = attachPoint(j, spec.at)
          const half = axis.clone().multiplyScalar(spec.length / 2)
          stretch(bar, point.clone().sub(half), point.clone().add(half), BAR.radius)
        })
        break
      }
      case 'lever': {
        const bar = add(CYLINDER)
        const plates = spec.plates ? [add(CYLINDER, materials.heavy)] : []
        updates.push((j) => {
          const pivot = new Vector3(...spec.pivot)
          const grip = attachPoint(j, spec.at).point
          const along = grip.clone().sub(pivot).normalize()
          stretch(bar, pivot, grip.clone().addScaledVector(along, spec.overhang ?? LEVER.overhang), BAR.radius * 1.4)
          for (const plate of plates) {
            const c = grip.clone().addScaledVector(along, LEVER.plateAhead)
            stretch(plate, c.clone().addScaledVector(along, -BAR.plateWidth / 2), c.clone().addScaledVector(along, BAR.plateWidth / 2), BAR.plateRadius)
          }
        })
        break
      }
      case 'roller': {
        const pad = add(CYLINDER, materials.pad)
        updates.push((j) => {
          const point = attachPoint(j, spec.at).point
          const limb = spec.at.endsWith('L') ? j.l : j.r
          const front = spec.at.startsWith('grip')
            ? limb.armFront
            : spec.at.startsWith('shoulder')
              ? new Vector3(0, 0, 1).applyQuaternion(j.chestQ)
              : limb.legFront
          const outward = new Vector3(spec.at.endsWith('L') ? 1 : -1, 0, 0).applyQuaternion(j.pelvisQ)
          const upright = spec.face === 'outside' || spec.face === 'inside'
          const dir =
            spec.face === 'top'
              ? UP
              : upright
                ? outward.clone().multiplyScalar(spec.face === 'inside' ? -1 : 1)
                : front.clone().multiplyScalar(spec.face === 'back' ? -1 : 1)
          const up = spec.at.startsWith('ankle') ? limb.knee : spec.at.startsWith('knee') ? limb.hip : point
          const along = up.clone().sub(point).normalize()
          const center = point
            .clone()
            .addScaledVector(dir, ROLLER.gap)
            .addScaledVector(outward, spec.outward ?? 0)
            .addScaledVector(along, spec.slide ?? 0)
          const length = spec.length ?? ROLLER.length
          const half = (upright ? UP.clone() : new Vector3(1, 0, 0).applyQuaternion(j.pelvisQ)).multiplyScalar(length / (upright ? 4 : 2))
          stretch(pad, center.clone().sub(half), center.clone().add(half), ROLLER.radius)
        })
        break
      }
      case 'cable': {
        const pulley = add(BALL)
        pulley.scale.setScalar(CABLE.pulley)
        pulley.position.set(...spec.from)
        const line = add(CYLINDER)
        const handle = add(BALL, materials.heavy)
        handle.scale.setScalar(CABLE.handle)
        updates.push((j) => {
          const { point } = attachPoint(j, spec.to)
          stretch(line, new Vector3(...spec.from), point, CABLE.radius)
          handle.position.copy(point)
        })
        break
      }
      case 'sole': {
        const plate = add(new BoxGeometry(spec.size[0], SOLE_THICKNESS, spec.size[1]), materials.pad)
        plate.matrixAutoUpdate = false
        updates.push((j) => {
          const heel = j.l.heel.clone().lerp(j.r.heel, 0.5)
          const toe = j.l.toe.clone().lerp(j.r.toe, 0.5)
          const along = toe.clone().sub(heel).normalize()
          const ankle = j.l.ankle.clone().lerp(j.r.ankle, 0.5)
          const away = heel.clone().lerp(toe, 0.5).sub(ankle)
          const normal = away.addScaledVector(along, -away.dot(along)).normalize()
          const across = new Vector3().crossVectors(normal, along)
          const center = heel.clone().lerp(toe, 0.5).addScaledVector(normal, SOLE_THICKNESS / 2)
          plate.matrix.makeBasis(across, normal, along).setPosition(center)
        })
        break
      }
      case 'band': {
        const line = add(CYLINDER, materials.band)
        updates.push((j) => stretch(line, attachPoint(j, spec.a).point, attachPoint(j, spec.b).point, CABLE.radius * 3))
        break
      }
      case 'block': {
        const block = add(new BoxGeometry(...spec.size), materials.pad)
        block.position.set(...spec.center)
        if (spec.rot) block.rotation.copy(new Euler(...(spec.rot.map(MathUtils.degToRad) as [number, number, number])))
        break
      }
      case 'rod':
        stretch(add(CYLINDER), new Vector3(...spec.from), new Vector3(...spec.to), spec.radius ?? 0.02)
        break
    }
  }

  return {
    root,
    update: (j: Joints) => updates.forEach((u) => u(j)),
    dispose() {
      root.traverse((o) => {
        if (o instanceof Mesh) o.geometry.dispose()
      })
    },
  }
}
