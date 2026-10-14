import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import bonesJson from '../content/bones.json' with { type: 'json' }
import type { Bone } from '../src/lib/content-types.ts'

const bones = bonesJson as Bone[]
// pipeline/out is not committed, so this only runs where the model pipeline has been run.
const INVENTORY = 'pipeline/out/inventory.json'

describe.skipIf(!existsSync(INVENTORY))('bones.json khớp Z-Anatomy', () => {
  it('mọi object có trong "1: Skeletal system" (bản gốc hoặc .l/.r)', () => {
    const inventory: { name: string; collection: string }[] = JSON.parse(readFileSync(INVENTORY, 'utf8'))
    const names = new Set(inventory.filter((o) => o.collection === '1: Skeletal system').map((o) => o.name))
    const missing = bones.flatMap((b) => b.objects.filter((o) => ![o, `${o}.l`, `${o}.r`].some((n) => names.has(n))))
    expect(missing).toEqual([])
  })
})
