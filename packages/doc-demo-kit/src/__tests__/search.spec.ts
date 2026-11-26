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

  it('syncOpen(true) 等待 input.updateComplete 后聚焦，提前关闭则被 focusGeneration 取消 (#589)', async () => {
    let resolveUpdate!: () => void
    const input = document.createElement('input') as HTMLInputElement & { updateComplete?: Promise<unknown> }
    input.updateComplete = new Promise<void>(resolve => {
      resolveUpdate = resolve
    })
    document.body.append(input)
    const focusSpy = vi.spyOn(input, 'focus')

    const controller = createSearchController({ onOpenChange: () => {} })
    controller.syncElements({ input })
    controller.syncOpen(true)
    expect(focusSpy).not.toHaveBeenCalled()

    // 提前关闭后即便旧 updateComplete 完成，也不得抢焦点。
    controller.syncOpen(false)
    resolveUpdate()
    await Promise.resolve()
    await Promise.resolve()
    expect(focusSpy).not.toHaveBeenCalled()

    // 再次打开并在未关闭状态下完成 updateComplete，应正常聚焦。
    let resolveSecond!: () => void
    input.updateComplete = new Promise<void>(resolve => {
      resolveSecond = resolve
    })
    controller.syncOpen(true)
    resolveSecond()
    await Promise.resolve()
    await Promise.resolve()
    expect(focusSpy).toHaveBeenCalledTimes(1)

    controller.dispose()
  })

  it('面板收起后在输入框按 ArrowDown，等待 popover.updateComplete 与 rAF 后聚焦首条结果链接', async () => {
    const controls = document.createElement('div')
    const input = document.createElement('input')
    let resolvePopover!: () => void
    const popover = document.createElement('div') as HTMLDivElement & { updateComplete?: Promise<unknown> }
    popover.updateComplete = new Promise<void>(resolve => {
      resolvePopover = resolve
    })
    const results = document.createElement('div')
    const firstLink = document.createElement('a')
    firstLink.href = '/components/button'
    const secondLink = document.createElement('a')
    secondLink.href = '/components/input'
    results.append(firstLink, secondLink)
    controls.append(input, popover, results)
    document.body.append(controls)

    const controller = createSearchController({ onOpenChange: () => {} })
    controller.syncElements({ controls, input, popover, results })
    controller.syncOpen(true)
    controller.setQuery('button')

    // 先在结果链接上按 Escape 收起结果面板。
    const esc = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })
    Object.defineProperty(esc, 'target', { value: firstLink })
    controller.handleKeydown(esc)
    expect(controller.getSnapshot().panelOpen).toBe(false)

    // 在输入框按 ArrowDown 重开面板，需等待 rAF -> popover.updateComplete -> rAF 后聚焦首条链接。
    const arrowDown = new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true })
    Object.defineProperty(arrowDown, 'target', { value: input })
    controller.handleKeydown(arrowDown)
    expect(controller.getSnapshot().panelOpen).toBe(true)

    await new Promise<void>(resolve => requestAnimationFrame(() => resolve()))
    resolvePopover()
    await Promise.resolve()
    await new Promise<void>(resolve => requestAnimationFrame(() => resolve()))
    expect(document.activeElement).toBe(firstLink)

    controller.dispose()
  })

  it('面板展开时按键将 event、input 与当前链接列表精确透传给 navigateLinks', () => {
    const input = document.createElement('input')
    const results = document.createElement('div')
    const linkA = document.createElement('a')
    linkA.href = '/components/button'
    const linkB = document.createElement('a')
    linkB.href = '/components/input'
    results.append(linkA, linkB)
    document.body.append(input, results)

    const navigateLinks = vi.fn<
      (event: KeyboardEvent, el: HTMLElement, links: readonly HTMLAnchorElement[]) => boolean
    >(() => true)
    const controller = createSearchController({ onOpenChange: () => {}, navigateLinks })
    controller.syncElements({ input, results })
    controller.syncOpen(true)
    controller.setQuery('button')

    const keyEvent = new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true })
    Object.defineProperty(keyEvent, 'target', { value: input })
    controller.handleKeydown(keyEvent)

    expect(navigateLinks).toHaveBeenCalledTimes(1)
    expect(navigateLinks).toHaveBeenCalledWith(keyEvent, input, [linkA, linkB])

    controller.dispose()
  })

  it('expanding-field 动作把焦点移出 controls 时（如打开弹层），字段收起让位', () => {
    const controls = document.createElement('div')
    const input = document.createElement('input')
    const trigger = document.createElement('button')
    const overlayFocusTarget = document.createElement('button')
    controls.append(input, trigger)
    document.body.append(controls, overlayFocusTarget)

    const onOpenChange = vi.fn<(open: boolean) => void>()
    const controller = createSearchController({ onOpenChange })
    controller.syncElements({ controls, input })
    controller.syncOpen(true)

    trigger.dispatchEvent(new Event('pointerdown', { bubbles: true }))
    // 模拟点击 controls 内按钮弹出独立层，焦点落到 controls 之外的弹层元素。
    overlayFocusTarget.focus()
    trigger.dispatchEvent(new MouseEvent('click', { bubbles: true }))

    expect(onOpenChange).toHaveBeenCalledWith(false)
    expect(document.activeElement).toBe(overlayFocusTarget)

    controller.dispose()
  })

  it('StrictMode 元素引用切换解绑旧监听且 dispose() 幂等', () => {
    const controlsA = document.createElement('div')
    const inputA = document.createElement('input')
    controlsA.append(inputA)
    const controlsB = document.createElement('div')
    const inputB = document.createElement('input')
    controlsB.append(inputB)
    document.body.append(controlsA, controlsB)

    const onOpenChange = vi.fn<(open: boolean) => void>()
    const controller = createSearchController({ onOpenChange })
    controller.syncElements({ controls: controlsA, input: inputA })
    controller.syncOpen(true)

    // 切换到新元素后，旧元素上的 Escape 与 focusout 不得再触发关闭。
    controller.syncElements({ controls: controlsB, input: inputB })
    inputA.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }))
    inputA.dispatchEvent(new FocusEvent('focusout', { relatedTarget: null }))
    expect(onOpenChange).not.toHaveBeenCalled()

    // 新元素上的 Escape 生效。
    inputB.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }))
    expect(onOpenChange).toHaveBeenCalledTimes(1)
    expect(onOpenChange).toHaveBeenCalledWith(false)

    // 多次 dispose() 幂等，且卸载后新元素也不再响应。
    controller.dispose()
    controller.dispose()
    onOpenChange.mockClear()
    inputB.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }))
    expect(onOpenChange).not.toHaveBeenCalled()
  })
})
