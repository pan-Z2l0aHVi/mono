import { describe, expect, it } from 'vite-plus/test'

import { NAV_SECTIONS } from '../nav'
import { searchNavigation, SHELL_NAV_PAGES } from '../search'

const pages = [{ path: '/getting-started', zh: '快速开始', en: 'Getting Started' }]

describe('导航搜索', () => {
  it('忽略大小写并匹配中英文页面及组件名称', () => {
    expect(searchNavigation('GETTING', pages).map(item => item.path)).toContain('/getting-started')
    expect(searchNavigation('快速开始', pages).map(item => item.path)).toContain('/getting-started')
    expect(searchNavigation('INPUT', pages).map(item => item.path)).toContain('/components/input')
    expect(searchNavigation('输入框', pages).map(item => item.path)).toContain('/components/input')
  })

  it('空白查询不返回结果，没有匹配时返回空数组', () => {
    expect(searchNavigation('  ', pages)).toEqual([])
    expect(searchNavigation('不存在的组件', pages)).toEqual([])
  })

  it('中文关键词来自 NAV_SECTIONS 的 zhName，与中文文案同源', () => {
    const button = searchNavigation('按钮').find(item => item.path === '/components/button')
    expect(button).toMatchObject({ path: '/components/button', zh: 'Button', keywords: '按钮' })
    // zhName 覆盖每个组件：改了 nav 漏了搜索关键词会在这里暴露。
    for (const section of NAV_SECTIONS) {
      for (const item of section.items) {
        expect(searchNavigation(item.zhName).map(result => result.path)).toContain(item.path)
      }
    }
  })

  it('pages 缺省用 kit 收敛的壳页全集', () => {
    expect(searchNavigation('组件总览').map(item => item.path)).toContain('/home')
    expect(searchNavigation('Changelog').map(item => item.path)).toContain('/changelog')
    expect(SHELL_NAV_PAGES.map(item => item.path)).toEqual(['/home', '/getting-started', '/changelog'])
  })
})
