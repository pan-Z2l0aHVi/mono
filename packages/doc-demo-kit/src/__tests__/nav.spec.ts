import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

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

  it('条目标签是组件名，两版都不译；zhName 是搜索关键词，不是渲染文案', () => {
    const items = NAV_SECTIONS.flatMap(section => section.items)
    expect(items[0]).toEqual({ path: '/components/button', label: 'Button', zhName: '按钮' })
    expect(items.at(-1)).toEqual({ path: '/components/progress', label: 'Progress', zhName: '进度' })
    for (const item of items) {
      expect(item.label.length).toBeGreaterThan(0)
      expect(item.zhName.length).toBeGreaterThan(0)
    }
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

describe('语料契约（单向）', () => {
  /*
   * 每个 nav 条目的 basename 必须在 `packages/web-ui/docs` 存在同英文名 `.md` 与 `.CN.md`：
   * nav 加了条目而语料缺文件，两端 demo 的 meta loader 会直接 reject。反向漂移（docs 新增
   * 组件忘加 nav）不设灯——页面存在但不可达/不可搜，是已接受的残留。
   */
  const docsDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../web-ui/docs')

  it.each(NAV_SECTIONS.flatMap(section => section.items).map(item => [item.label, item.path] as const))(
    '%s 在 web-ui/docs 有同名的 .md 与 .CN.md',
    (_label, navPath) => {
      // 文件名是 kebab-case 的路由 basename（back-top.md），不是显示标签（BackTop）。
      const basename = navPath.split('/').at(-1)!
      expect(existsSync(path.join(docsDir, `${basename}.md`)), `${basename}.md 缺失`).toBe(true)
      expect(existsSync(path.join(docsDir, `${basename}.CN.md`)), `${basename}.CN.md 缺失`).toBe(true)
    }
  )
})
