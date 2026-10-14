import type { Color } from 'three'
import { isSuperficial, type PartRef } from '../content'
import { refCovers } from '../refs'
import { LIGHTING, type ThemeColors } from '../theme'
import type { Body, BoneMesh } from './model'
import { rimMaterial } from './material'

export interface Highlight {
  primary: string[]
  secondary: string[]
}

/** What the body viewer shows: muscles plus, in skeleton mode, bones by bones.glb object name. */
export interface SceneHighlight extends Highlight {
  /** The tapped bone. */
  selectedBones: string[]
  /** Where the selected muscle attaches. */
  attachedBones: string[]
}

export interface HighlightState extends SceneHighlight {
  superficialHidden: boolean
  skeleton: boolean
}

export const NO_HIGHLIGHT: SceneHighlight = { primary: [], secondary: [], selectedBones: [], attachedBones: [] }

export type Materials = ReturnType<typeof createMaterials>

export function createMaterials(colors: ThemeColors) {
  const matte = (color: Color) => rimMaterial(color, colors.rim, LIGHTING.rim)
  return {
    muscle: matte(colors.muscle),
    primary: matte(colors.selected),
    secondary: matte(colors.secondary),
    head: matte(colors.head),
    bone: matte(colors.bone),
  }
}

export const covers = (refs: string[], { muscle, part }: PartRef) => refs.some((r) => refCovers(r, muscle.id, part.id))

/** Skeleton mode shows the bones and only the highlighted muscles, wherever their layer is. */
export function applyHighlight(body: Body, bones: BoneMesh[], materials: Materials, state: HighlightState) {
  for (const { mesh, ref } of body.muscles) {
    const primary = covers(state.primary, ref)
    const secondary = !primary && covers(state.secondary, ref)
    mesh.material = primary ? materials.primary : secondary ? materials.secondary : materials.muscle
    mesh.visible = state.skeleton ? primary || secondary : !(state.superficialHidden && isSuperficial(ref))
  }
  for (const mesh of body.filler) mesh.visible = !state.skeleton
  for (const { mesh, bone } of bones) {
    mesh.visible = state.skeleton
    mesh.material = state.selectedBones.includes(bone.object)
      ? materials.primary
      : state.attachedBones.includes(bone.object)
        ? materials.secondary
        : materials.bone
  }
}

export const anyVisible = (body: Body, refs: string[]) =>
  body.muscles.some(({ mesh, ref }) => mesh.visible && covers(refs, ref))
