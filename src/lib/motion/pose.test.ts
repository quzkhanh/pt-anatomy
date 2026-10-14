import { Vector3 } from 'three'
import { describe, expect, it } from 'vitest'
import { jointAngles, lerpPose, solvePose, standing, type Pose } from './pose'
import { DIM, STANDING_PELVIS_Y } from './skeleton'

describe('solvePose', () => {
  it('đứng thẳng: cổ chân ở độ cao mắt cá, bàn chân nằm trên sàn, vai đúng bề rộng', () => {
    const j = solvePose(standing())
    for (const side of ['l', 'r'] as const) {
      expect(j[side].ankle.y).toBeCloseTo(DIM.ankleHeight, 3)
      expect(j[side].heel.y).toBeCloseTo(0, 3)
      expect(j[side].toe.y).toBeCloseTo(0, 3)
      expect(j[side].toe.z).toBeGreaterThan(j[side].heel.z)
    }
    expect(j.l.shoulder.distanceTo(j.r.shoulder)).toBeCloseTo(2 * DIM.shoulderHalfWidth, 3)
    expect(j.l.shoulder.x).toBeGreaterThan(0)
    expect(j.pelvis.y).toBeCloseTo(STANDING_PELVIS_Y, 3)
  })

  it('gập thân ra trước thì ngực dịch về +Z; gập vai (flex) đưa tay ra trước', () => {
    const pose = standing()
    pose.spine = [40, 0, 0]
    pose.arms.l = { flex: 90, abd: 0, bend: 0 }
    const j = solvePose(pose)
    expect(j.chest.z).toBeGreaterThan(j.pelvis.z)
    expect(j.l.grip.z).toBeGreaterThan(j.l.shoulder.z + 0.2)
  })

  it('góc gập khuỷu và gối đo lại đúng góc đã đặt', () => {
    const pose = standing()
    pose.arms.r = { flex: 0, abd: 0, bend: 90 }
    pose.legs.l = { flex: 90, abd: 0, bend: 90 }
    const a = jointAngles(solvePose(pose))
    expect(a.elbowR).toBeCloseTo(90, 1)
    expect(a.kneeL).toBeCloseTo(90, 1)
    expect(a.hipFlexL).toBeCloseTo(90, 1)
    expect(a.elbowL).toBeCloseTo(0, 1)
  })

  it('IK chân: cổ chân tới đúng đích, gối gập về phía pole', () => {
    const pose: Pose = standing()
    pose.pelvis = [0, STANDING_PELVIS_Y - 0.3, -0.1]
    const j = solvePose(pose)
    expect(j.l.ankle.distanceTo(solvePose(standing()).l.ankle)).toBeLessThan(1e-4)
    expect(j.l.knee.z).toBeGreaterThan(j.l.ankle.z)
  })

  it('nội suy hai tư thế: t = 0, 0.5, 1', () => {
    const a = standing()
    const b = standing()
    b.pelvis = [0, 0.5, 0]
    b.spine = [60, 0, 0]
    expect(lerpPose(a, b, 0).pelvis[1]).toBeCloseTo(a.pelvis[1])
    expect(lerpPose(a, b, 1).spine[0]).toBeCloseTo(60)
    expect(lerpPose(a, b, 0.5).pelvis[1]).toBeCloseTo((a.pelvis[1] + 0.5) / 2)
  })

  it('gập cổ tay: bàn tay lệch khỏi trục cẳng tay đúng góc, về phía lòng bàn tay', () => {
    const pose = standing()
    pose.arms.l = { flex: 0, abd: 0, bend: 90 }
    pose.wrists = { l: 60 }
    const j = solvePose(pose)
    const forearm = j.l.wrist.clone().sub(j.l.elbow).normalize()
    const hand = j.l.grip.clone().sub(j.l.wrist).normalize()
    expect((forearm.angleTo(hand) * 180) / Math.PI).toBeCloseTo(60, 1)
    expect(hand.y).toBeGreaterThan(0)
    expect(lerpPose(pose, standing(), 0.5).wrists?.l).toBeCloseTo(30)
  })

  it('nâng bả vai (scapula): vai và tay lên, thân và đầu đứng yên', () => {
    const base = solvePose(standing())
    const pose = standing()
    pose.scapula = { l: [0.06, 0], r: [0.06, 0] }
    const j = solvePose(pose)
    expect(j.l.shoulder.y - base.l.shoulder.y).toBeCloseTo(0.06, 4)
    expect(j.r.grip.y - base.r.grip.y).toBeCloseTo(0.06, 4)
    expect(j.head.y).toBeCloseTo(base.head.y, 6)
    expect(lerpPose(pose, standing(), 0.5).scapula?.l?.[0]).toBeCloseTo(0.03)
  })

  it('xoay cẳng tay: ngửa thì lòng bàn tay về trước, trung tính hướng vào trong, sấp thì quay ra sau', () => {
    const palm = (rot: number) => {
      const pose = standing()
      pose.arms.l = { flex: 0, abd: 0, bend: 0 }
      pose.forearms = { l: rot }
      return solvePose(pose).l.palm
    }
    expect(palm(0).z).toBeCloseTo(1, 3)
    expect(palm(90).x).toBeCloseTo(-1, 3)
    expect(palm(180).z).toBeCloseTo(-1, 3)
  })

  it('cổ tay gập theo lòng bàn tay: cẳng tay sấp thì gập cổ tay đưa bàn tay ra sau', () => {
    const pose = standing()
    pose.arms.r = { flex: 0, abd: 0, bend: 0 }
    pose.forearms = { r: 180 }
    pose.wrists = { r: 40 }
    const j = solvePose(pose)
    expect(j.r.grip.z).toBeLessThan(j.r.wrist.z - 0.02)
  })

  it('IK + duỗi cổ tay: điểm nắm vẫn trùng đích, bàn tay lệch khỏi cẳng tay đúng góc', () => {
    const pose = standing()
    pose.arms.l = { target: [0.25, 1.0, 0.3], pole: [1, 0, -1] }
    pose.forearms = { l: 180 }
    pose.wrists = { l: -70 }
    const j = solvePose(pose)
    expect(j.l.grip.distanceTo(new Vector3(0.25, 1.0, 0.3))).toBeLessThan(0.01)
    const forearm = j.l.wrist.clone().sub(j.l.elbow).normalize()
    const hand = j.l.grip.clone().sub(j.l.wrist).normalize()
    expect((forearm.angleTo(hand) * 180) / Math.PI).toBeCloseTo(70, 0)
  })
})
