// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vite-plus/test'

import { NAV_SECTIONS } from '../nav'
import { createSearchController, searchNavigation, SHELL_NAV_PAGES } from '../search'

const pages = [{ path: '/getting-started', zh: '快速开始', en: 'Getting Started' }]

afterEach(() => {
  document.body.replaceChildren()
})

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

describe('SearchController', () => {
  it('清空查询时保留 displayQuery，结果链接按 Escape 只收起面板并把焦点还给输入框', () => {
    const controls = document.createElement('div')
    const input = document.createElement('input')
    const results = document.createElement('div')
    const link = document.createElement('a')
    link.href = '/components/button'
    results.append(link)
    controls.append(input, results)
    document.body.append(controls)

    const onOpenChange = vi.fn<(open: boolean) => void>()
    const controller = createSearchController({ onOpenChange })
    controller.syncElements({ controls, input, results })
    controller.syncOpen(true)

    controller.setQuery('button')
    expect(controller.getSnapshot().hasQuery).toBe(true)
    expect(controller.getSnapshot().popoverOpen).toBe(true)
    expect(controller.getSnapshot().matches.some(item => item.path === '/components/button')).toBe(true)

    link.focus()
    const esc = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })
    Object.defineProperty(esc, 'target', { value: link })
    controller.handleKeydown(esc)
    expect(controller.getSnapshot().panelOpen).toBe(false)
    expect(controller.getSnapshot().popoverOpen).toBe(false)
    expect(document.activeElement).toBe(input)
    expect(onOpenChange).not.toHaveBeenCalled()

    controller.setQuery('')
    expect(controller.getSnapshot().hasQuery).toBe(false)
    expect(controller.getSnapshot().displayQuery).toBe('button')

    controller.dispose()
  })

  it('controls 内点击不关闭并在点击后归还焦点，点击外部或输入框 Escape 关闭', () => {
    const controls = document.createElement('div')
    const input = document.createElement('input')
    const siblingBtn = document.createElement('button')
    const outsideBtn = document.createElement('button')
    controls.append(input, siblingBtn)
    document.body.append(controls, outsideBtn)

    const onOpenChange = vi.fn<(open: boolean) => void>()
    const controller = createSearchController({ onOpenChange })
    controller.syncElements({ controls, input })
    controller.syncOpen(true)

    input.focus()
    siblingBtn.dispatchEvent(new Event('pointerdown', { bubbles: true }))
    input.dispatchEvent(new FocusEvent('focusout', { relatedTarget: siblingBtn }))
    expect(onOpenChange).not.toHaveBeenCalled()

    siblingBtn.focus()
    siblingBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(document.activeElement).toBe(input)
    expect(onOpenChange).not.toHaveBeenCalled()

    input.dispatchEvent(new FocusEvent('focusout', { relatedTarget: outsideBtn }))
    expect(onOpenChange).toHaveBeenCalledWith(false)

    onOpenChange.mockClear()
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }))
    expect(onOpenChange).toHaveBeenCalledWith(false)

    controller.dispose()
  })

  it('handleResultClick 仅在普通左键点击时关闭，修饰键不关闭', () => {
    const onOpenChange = vi.fn<(open: boolean) => void>()
    const controller = createSearchController({ onOpenChange })

    controller.handleResultClick(new MouseEvent('click', { button: 0, metaKey: true }))
    controller.handleResultClick(new MouseEvent('click', { button: 1 }))
    expect(onOpenChange).not.toHaveBeenCalled()

    controller.handleResultClick(new MouseEvent('click', { button: 0 }))
    expect(onOpenChange).toHaveBeenCalledWith(false)

    controller.dispose()
  })
})
