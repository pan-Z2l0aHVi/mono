import { describe, expect, it } from 'vite-plus/test'

import { resolveArtifactsMode } from '../vite'

/*
 * 判定纯函数钉的是行为口径：测试期只判不改（check），dev 与 build 期落盘（write）。语义按
 * 原 `process.env.VITEST` 真值判定钉死——值不解释，空串与缺席都是 write，谁都不是默认写盘。
 */
describe('resolveArtifactsMode', () => {
  it('VITEST 在场判 check，测试期只判不改', () => {
    expect(resolveArtifactsMode({ VITEST: 'true' })).toBe('check')
    expect(resolveArtifactsMode({ VITEST: 'false' })).toBe('check')
    expect(resolveArtifactsMode({ VITEST: '0' })).toBe('check')
  })

  it('VITEST 缺席或空串判 write', () => {
    expect(resolveArtifactsMode({})).toBe('write')
    expect(resolveArtifactsMode({ VITEST: '' })).toBe('write')
  })
})
