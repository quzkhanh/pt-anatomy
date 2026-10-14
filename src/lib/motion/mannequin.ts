import {
  CapsuleGeometry,
  Color,
  Group,
  Mesh,
  Quaternion,
  SphereGeometry,
  Vector3,
  type BufferGeometry,
  type Material,
} from 'three'
import { refsOverlap } from '../refs'
import type { Highlight } from '../viewer/highlight'
import { rimMaterial } from '../viewer/material'
import { BELLIES, type Belly } from './bellies'
import type { Joints, LimbJoints } from './pose'
import { DIM, SIDES, sideSign, type Side } from './skeleton'

export interface MannequinColors {
  skin: Color
  primary: Color
  secondary: Color
  rim: Color
}

const UP = new Vector3(0, 1, 0)
const R = { neck: 0.055, upperArm: 0.046, forearm: 0.038, thigh: 0.074, shank: 0.05, shoulder: 0.056 }
const TORSO = {
  chest: { lift: 0.085, size: [0.165, 0.165, 0.11] },
  abdomen: { lift: 0.08, size: [0.12, 0.125, 0.092] },
  pelvis: { lift: 0.02, size: [0.145, 0.1, 0.105] },
} as const
const HEAD_SCALE = [0.82, 1, 0.92] as const
/** Hand ellipsoid radii: [across the knuckles, along the hand, palm-to-back thickness]. */
const HAND_SIZE = [0.04, 0.055, 0.024] as const
const FOOT = { halfWidth: 0.045, halfHeight: 0.032 }
/** Bellies sink partly into the body so they read as muscle shape rather than lumps stuck on top. */
const BELLY_SINK = 0.9
/** Working muscles swell a little so the colour reads at phone size. */
const ACTIVE_SCALE = 1.15

/** Exercise refs with no belly on the mannequin (deep muscles), to be listed in words. */
export const unshownRefs = (refs: string[]) => refs.filter((r) => !BELLIES.some((b) => b.refs.some((br) => refsOverlap(r, br))))

/** Orthonormal right-handed frame: Y along `axis`, Z towards `front`. */
function frame(axis: Vector3, front: Vector3) {
  const y = axis.clone().normalize()
  const z = front.clone().addScaledVector(y, -front.dot(y)).normalize()
  return { x: new Vector3().crossVectors(y, z), y, z }
}

function place(mesh: Mesh, center: Vector3, f: ReturnType<typeof frame>, size: readonly [number, number, number]) {
  mesh.matrix.makeBasis(f.x, f.y, f.z).scale(new Vector3(...size)).setPosition(center)
}

function stretch(mesh: Mesh, from: Vector3, to: Vector3) {
  mesh.position.copy(from).add(to).multiplyScalar(0.5)
  mesh.quaternion.setFromUnitVectors(UP, to.clone().sub(from).normalize())
}

export function createMannequin(colors: MannequinColors, rimStrength: number) {
  const materials = {
    skin: rimMaterial(colors.skin, colors.rim, rimStrength),
    primary: rimMaterial(colors.primary, colors.rim, rimStrength),
    secondary: rimMaterial(colors.secondary, colors.rim, rimStrength),
  }
  const root = new Group()
  // Per instance, not module-level: three keeps a disposed renderer's context reachable through any
  // geometry it ever drew, so shared geometries leaked one WebGL context per closed player.
  const SPHERE = new SphereGeometry(1, 12, 8)
  const add = (geometry: BufferGeometry, manual = false, material: Material = materials.skin) => {
    const mesh = new Mesh(geometry, material)
    mesh.matrixAutoUpdate = !manual
    root.add(mesh)
    return mesh
  }
  const capsule = (radius: number, length: number) => add(new CapsuleGeometry(radius, length - 2 * radius, 4, 12))

  const head = add(SPHERE, true)
  const neck = capsule(R.neck, DIM.neckToHead)
  const torso = { chest: add(SPHERE, true), abdomen: add(SPHERE, true), pelvis: add(SPHERE, true) }
  const limbs = Object.fromEntries(
    SIDES.map((side) => [
      side,
      {
        shoulder: add(SPHERE, true),
        upperArm: capsule(R.upperArm, DIM.upperArm),
        forearm: capsule(R.forearm, DIM.forearm),
        hand: add(SPHERE, true),
        thigh: capsule(R.thigh, DIM.thigh),
        shank: capsule(R.shank, DIM.shank),
        foot: add(SPHERE, true),
      },
    ]),
  ) as Record<Side, Record<'shoulder' | 'upperArm' | 'forearm' | 'hand' | 'thigh' | 'shank' | 'foot', Mesh>>
  const bellyMeshes = SIDES.flatMap((side) => BELLIES.map((belly) => ({ side, belly, refs: belly.refs, mesh: add(SPHERE, true), scale: 1 })))

  function bellyCenter(j: Joints, side: Side, b: Belly) {
    const s = sideSign(side)
    const limb = j[side]
    const trunk = (q: Quaternion, anchor: Vector3) => {
      const f = frame(UP.clone().applyQuaternion(q), new Vector3(0, 0, 1).applyQuaternion(q))
      const lateral = f.x.clone().multiplyScalar(-s)
      return { center: anchor.clone().addScaledVector(f.y, b.at).addScaledVector(lateral, b.off[0] * BELLY_SINK).addScaledVector(f.z, b.off[1] * BELLY_SINK), f }
    }
    const segment = (from: Vector3, to: Vector3, front: Vector3) => {
      const f = frame(to.clone().sub(from), front)
      // frame() is right-handed, so its x points to the person's right on the left side: flip for "lateral".
      const lateral = f.x.clone().multiplyScalar(-s)
      return { center: from.clone().lerp(to, b.at).addScaledVector(lateral, b.off[0] * BELLY_SINK).addScaledVector(f.z, b.off[1] * BELLY_SINK), f }
    }
    switch (b.seg) {
      case 'chest':
        return trunk(j.chestQ, j.chest)
      case 'abdomen':
        return trunk(j.lowerTrunkQ, j.spine.clone().add(new Vector3(0, TORSO.abdomen.lift, 0).applyQuaternion(j.lowerTrunkQ)))
      case 'pelvis':
        return trunk(j.pelvisQ, j.pelvis)
      case 'neck':
        return segment(j.neck, j.head, new Vector3(0, 0, 1).applyQuaternion(j.chestQ))
      case 'upperArm':
        return segment(limb.shoulder, limb.elbow, limb.armFront)
      case 'forearm':
        // Forearm flexors stay on the palm side as the forearm pronates; extensors stay on the back.
        return segment(limb.elbow, limb.wrist, limb.palm)
      case 'thigh':
        return segment(limb.hip, limb.knee, limb.legFront)
      case 'shank':
        return segment(limb.knee, limb.ankle, limb.legFront)
    }
  }

  function updateLimbs(l: LimbJoints, m: (typeof limbs)[Side]) {
    m.shoulder.matrix.makeScale(R.shoulder, R.shoulder, R.shoulder).setPosition(l.shoulder)
    stretch(m.upperArm, l.shoulder, l.elbow)
    stretch(m.forearm, l.elbow, l.wrist)
    // Centred between wrist and grip so an empty hand joins the forearm instead of floating past it.
    const hand = l.grip.clone().sub(l.wrist).normalize()
    // The hand bends at the wrist within the palm plane: turn the forearm's palm normal by the same rotation.
    const palm = l.palm.clone().applyQuaternion(new Quaternion().setFromUnitVectors(l.wrist.clone().sub(l.elbow).normalize(), hand))
    place(m.hand, l.wrist.clone().lerp(l.grip, 0.5), frame(hand, palm), HAND_SIZE)
    stretch(m.thigh, l.hip, l.knee)
    stretch(m.shank, l.knee, l.ankle)
    const fwd = l.toe.clone().sub(l.heel).normalize()
    const up = l.ankle.clone().sub(l.heel.clone().lerp(l.toe, 0.5))
    const center = l.heel.clone().lerp(l.toe, 0.5).addScaledVector(up.normalize(), FOOT.halfHeight)
    const f = frame(fwd, up)
    m.foot.matrix.makeBasis(f.x.negate(), f.z, f.y).scale(new Vector3(FOOT.halfWidth, FOOT.halfHeight, DIM.footLength / 2)).setPosition(center)
  }

  return {
    root,
    bellyMeshes,
    update(j: Joints) {
      place(head, j.head, frame(UP.clone().applyQuaternion(j.headQ), new Vector3(0, 0, 1).applyQuaternion(j.headQ)), HEAD_SCALE.map((v) => v * DIM.headRadius) as [number, number, number])
      stretch(neck, j.neck, j.head)
      for (const [key, q, anchor] of [
        ['chest', j.chestQ, j.chest],
        ['abdomen', j.lowerTrunkQ, j.spine],
        ['pelvis', j.pelvisQ, j.pelvis],
      ] as const) {
        const f = frame(UP.clone().applyQuaternion(q), new Vector3(0, 0, 1).applyQuaternion(q))
        place(torso[key], anchor.clone().addScaledVector(f.y, TORSO[key].lift), f, TORSO[key].size)
      }
      for (const side of SIDES) updateLimbs(j[side], limbs[side])
      for (const { side, belly, mesh, scale } of bellyMeshes) {
        const { center, f } = bellyCenter(j, side, belly)
        place(mesh, center, f, belly.size.map((r) => r * scale) as [number, number, number])
      }
    },
    setHighlight({ primary, secondary }: Highlight) {
      const hit = (refs: string[], belly: string[]) => refs.some((r) => belly.some((b) => refsOverlap(r, b)))
      for (const b of bellyMeshes) {
        const role = hit(primary, b.refs) ? 'primary' : hit(secondary, b.refs) ? 'secondary' : 'skin'
        b.mesh.material = materials[role]
        b.scale = role === 'skin' ? 1 : ACTIVE_SCALE
      }
    },
    dispose() {
      root.traverse((o) => {
        if (o instanceof Mesh) o.geometry.dispose()
      })
      for (const m of Object.values(materials)) m.dispose()
    },
  }
}
