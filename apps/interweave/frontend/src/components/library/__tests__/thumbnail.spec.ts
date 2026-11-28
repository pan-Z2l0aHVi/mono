import { describe, expect, it } from 'vite-plus/test'

import {
  isBlackFrame,
  isCrossOriginMediaUrl,
  redactSessionMediaUrl,
  videoFrameCandidates,
  videoFrameRatio
} from '../thumbnail'

describe('resource thumbnail', () => {
  it('不可用或非有限时长只保留首帧 0，避免对未知时长视频盲目 seek', () => {
    expect(videoFrameCandidates(Number.NaN)).toEqual([0])
    expect(videoFrameCandidates(0)).toEqual([0])
    expect(videoFrameCandidates(-5)).toEqual([0])
  })

  it('已知时长优先 25% 处并收敛到不超过 5 个代表性候选点', () => {
    const candidates = videoFrameCandidates(4)
    expect(candidates[0]).toBe(4 * videoFrameRatio)
    expect(candidates.length).toBeLessThanOrEqual(5)
    expect(candidates).toContain(2)
    expect(candidates).toContain(0)
  })

  it('识别透明与全黑像素，但保留非黑帧', () => {
    expect(isBlackFrame(new Uint8ClampedArray([0, 0, 0, 0]))).toBe(true)
    expect(isBlackFrame(new Uint8ClampedArray([2, 2, 2, 255, 1, 1, 1, 255]))).toBe(true)
    expect(isBlackFrame(new Uint8ClampedArray([40, 80, 120, 255]))).toBe(false)
  })

  it('准确区分同源相对路径与跨源本地媒体服务 URL，并脱敏会话令牌', () => {
    expect(isCrossOriginMediaUrl('/resource-media/s1')).toBe(false)
    expect(isCrossOriginMediaUrl('blob:http://localhost/abc')).toBe(false)
    expect(isCrossOriginMediaUrl('data:image/jpeg;base64,AA==')).toBe(false)
    expect(isCrossOriginMediaUrl('http://127.0.0.1:45678/s/secret-token/resource-media/s1')).toBe(true)
    expect(redactSessionMediaUrl('http://127.0.0.1:45678/s/secret-token/resource-media/s1')).toBe(
      'http://127.0.0.1:45678/s/[REDACTED]/resource-media/s1'
    )
  })
})
