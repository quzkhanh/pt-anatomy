import { Color } from 'three'

export interface ThemeColors {
  background: Color
  muscle: Color
  head: Color
  selected: Color
}

const cssColor = (name: string) =>
  new Color(getComputedStyle(document.documentElement).getPropertyValue(name).trim())

export function readThemeColors(): ThemeColors {
  return {
    background: cssColor('--color-bg'),
    muscle: cssColor('--color-muscle'),
    head: cssColor('--color-head'),
    selected: cssColor('--color-selected'),
  }
}

export const LIGHTING = {
  sky: 0xffffff,
  ground: 0x8a8580,
  hemisphere: 1.6,
  sun: 1.4,
} as const
