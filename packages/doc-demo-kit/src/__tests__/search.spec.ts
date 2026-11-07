import { describe, expect, it } from 'vite-plus/test'

import { searchNavigation } from '../search'

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
})
