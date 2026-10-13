import { Color } from 'three'

export interface ThemeColors {
  background: Color
  muscle: Color
  head: Color
  selected: Color
  secondary: Color
  sky: Color
  ground: Color
}

const cssColor = (name: string) =>
  new Color(getComputedStyle(document.documentElement).getPropertyValue(name).trim())

export function readThemeColors(): ThemeColors {
  return {
    background: cssColor('--color-bg'),
    muscle: cssColor('--color-muscle'),
    head: cssColor('--color-head'),
    selected: cssColor('--color-selected'),
    secondary: cssColor('--color-secondary'),
    sky: cssColor('--color-light-sky'),
    ground: cssColor('--color-light-ground'),
  }
}

export const LIGHTING = {
  hemisphere: 1.6,
  sun: 1.4,
} as const
