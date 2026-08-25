import { describe, expect, it } from 'vite-plus/test'

import { UserChangeController } from '../user-change'

describe('UserChangeController', () => {
  it('初始状态无待消费的用户变更', () => {
    const controller = new UserChangeController()
    expect(controller.consume()).toBe(false)
  })

  it('mark 后首次 consume 返回 true，再次 consume 复位为 false', () => {
    const controller = new UserChangeController()
    controller.mark()

    expect(controller.consume()).toBe(true)
    expect(controller.consume()).toBe(false)
  })

  it('连续多次 mark 仍只消费一次（布尔标记语义）', () => {
    const controller = new UserChangeController()
    controller.mark()
    controller.mark()
    controller.mark()

    expect(controller.consume()).toBe(true)
    expect(controller.consume()).toBe(false)
  })

  it('consume 后再 mark 可重新触发', () => {
    const controller = new UserChangeController()
    controller.mark()
    controller.consume()

    controller.mark()
    expect(controller.consume()).toBe(true)
  })
})
