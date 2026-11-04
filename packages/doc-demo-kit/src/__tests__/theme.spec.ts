import { describe, expect, it } from 'vite-plus/test'

import {
  isSidebarWidth,
  isThemeAppearance,
  isThemeMotion,
  SIDEBAR_WIDTH_STORAGE_KEY,
  THEME_APPEARANCE_STORAGE_KEY,
  THEME_MOTION_STORAGE_KEY
} from '../theme'

describe('主题存储键', () => {
  it('键名是两端共同的落盘键，改动等于丢掉已有偏好', () => {
    expect(THEME_APPEARANCE_STORAGE_KEY).toBe('theme-appearance')
    expect(THEME_MOTION_STORAGE_KEY).toBe('theme-motion')
    expect(SIDEBAR_WIDTH_STORAGE_KEY).toBe('sidebar-width')
  })
})

describe('外观校验', () => {
  it('接受三档外观', () => {
    for (const value of ['light', 'dark', 'system']) expect(isThemeAppearance(value)).toBe(true)
  })

  it('拒绝大小写不符、空值与非字符串', () => {
    for (const value of ['Light', 'auto', '', null, undefined, 1, {}, ['dark']]) {
      expect(isThemeAppearance(value)).toBe(false)
    }
  })
})

describe('动效校验', () => {
  it('接受三档动效', () => {
    for (const value of ['full', 'reduced', 'system']) expect(isThemeMotion(value)).toBe(true)
  })

  it('拒绝外观值与非法输入', () => {
    for (const value of ['light', 'none', '', null, undefined, 0, {}]) expect(isThemeMotion(value)).toBe(false)
  })
})

describe('侧栏宽度校验', () => {
  it('接受整数与小数 px 长度', () => {
    for (const value of ['240px', '0px', '120px', '12.5px']) expect(isSidebarWidth(value)).toBe(true)
  })

  it('拒绝无单位、其他单位、负数、空白与非字符串', () => {
    for (const value of ['240', '240 px', '240em', '240%', '-1px', ' 240px', 'px', '', null, 240, {}]) {
      expect(isSidebarWidth(value)).toBe(false)
    }
  })
})
