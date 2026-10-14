import exercisesJson from '../../content/exercises.json'
import musclesJson from '../../content/muscles.json'
import type { Equipment, Exercise, Muscle, MusclePart, Region } from './content-types'
import { EQUIPMENT } from './content-types'
import { splitRef } from './refs'
import { createSearch } from './search'

export const muscles = musclesJson as Muscle[]
export const exercises = exercisesJson as Exercise[]

export interface PartRef {
  muscle: Muscle
  part: MusclePart
}

const byId = new Map(muscles.map((m) => [m.id, m]))
const byObject = new Map<string, PartRef>(
  muscles.flatMap((muscle) => muscle.parts.map((part) => [part.object, { muscle, part }] as const)),
)
const exerciseIds = new Map(exercises.map((e) => [e.id, e]))

export const muscleById = (id: string) => byId.get(id)
export const exerciseById = (id: string) => exerciseIds.get(id)
export const partByObject = (object: string) => byObject.get(object)
export const isSuperficial = ({ muscle, part }: PartRef) => part.superficial ?? muscle.superficial

export interface ResolvedRef {
  muscle: Muscle
  part: MusclePart | null
}

export function resolveRef(ref: string): ResolvedRef | undefined {
  const { muscle: muscleId, part: partId } = splitRef(ref)
  const muscle = byId.get(muscleId)
  if (!muscle) return undefined
  if (!partId) return { muscle, part: null }
  const part = muscle.parts.find((p) => p.id === partId)
  return part && { muscle, part }
}

export const refLabel = ({ muscle, part }: ResolvedRef) => (part?.vi ? `${muscle.vi} (${part.vi})` : muscle.vi)

export const exerciseRegion = (exercise: Exercise): Region => byId.get(splitRef(exercise.primary[0]).muscle)!.region

export function exercisesFor(muscleId: string) {
  const uses = (refs: string[]) => refs.some((ref) => splitRef(ref).muscle === muscleId)
  return {
    primary: exercises.filter((e) => uses(e.primary)),
    secondary: exercises.filter((e) => uses(e.secondary)),
  }
}

export const equipmentIn = (list: Exercise[]): Equipment[] => EQUIPMENT.filter((eq) => list.some((e) => e.equipment === eq))

export function exerciseCount(muscleId: string) {
  const { primary, secondary } = exercisesFor(muscleId)
  return new Set([...primary, ...secondary]).size
}

export const REGION_LABELS: Record<Region, string> = {
  chest: 'Ngực',
  shoulders: 'Vai',
  back: 'Lưng',
  neck: 'Cổ',
  arms: 'Tay',
  core: 'Bụng',
  glutes: 'Mông',
  legs: 'Chân',
}

export const EQUIPMENT_LABELS: Record<Equipment, string> = {
  barbell: 'Tạ đòn',
  dumbbell: 'Tạ đơn',
  cable: 'Cáp',
  machine: 'Máy',
  bodyweight: 'Trọng lượng cơ thể',
  kettlebell: 'Tạ ấm',
  band: 'Dây kháng lực',
  other: 'Khác',
}

export const videoSearchUrl = (exercise: Exercise) =>
  `https://www.youtube.com/results?search_query=${encodeURIComponent(`${exercise.en} exercise form`)}`

export const searchMuscles = createSearch(muscles, (m) => [
  m.vi,
  m.en,
  ...m.parts.flatMap((p) => (p.vi ? [p.vi] : [])),
])

export const searchExercises = createSearch(exercises, (e) => [e.vi, e.en], exercises.length)
