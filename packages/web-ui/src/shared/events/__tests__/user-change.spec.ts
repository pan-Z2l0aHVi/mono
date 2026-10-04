import { describe, expect, it } from 'vite-plus/test'

import { UserChangeController } from '../user-change'

describe('UserChangeController', () => {
  it('初始状态无待消费的用户变更', () => {
    expect(new UserChangeController().consume()).toBe(false)
  })

  // 布尔标记语义：`updated()` 每次只消费一次，连续 mark 不累积成多次「用户变更」，
  // 而消费后可以重新武装。组件靠这一条区分「用户点了」与「程序改的」。
  it('mark 后只消费一次，消费后可重新武装', () => {
    const controller = new UserChangeController()

    controller.mark()
    controller.mark()
    expect(controller.consume()).toBe(true)
    expect(controller.consume()).toBe(false)

    controller.mark()
    expect(controller.consume()).toBe(true)
  })
})
