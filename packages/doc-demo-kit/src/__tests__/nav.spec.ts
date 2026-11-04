import { describe, expect, it } from 'vite-plus/test'

import { isNavActive, NAV_SECTIONS } from '../nav'

const COMPONENT_PATHS = [
  '/components/button',
  '/components/icon',
  '/components/layout',
  '/components/back-top',
  '/components/theme',
  '/components/input',
  '/components/textarea',
  '/components/input-number',
  '/components/select',
  '/components/autocomplete',
  '/components/switch',
  '/components/slider',
  '/components/radio',
  '/components/checkbox',
  '/components/segmented',
  '/components/collapse',
  '/components/editable-text',
  '/components/empty',
  '/components/grouped-text',
  '/components/middle-ellipsis',
  '/components/svg-draw-lines',
  '/components/avatar',
  '/components/badge',
  '/components/dialog',
  '/components/drawer',
  '/components/tooltip',
  '/components/popover',
  '/components/dropdown',
  '/components/context-menu',
  '/components/toast',
  '/components/image-preview',
  '/components/shake',
  '/components/spinner',
  '/components/progress'
]

describe('导航数据', () => {
  it('章节按通用、布局、表单、展示、反馈的顺序出现', () => {
    expect(NAV_SECTIONS.map(section => section.id)).toEqual(['general', 'layout', 'form', 'display', 'feedback'])
  })

  it('组件页路径与顺序就是两端共享的导航契约', () => {
    expect(NAV_SECTIONS.flatMap(section => section.items.map(item => item.path))).toEqual(COMPONENT_PATHS)
  })

  it('条目标签是组件名，两版都不译', () => {
    const items = NAV_SECTIONS.flatMap(section => section.items)
    expect(items[0]).toEqual({ path: '/components/button', label: 'Button' })
    expect(items.at(-1)).toEqual({ path: '/components/progress', label: 'Progress' })
    for (const item of items) expect(item.label.length).toBeGreaterThan(0)
  })
})

describe('导航激活判定', () => {
  it('精确匹配或带尾斜杠才算激活', () => {
    expect(isNavActive('/components/button', '/components/button')).toBe(true)
    expect(isNavActive('/components/button/', '/components/button')).toBe(true)
    expect(isNavActive('/changelog', '/changelog')).toBe(true)
  })

  it('前缀、多余斜杠与其他路径都不算激活', () => {
    expect(isNavActive('/components/button/extra', '/components/button')).toBe(false)
    expect(isNavActive('/components/buttons', '/components/button')).toBe(false)
    expect(isNavActive('/components/button//', '/components/button')).toBe(false)
    expect(isNavActive('/', '/home')).toBe(false)
    expect(isNavActive('/home', '/components/button')).toBe(false)
  })
})
