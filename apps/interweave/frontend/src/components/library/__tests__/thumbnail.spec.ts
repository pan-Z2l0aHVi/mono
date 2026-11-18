import { describe, expect, it } from 'vite-plus/test'

import { isBlackFrame, videoFrameCandidates } from '../thumbnail'

describe('resource thumbnail', () => {
  /*
   * 「ratio = 0.25、首选 25% 帧、候选表含 0/4/6」的接线级断言已删：videoFrameRatio 与候选表
   * 怎么被消费，由 thumbnail-frame-walk.browser.spec.ts 在消费方上按行为承接（首 seek =
   * duration × ratio、黑帧回退到后续候选）；本文件只保留候选表函数自身的纯函数契约。
   */
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
