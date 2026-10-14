import type { Color } from 'three'
import { isSuperficial, type PartRef } from '../content'
import { refCovers } from '../refs'
import { LIGHTING, type ThemeColors } from '../theme'
import type { Body } from './model'
import { rimMaterial } from './material'

export interface Highlight {
  primary: string[]
  secondary: string[]
}

export interface HighlightState extends Highlight {
  superficialHidden: boolean
}

export const NO_HIGHLIGHT: Highlight = { primary: [], secondary: [] }

export type Materials = ReturnType<typeof createMaterials>

export function createMaterials(colors: ThemeColors) {
  const matte = (color: Color) => rimMaterial(color, colors.rim, LIGHTING.rim)
  return {
    muscle: matte(colors.muscle),
    primary: matte(colors.selected),
    secondary: matte(colors.secondary),
    head: matte(colors.head),
  }
}

export const covers = (refs: string[], { muscle, part }: PartRef) => refs.some((r) => refCovers(r, muscle.id, part.id))

export function applyHighlight(body: Body, materials: Materials, state: HighlightState) {
  for (const { mesh, ref } of body.muscles) {
    mesh.material = covers(state.primary, ref)
      ? materials.primary
      : covers(state.secondary, ref)
        ? materials.secondary
        : materials.muscle
    mesh.visible = !(state.superficialHidden && isSuperficial(ref))
  }
}

export const anyVisible = (body: Body, refs: string[]) =>
  body.muscles.some(({ mesh, ref }) => mesh.visible && covers(refs, ref))
