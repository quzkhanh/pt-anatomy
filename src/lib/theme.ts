import { Color } from 'three'

export interface ThemeColors {
  background: Color
  muscle: Color
  head: Color
  bone: Color
  selected: Color
  secondary: Color
  rim: Color
  prop: Color
  propHeavy: Color
  pad: Color
  band: Color
  floor: Color
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
    bone: cssColor('--color-bone'),
    selected: cssColor('--color-selected'),
    secondary: cssColor('--color-secondary'),
    rim: cssColor('--color-rim'),
    prop: cssColor('--color-prop'),
    propHeavy: cssColor('--color-prop-heavy'),
    pad: cssColor('--color-pad'),
    band: cssColor('--color-band'),
    floor: cssColor('--color-floor'),
    sky: cssColor('--color-light-sky'),
    ground: cssColor('--color-light-ground'),
  }
}

export const LIGHTING = {
  hemisphere: 1.0,
  sun: 1.8,
  rim: 0.25,
} as const
