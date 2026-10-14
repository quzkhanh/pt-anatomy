import { readFileSync } from 'node:fs'
import type { Bone, Exercise, Muscle, Quote } from '../src/lib/content-types.ts'
import { glbMuscleObjects, validateDetails, validateEvidence, validateExercises, validateMuscles } from './validate-content.ts'

const readJson = <T>(path: string) => JSON.parse(readFileSync(path, 'utf8')) as T
const muscles = readJson<Muscle[]>('content/muscles.json')
const exercises = readJson<Exercise[]>('content/exercises.json')
const bones = readJson<Bone[]>('content/bones.json')
const evidence = readJson<{ muscles: Record<string, Quote[]> }>('content/evidence.json')
const errors = [
  ...validateMuscles(muscles, glbMuscleObjects(readFileSync('public/models/body.glb'))),
  ...validateExercises(exercises, muscles),
  ...validateDetails(muscles, bones),
  ...validateEvidence(muscles, evidence.muscles),
]
if (errors.length) {
  console.error(errors.map((e) => `✗ ${e}`).join('\n'))
  process.exit(1)
}
console.log(
  `✓ content: ${muscles.length} cơ, ${muscles.reduce((n, m) => n + m.parts.length, 0)} phần khớp body.glb, ${exercises.length} bài tập, ${bones.length} xương`,
)
