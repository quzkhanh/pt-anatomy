import { Color, Mesh, type MeshStandardMaterial } from 'three'
import { describe, expect, it } from 'vitest'
import { resolveRef } from '../content'
import { BELLIES } from './bellies'
import { createMannequin, unshownRefs } from './mannequin'
import { solvePose, standing } from './pose'

const colors = { skin: new Color('#f3d5c0'), primary: new Color('#e0482f'), secondary: new Color('#f0ac1e'), rim: new Color('#fff') }

describe('mannequin', () => {
  it('mọi tham chiếu của bắp cơ đều có trong muscles.json', () => {
    for (const ref of BELLIES.flatMap((b) => b.refs)) expect(resolveRef(ref), ref).toBeDefined()
  })

  it('tô cơ chính/phụ đúng bắp theo tham chiếu cơ hoặc phần', () => {
    const m = createMannequin(colors, 0.25)
    m.update(solvePose(standing()))
    m.setHighlight({ primary: ['deltoid.middle'], secondary: ['quadriceps-femoris'] })
    const tinted = (ref: string, c: Color) =>
      m.bellyMeshes.filter((x) => x.refs.includes(ref)).every((x) => (x.mesh.material as MeshStandardMaterial).color.equals(c))
    expect(tinted('deltoid.middle', colors.primary)).toBe(true)
    expect(tinted('deltoid.anterior', colors.skin)).toBe(true)
    expect(tinted('quadriceps-femoris.vastus-lateralis', colors.secondary)).toBe(true)
  })

  it('cơ không có bắp trên ma-nơ-canh được liệt kê riêng', () => {
    expect(unshownRefs(['infraspinatus', 'deltoid.posterior', 'biceps-femoris.long'])).toEqual(['infraspinatus'])
  })

  it('nhẹ: dưới 20k tam giác', () => {
    const m = createMannequin(colors, 0.25)
    let triangles = 0
    m.root.traverse((o) => {
      if (o instanceof Mesh) triangles += (o.geometry.index?.count ?? o.geometry.attributes.position.count) / 3
    })
    expect(triangles).toBeLessThan(20000)
  })
})
