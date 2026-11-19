/**
 * 激活门槛：Rex 会话内零参数激活，`PI_REX_ORCH=0` 与非 Rex 终端都不激活。
 */

import { describe, expect, it } from 'vite-plus/test'

import { detectActivation } from '../activation'

describe('激活门槛', () => {
  it('REX_SESSION 存在且未显式关闭时激活', () => {
    expect(detectActivation({ REX_SESSION: 'session:x', PI_REX_ORCH: undefined })).toEqual({ active: true })
    expect(detectActivation({ REX_SESSION: 'session:x', PI_REX_ORCH: '1' })).toEqual({ active: true })
  })

  it('PI_REX_ORCH=0 时不激活（防递归）', () => {
    expect(detectActivation({ REX_SESSION: 'session:x', PI_REX_ORCH: '0' })).toEqual({
      active: false,
      reason: 'disabled-by-env'
    })
  })

  it('非 Rex 终端（无 REX_SESSION 或空白）不激活', () => {
    expect(detectActivation({})).toEqual({ active: false, reason: 'no-rex-session' })
    expect(detectActivation({ REX_SESSION: '   ' })).toEqual({ active: false, reason: 'no-rex-session' })
  })
})
