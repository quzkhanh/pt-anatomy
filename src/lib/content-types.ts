export const REGIONS = ['chest', 'shoulders', 'back', 'neck', 'arms', 'core', 'glutes', 'legs'] as const
export type Region = (typeof REGIONS)[number]

export const STATUSES = ['draft', 'reviewed'] as const
export type Status = (typeof STATUSES)[number]

export const EQUIPMENT = ['barbell', 'dumbbell', 'cable', 'machine', 'bodyweight', 'kettlebell', 'band', 'other'] as const
export type Equipment = (typeof EQUIPMENT)[number]

export interface Source {
  title: string
  url: string
}

export interface MusclePart {
  id: string
  vi?: string
  object: string
  superficial?: boolean
}

export interface Attachment {
  bones: string[]
  vi: string
}

export const TIP_KINDS = ['training', 'palpation', 'clinical', 'breathing'] as const
export type TipKind = (typeof TIP_KINDS)[number]

/** `objects`: Z-Anatomy object base names in "1: Skeletal system", without the `.l`/`.r` side suffix. */
export interface Bone {
  id: string
  vi: string
  en: string
  objects: string[]
}

/** A verbatim sentence from a source; `field`/`item` say which claim it backs (none = `function`). */
export interface Quote {
  url: string
  quote: string
  field?: string
  item?: number
}

export interface Muscle {
  id: string
  vi: string
  en: string
  region: Region
  superficial: boolean
  parts: MusclePart[]
  function?: string
  origin?: Attachment[]
  insertion?: Attachment[]
  nerve?: string
  tips?: Partial<Record<TipKind, string[]>>
  sources?: Source[]
  status: Status
}

/** `primary`/`secondary` hold muscle refs: "<muscle-id>" or "<muscle-id>.<part-id>". */
export interface Exercise {
  id: string
  en: string
  vi: string
  equipment: Equipment
  primary: string[]
  secondary: string[]
  cues: string[]
  sources: Source[]
  status: Status
}
