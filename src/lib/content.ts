import musclesJson from '../../content/muscles.json'
import type { Muscle, MusclePart, Region } from './content-types'
import { createSearch } from './search'

export const muscles = musclesJson as Muscle[]

export interface PartRef {
  muscle: Muscle
  part: MusclePart
}

export interface Selection {
  muscle: Muscle
  part: MusclePart | null
}

const byId = new Map(muscles.map((m) => [m.id, m]))
const byObject = new Map<string, PartRef>(
  muscles.flatMap((muscle) => muscle.parts.map((part) => [part.object, { muscle, part }] as const)),
)

export const muscleById = (id: string) => byId.get(id)
export const partByObject = (object: string) => byObject.get(object)
export const isSuperficial = ({ muscle, part }: PartRef) => part.superficial ?? muscle.superficial

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

export const searchMuscles = createSearch(muscles, (m) => [
  m.vi,
  m.en,
  ...m.parts.flatMap((p) => (p.vi ? [p.vi] : [])),
])
