import { MeshStandardMaterial, type Color } from 'three'
import { isSuperficial } from '../content'
import type { ThemeColors } from '../theme'
import type { Body } from './model'

const ROUGHNESS = 0.85

export interface HighlightState {
  selected: string | null
  superficialHidden: boolean
}

export type Materials = ReturnType<typeof createMaterials>

export function createMaterials(colors: ThemeColors) {
  const matte = (color: Color) => new MeshStandardMaterial({ color, roughness: ROUGHNESS })
  return { muscle: matte(colors.muscle), selected: matte(colors.selected), head: matte(colors.head) }
}

export function applyHighlight(body: Body, materials: Materials, state: HighlightState) {
  for (const { mesh, ref } of body.muscles) {
    mesh.material = ref.muscle.id === state.selected ? materials.selected : materials.muscle
    mesh.visible = !(state.superficialHidden && isSuperficial(ref))
  }
}

export const isMuscleVisible = (body: Body, muscleId: string) =>
  body.muscles.some(({ mesh, ref }) => ref.muscle.id === muscleId && mesh.visible)
