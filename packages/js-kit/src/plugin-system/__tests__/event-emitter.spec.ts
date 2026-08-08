import { describe, expect, it, vi } from 'vite-plus/test'

import { defineEventEmitter } from '..'

describe('EventEmitter 测试', () => {
  it('应当支持注册和触发事件回调', () => {
    const logSpy = vi.spyOn(console, 'log')

    const eventEmitter = defineEventEmitter<{
      click: [string]
    }>().make()
    eventEmitter.on('click', e => {
      console.log(`${e} click 1`)
    })
    eventEmitter.on('click', e => {
      console.log(`${e} click 2`)
    })
    eventEmitter.emit('click', 'Tom')

    expect(logSpy).toHaveBeenCalledWith('Tom click 1')
    expect(logSpy).toHaveBeenCalledWith('Tom click 2')
  })

  it('应当支持传递 rest 参数', () => {
    const eventPlugin = defineEventEmitter<{
      'user:update': [number, string, 'admin' | 'user']
      'app:start': []
    }>()
    const app = eventPlugin.make()
    const users: string[] = []

    app.on('user:update', (id: number, name: string, role: string) => {
      const user = `ID: ${id}, Name: ${name}, Role: ${role}`
      users.push(user)
    })

    app.emit('user:update', 1, 'Tom', 'admin')

    expect(users).toEqual(['ID: 1, Name: Tom, Role: admin'])
  })

  it('on 返回的清理函数应退订回调', () => {
    const app = defineEventEmitter<{ click: [string] }>().make()
    const handler = vi.fn<() => void>()

    const unsubscribe = app.on('click', handler)
    app.emit('click', 'a')
    expect(handler).toHaveBeenCalledTimes(1)

    unsubscribe()
    app.emit('click', 'b')
    expect(handler).toHaveBeenCalledTimes(1) // 退订后不再触发
  })

  it('once: true 应只触发一次后自动退订', () => {
    const app = defineEventEmitter<{ click: [string] }>().make()
    const handler = vi.fn<() => void>()

    app.on('click', handler, { once: true })
    app.emit('click', 'a')
    app.emit('click', 'b')
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('多次退订同一 handler 不应影响其他订阅者', () => {
    const app = defineEventEmitter<{ click: [string] }>().make()
    const handlerA = vi.fn<() => void>()
    const handlerB = vi.fn<() => void>()

    app.on('click', handlerA)
    app.on('click', handlerB)
    app.emit('click', 'x')
    expect(handlerA).toHaveBeenCalledTimes(1)
    expect(handlerB).toHaveBeenCalledTimes(1)

    app.emit('click', 'y')
    expect(handlerA).toHaveBeenCalledTimes(2)
    expect(handlerB).toHaveBeenCalledTimes(2)
  })
})
