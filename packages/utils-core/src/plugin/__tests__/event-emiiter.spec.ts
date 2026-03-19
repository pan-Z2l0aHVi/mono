import { describe, expect, it, vi } from 'vitest'

import { defineEventEmitter } from '../event-emitter'

describe('EventEmitter 单元测试', () => {
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

    app.on('user:update', (id, name, role) => {
      const user = `ID: ${id}, Name: ${name}, Role: ${role}`
      users.push(user)
    })

    app.emit('user:update', 1, 'Tom', 'admin')

    expect(users).toEqual(['ID: 1, Name: Tom, Role: admin'])
  })
})
