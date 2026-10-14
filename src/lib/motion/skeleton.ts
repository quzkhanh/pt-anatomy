/**
 * Segment lengths as fractions of body height, from the Drillis & Contini anthropometric table
 * reproduced in Winter, "Biomechanics and Motor Control of Human Movement" (4th ed., fig. 4.1).
 * Axes: +Y up, the body faces +Z, the person's left is +X. Units: metres.
 */
const HEIGHT = 1.75

const h = (fraction: number) => fraction * HEIGHT

export const DIM = {
  ankleHeight: h(0.039),
  shank: h(0.246),
  thigh: h(0.245),
  hipHalfWidth: h(0.05),
  pelvisToSpine: h(0.05),
  spineToChest: h(0.14),
  chestToNeck: h(0.12),
  chestToShoulder: h(0.098),
  shoulderHalfWidth: h(0.1),
  neckToHead: h(0.09),
  headRadius: h(0.065),
  upperArm: h(0.186),
  forearm: h(0.146),
  /** Wrist to the centre of a closed grip. */
  hand: h(0.055),
  footLength: h(0.152),
  heelBehindAnkle: h(0.04),
} as const

/** Pelvis height when standing upright (hip joint centres, Drillis & Contini 0.530 H). */
export const STANDING_PELVIS_Y = DIM.ankleHeight + DIM.shank + DIM.thigh

export type Side = 'l' | 'r'
export const SIDES: Side[] = ['l', 'r']
/** +1 for the left side (+X), -1 for the right. */
export const sideSign = (side: Side) => (side === 'l' ? 1 : -1)
