import { describe, expect, it } from 'vite-plus/test'

import { isBlackFrame, videoFrameCandidates, videoFrameRatio } from '../thumbnail'

describe('resource thumbnail', () => {
  it('视频优先使用固定 25% 帧，并为黑帧提供确定性回退', () => {
    const candidates = videoFrameCandidates(8)

    expect(videoFrameRatio).toBe(0.25)
    expect(candidates[0]).toBe(2)
    expect(candidates).toContain(0)
    expect(candidates).toContain(4)
    expect(candidates).toContain(6)
  })

  it('不可用或非有限时长从最早帧开始继续寻找非黑帧', () => {
    expect(videoFrameCandidates(Number.NaN)).toEqual([0, 0.25, 0.5, 1, 2, 4, 8])
    expect(videoFrameCandidates(0)).toEqual([0, 0.25, 0.5, 1, 2, 4, 8])
  })

  it('已知时长会覆盖短黑场内的首个非黑帧', () => {
    expect(videoFrameCandidates(4)).toContain(2.5)
    expect(videoFrameCandidates(4)).toContain(4)
  })

  it('识别透明与全黑像素，但保留非黑帧', () => {
    expect(isBlackFrame(new Uint8ClampedArray([0, 0, 0, 0]))).toBe(true)
    expect(isBlackFrame(new Uint8ClampedArray([2, 2, 2, 255, 1, 1, 1, 255]))).toBe(true)
    expect(isBlackFrame(new Uint8ClampedArray([40, 80, 120, 255]))).toBe(false)
  })
})
