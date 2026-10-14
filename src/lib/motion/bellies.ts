/**
 * Superficial muscle groups drawn on the mannequin as ellipsoids. Each carries the muscle refs it stands
 * for, so it lights up with the same exercise refs as the anatomical model. Deep muscles have no belly
 * on purpose: the player lists them instead of colouring a place where they are not.
 *
 * `seg` is the body segment the belly rides on; `at` is the position along it (0 = proximal joint,
 * 1 = distal) for limbs or the height offset in metres for trunk segments. `off` is [lateral, front]
 * in metres, `size` the ellipsoid radii [lateral, along the segment, front].
 */
export type Segment = 'chest' | 'abdomen' | 'pelvis' | 'neck' | 'upperArm' | 'forearm' | 'thigh' | 'shank'

export interface Belly {
  refs: string[]
  seg: Segment
  at: number
  off: [number, number]
  size: [number, number, number]
}

export const BELLIES: Belly[] = [
  { refs: ['pectoralis-major.clavicular'], seg: 'chest', at: 0.11, off: [0.075, 0.085], size: [0.07, 0.03, 0.03] },
  { refs: ['pectoralis-major.sternocostal'], seg: 'chest', at: 0.05, off: [0.07, 0.095], size: [0.075, 0.045, 0.035] },
  { refs: ['serratus-anterior'], seg: 'chest', at: 0.0, off: [0.135, 0.04], size: [0.02, 0.05, 0.035] },
  { refs: ['trapezius.upper'], seg: 'chest', at: 0.15, off: [0.075, -0.035], size: [0.06, 0.03, 0.035] },
  { refs: ['trapezius.middle'], seg: 'chest', at: 0.07, off: [0.055, -0.095], size: [0.065, 0.045, 0.025] },
  { refs: ['trapezius.lower'], seg: 'chest', at: -0.02, off: [0.035, -0.095], size: [0.04, 0.06, 0.022] },
  { refs: ['latissimus-dorsi'], seg: 'chest', at: -0.03, off: [0.105, -0.06], size: [0.045, 0.1, 0.04] },
  { refs: ['teres-major'], seg: 'chest', at: 0.05, off: [0.125, -0.07], size: [0.025, 0.025, 0.025] },
  { refs: ['sternocleidomastoid'], seg: 'neck', at: 0.5, off: [0.025, 0.03], size: [0.014, 0.05, 0.014] },
  { refs: ['rectus-abdominis'], seg: 'abdomen', at: 0.0, off: [0.033, 0.1], size: [0.032, 0.1, 0.022] },
  { refs: ['external-oblique'], seg: 'abdomen', at: 0.0, off: [0.1, 0.055], size: [0.035, 0.08, 0.04] },
  { refs: ['erector-spinae'], seg: 'abdomen', at: 0.0, off: [0.035, -0.09], size: [0.028, 0.12, 0.028] },
  { refs: ['gluteus-maximus'], seg: 'pelvis', at: -0.04, off: [0.075, -0.095], size: [0.075, 0.085, 0.055] },
  { refs: ['gluteus-medius'], seg: 'pelvis', at: 0.04, off: [0.13, -0.02], size: [0.04, 0.05, 0.05] },
  { refs: ['tensor-fasciae-latae'], seg: 'pelvis', at: -0.02, off: [0.14, 0.04], size: [0.022, 0.04, 0.022] },
  { refs: ['deltoid.anterior'], seg: 'upperArm', at: 0.08, off: [0.015, 0.035], size: [0.03, 0.06, 0.028] },
  { refs: ['deltoid.middle'], seg: 'upperArm', at: 0.08, off: [0.04, 0.0], size: [0.03, 0.065, 0.032] },
  { refs: ['deltoid.posterior'], seg: 'upperArm', at: 0.08, off: [0.015, -0.035], size: [0.03, 0.06, 0.028] },
  { refs: ['biceps-brachii'], seg: 'upperArm', at: 0.55, off: [0.0, 0.03], size: [0.03, 0.075, 0.03] },
  { refs: ['triceps-brachii'], seg: 'upperArm', at: 0.5, off: [0.0, -0.033], size: [0.033, 0.085, 0.03] },
  { refs: ['brachioradialis'], seg: 'forearm', at: 0.22, off: [0.025, 0.012], size: [0.022, 0.06, 0.02] },
  {
    refs: ['flexor-carpi-radialis', 'flexor-carpi-ulnaris', 'palmaris-longus', 'pronator-teres', 'flexor-digitorum-superficialis'],
    seg: 'forearm',
    at: 0.3,
    off: [-0.008, 0.022],
    size: [0.026, 0.075, 0.02],
  },
  {
    refs: ['extensor-carpi-radialis-longus', 'extensor-carpi-radialis-brevis', 'extensor-digitorum', 'extensor-carpi-ulnaris'],
    seg: 'forearm',
    at: 0.32,
    off: [0.006, -0.022],
    size: [0.026, 0.075, 0.02],
  },
  { refs: ['quadriceps-femoris.rectus-femoris'], seg: 'thigh', at: 0.45, off: [0.0, 0.055], size: [0.035, 0.13, 0.03] },
  { refs: ['quadriceps-femoris.vastus-lateralis'], seg: 'thigh', at: 0.5, off: [0.05, 0.02], size: [0.032, 0.13, 0.04] },
  { refs: ['quadriceps-femoris.vastus-medialis'], seg: 'thigh', at: 0.78, off: [-0.04, 0.03], size: [0.03, 0.06, 0.03] },
  { refs: ['biceps-femoris'], seg: 'thigh', at: 0.5, off: [0.025, -0.05], size: [0.03, 0.12, 0.03] },
  { refs: ['semitendinosus', 'semimembranosus'], seg: 'thigh', at: 0.5, off: [-0.025, -0.05], size: [0.03, 0.12, 0.03] },
  {
    refs: ['adductor-longus', 'adductor-magnus', 'adductor-brevis', 'gracilis', 'pectineus'],
    seg: 'thigh',
    at: 0.32,
    off: [-0.055, 0.0],
    size: [0.03, 0.11, 0.04],
  },
  { refs: ['gastrocnemius.medial'], seg: 'shank', at: 0.3, off: [-0.018, -0.04], size: [0.026, 0.08, 0.03] },
  { refs: ['gastrocnemius.lateral'], seg: 'shank', at: 0.3, off: [0.018, -0.038], size: [0.024, 0.075, 0.028] },
  { refs: ['soleus'], seg: 'shank', at: 0.6, off: [0.0, -0.035], size: [0.035, 0.08, 0.022] },
  { refs: ['tibialis-anterior'], seg: 'shank', at: 0.35, off: [0.02, 0.03], size: [0.018, 0.09, 0.018] },
  { refs: ['fibularis-longus', 'fibularis-brevis'], seg: 'shank', at: 0.45, off: [0.04, 0.0], size: [0.015, 0.09, 0.016] },
]
