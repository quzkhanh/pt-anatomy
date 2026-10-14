import { readFileSync } from 'node:fs'
import type { Bone, BreathingGuide, Exercise, Muscle, Quote, SkeletonBone } from '../src/lib/content-types.ts'
import { glbObjects, validateBreathing, validateDetails, validateEvidence, validateExercises, validateMuscles, validateSkeleton } from './validate-content.ts'

const readJson = <T>(path: string) => JSON.parse(readFileSync(path, 'utf8')) as T
const muscles = readJson<Muscle[]>('content/muscles.json')
const exercises = readJson<Exercise[]>('content/exercises.json')
const bones = readJson<Bone[]>('content/bones.json')
const skeleton = readJson<SkeletonBone[]>('content/skeleton.json')
const breathing = readJson<BreathingGuide>('content/breathing.json')
const evidence = readJson<{ muscles: Record<string, Quote[]>; breathing?: Quote[] }>('content/evidence.json')
const errors = [
  ...validateMuscles(muscles, glbObjects(readFileSync('public/models/body.glb'), 'muscle')),
  ...validateSkeleton(skeleton, glbObjects(readFileSync('public/models/bones.glb'), 'bone')),
  ...validateExercises(exercises, muscles),
  ...validateDetails(muscles, bones),
  ...validateEvidence(muscles, evidence.muscles),
  ...validateBreathing(breathing, evidence.breathing ?? []),
]
if (errors.length) {
  console.error(errors.map((e) => `✗ ${e}`).join('\n'))
  process.exit(1)
}
console.log(
  `✓ content: ${muscles.length} cơ, ${muscles.reduce((n, m) => n + m.parts.length, 0)} phần khớp body.glb, ${exercises.length} bài tập, ${bones.length} nhóm xương, ${skeleton.length} mảnh khớp bones.glb`,
)
