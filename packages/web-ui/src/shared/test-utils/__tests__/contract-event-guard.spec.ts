import { describe, expect, it } from 'vite-plus/test'

import { assertNonEmptyCounts, contractEvent } from '@/shared/test-utils'
import type { TestableElement } from '@/shared/test-utils'

/**
 * `contractEvent` 的空 `counts` 护栏（跨批承诺 #7）。
 *
 * 背景：生成器用例体里的 `expect` 写在循环内，静态门禁 `vitest/expect-expect` 只认语法上
 * 存在 `expect(...)`，因此 `counts: {}` 会生成**零断言的空过用例**且门禁不拦。
 * 本 spec 固定住「收集期硬失败」这一行为。
 */
class StubElement extends HTMLElement implements TestableElement {
  updateComplete: Promise<unknown> = Promise.resolve()
}

const createStub = (): StubElement => new StubElement()

describe('contractEvent 空 counts 护栏', () => {
  it('空 counts 会在收集期抛错，而不是生成零断言用例', () => {
    expect(() => assertNonEmptyCounts('空集合', [{ title: '没有任何事件', counts: {} }])).toThrow(/counts 为空/)
  })

  it('真实调用路径（contractEvent）同样在注册用例前抛错', () => {
    expect(() => contractEvent('空集合', createStub, [{ title: '无断言', act: () => {}, counts: {} }])).toThrow(
      /counts 为空/
    )
  })

  it('护栏逐条检查，任一用例为空即失败', () => {
    expect(() =>
      assertNonEmptyCounts('混合', [
        { title: '有效', counts: { change: 1 } },
        { title: '空', counts: {} }
      ])
    ).toThrow(/「空」/)
  })

  it('非空 counts 不抛错', () => {
    expect(() => assertNonEmptyCounts('正常', [{ title: '一次', counts: { change: 1 } }])).not.toThrow()
    expect(() => assertNonEmptyCounts('零次也是断言', [{ title: '静默', counts: { change: 0 } }])).not.toThrow()
  })
})
