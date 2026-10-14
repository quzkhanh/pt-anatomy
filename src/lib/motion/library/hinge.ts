import type { Motion } from '../motion'
import { lerpPose, type Pose } from '../pose'
import { armsAngles, clone, key, stand } from './helpers'

/** Shoulder abduction that puts the hands about 0.27 m from the midline (just outside the thighs). */
const GRIP_ABD = 8
/** Pronated (overhand) grip: palms face the thighs. */
const FOREARM = 180
/**
 * Arm angle beyond the trunk's tilt, so the straight arms keep the bar in light contact with the front of
 * the thighs at the top and the shins at the bottom (bar over mid-foot).
 */
const TOP = { drop: 0.01, z: -0.03, lean: 2, armLead: 9 }
/** Halfway down the arms swing back a little more, so the bar keeps brushing the thighs instead of drifting off them. */
const MID_LEAD = -7.3
const BOTTOM = { pelvis: [0, 0.874, -0.25] as [number, number, number], lean: 67, armLead: -14.5 }

const hangArms = (p: Pose, lead: number) => armsAngles(p, { flex: p.pelvisRot[0] + p.spine[0] + lead, abd: GRIP_ABD, bend: 0 })

/**
 * Romanian deadlift: knees softly bent throughout, hips pushed back with a flat back, bar sliding down the
 * thighs to just below the knees.
 */
export function romanianDeadlift(): Motion {
  const top = stand(0.12)
  top.pelvis = [0, top.pelvis[1] - TOP.drop, TOP.z]
  top.pelvisRot = [TOP.lean, 0, 0]
  top.forearms = { l: FOREARM, r: FOREARM }
  const bottom = clone(top)
  bottom.pelvis = BOTTOM.pelvis
  bottom.pelvisRot = [BOTTOM.lean, 0, 0]
  hangArms(top, TOP.armLead)
  hangArms(bottom, BOTTOM.armLead)
  const mid = hangArms(lerpPose(top, bottom, 0.5), MID_LEAD)
  return {
    keys: [
      key(0, top, 'Đẩy hông ra sau'),
      key(0.25, mid, 'Đẩy hông ra sau'),
      key(0.5, bottom, 'Đẩy hông tới'),
      key(0.69, mid, 'Đẩy hông tới'),
      key(0.88, top, 'Đứng thẳng'),
    ],
    props: [{ kind: 'barbell', at: 'grips' }],
    seconds: 3.6,
  }
}
