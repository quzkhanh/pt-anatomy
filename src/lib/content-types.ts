export const REGIONS = ['chest', 'shoulders', 'back', 'neck', 'arms', 'core', 'glutes', 'legs'] as const
export type Region = (typeof REGIONS)[number]

export const STATUSES = ['draft', 'reviewed'] as const
export type Status = (typeof STATUSES)[number]

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

export interface Muscle {
  id: string
  vi: string
  en: string
  region: Region
  superficial: boolean
  parts: MusclePart[]
  function?: string
  sources?: Source[]
  status: Status
}
