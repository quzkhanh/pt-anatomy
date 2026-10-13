import { readFileSync } from 'node:fs'
import type { Muscle } from '../src/lib/content-types.ts'
import { glbMuscleObjects, validateMuscles } from './validate-content.ts'

const muscles = JSON.parse(readFileSync('content/muscles.json', 'utf8')) as Muscle[]
const errors = validateMuscles(muscles, glbMuscleObjects(readFileSync('public/models/body.glb')))
if (errors.length) {
  console.error(errors.map((e) => `✗ ${e}`).join('\n'))
  process.exit(1)
}
console.log(`✓ content: ${muscles.length} cơ, ${muscles.reduce((n, m) => n + m.parts.length, 0)} phần khớp body.glb`)
