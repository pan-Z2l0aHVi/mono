// @vitest-environment jsdom
import type { MetaNode } from '@greypan/md-to-meta'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'

import { createCodeblockController, createCopyFeedback } from '../codeblock'
import type { Flavor } from '../flavor'
import type { CodeblockVariant } from '../install'

describe('复制反馈', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.stubGlobal('navigator', {
      clipboard: { writeText: vi.fn<(text: string) => Promise<void>>().mockResolvedValue() }
    })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('复制成功立即反馈，重复复制重新触发反馈', async () => {
    const feedback = createCopyFeedback({ readText: () => 'code' })
    try {
      await feedback.copy()
      expect(feedback.getSnapshot()).toMatchObject({ status: 'copied', run: 1 })
      vi.advanceTimersByTime(299)
      await feedback.copy()
      expect(feedback.getSnapshot()).toMatchObject({ status: 'copied', run: 2 })
      vi.advanceTimersByTime(1301)
      expect(feedback.getSnapshot().status).toBe('copied')
      vi.advanceTimersByTime(299)
      expect(feedback.getSnapshot().status).toBe('idle')
    } finally {
      feedback.dispose()
    }
  })

  it('释放后不会再发布定时的状态更新', async () => {
    const feedback = createCopyFeedback({ readText: () => 'code' })
    const listener = vi.fn<() => void>()
    feedback.subscribe(listener)
    await feedback.copy()
    expect(listener).toHaveBeenCalledTimes(1)
    feedback.dispose()
    vi.advanceTimersByTime(1600)
    expect(listener).toHaveBeenCalledTimes(1)
  })
})

/*
 * 代码卡状态机（flavor / 折叠 / 复制反馈）的判据在 kit：两个 demo 的 codeblock 组件只剩
 * 渲染接线，浏览器套件只留视觉断言。这里的用例对应两端曾各自内联的行为。
 */
describe('代码卡状态机', () => {
  // 生成期的高亮 HTML 每行一个 `<span class="line">`，collapsible 按它数行：8 行挂折叠。
  const LONG = Array.from({ length: 8 }, (_, index) => `<span class="line">line-${index}</span>`).join('\n')
  const tsxNode = { label: 'codeblock', lang: 'tsx', content: LONG } as MetaNode
  const vueNode = { label: 'codeblock', lang: 'vue', content: 'const a = 1' } as MetaNode

  function createPanel() {
    const panel = document.createElement('div')
    // 复制取的是面板里 `<pre>` 的围栏原文；给一份非空正文让 copy 走成功分支。
    panel.innerHTML = '<pre>code</pre>'
    panel.scrollTop = 120
    panel.scrollLeft = 40
    return panel
  }

  function setup(nodes: readonly MetaNode[], options: { nativeFlavor?: Flavor; variants?: CodeblockVariant[] } = {}) {
    const panel = createPanel()
    const controller = createCodeblockController({
      nodes,
      variants: options.variants,
      nativeFlavor: options.nativeFlavor ?? 'react',
      getPanel: () => panel
    })
    return { controller, panel }
  }

  it('激活节点走回退链：variants 命中 → flavor 对应围栏 → 首节点；空输入为 null', () => {
    const variantNode = { label: 'codeblock', lang: 'bash', content: 'npm install' } as MetaNode
    const variants = [{ value: 'npm', label: 'npm', node: variantNode }]
    const { controller } = setup([tsxNode, vueNode], { variants })
    expect(controller.getSnapshot().active).toBe(variantNode)
    expect(controller.getSnapshot().flavor).toBe('npm')

    const noVariants = setup([tsxNode, vueNode])
    expect(noVariants.controller.getSnapshot().active).toBe(tsxNode)
    noVariants.controller.selectFlavor('vue')
    expect(noVariants.controller.getSnapshot().active).toBe(vueNode)
    // 未知 flavor 被忽略，active 保持在命中围栏的那份。
    noVariants.controller.selectFlavor('bash')
    expect(noVariants.controller.getSnapshot().active).toBe(vueNode)

    // flavor 没有对应围栏（native 是 react、只有 vue 一份）时落到首节点。
    expect(setup([vueNode]).controller.getSnapshot().active).toBe(vueNode)
    expect(setup([]).controller.getSnapshot().active).toBeNull()
  })

  it('未知或相同的 flavor 不改状态也不复位滚动', () => {
    const { controller, panel } = setup([tsxNode, vueNode])
    const listener = vi.fn<() => void>()
    controller.subscribe(listener)

    controller.selectFlavor('bash')
    controller.selectFlavor('react')
    expect(panel.scrollTop).toBe(120)
    expect(listener).not.toHaveBeenCalled()
    expect(controller.getSnapshot().flavor).toBe('react')
  })

  it('flavor 切换与收起折叠都复位滚动，展开不复位', () => {
    const { controller, panel } = setup([tsxNode, vueNode])

    controller.selectFlavor('vue')
    expect(panel.scrollTop).toBe(0)
    expect(panel.scrollLeft).toBe(0)

    panel.scrollTop = 120
    controller.toggleExpanded()
    expect(controller.getSnapshot().expanded).toBe(true)
    expect(panel.scrollTop).toBe(120)

    controller.toggleExpanded()
    expect(controller.getSnapshot().expanded).toBe(false)
    expect(panel.scrollTop).toBe(0)
  })

  it('collapsible 按激活节点的行数派生', () => {
    const { controller } = setup([tsxNode, vueNode])
    expect(controller.getSnapshot().collapsible).toBe(true)
    controller.selectFlavor('vue')
    expect(controller.getSnapshot().collapsible).toBe(false)
  })

  it('预览只跑本站框架的 load 围栏，与选中源码无关', () => {
    const loadableVue = { ...vueNode, load: () => Promise.resolve({ default: null }) } as unknown as MetaNode
    const { controller } = setup([tsxNode, loadableVue])
    expect(controller.getSnapshot().preview).toBeNull()

    const loadableTsx = { ...tsxNode, load: () => Promise.resolve({ default: null }) } as unknown as MetaNode
    const withPreview = setup([loadableTsx, loadableVue])
    expect(withPreview.controller.getSnapshot().preview).toBe(loadableTsx)
    withPreview.controller.selectFlavor('vue')
    expect(withPreview.controller.getSnapshot().preview).toBe(loadableTsx)
  })

  it('setInputs 不发布；新输入没有当前 flavor 时退回初始值', () => {
    const { controller } = setup([tsxNode, vueNode])
    const listener = vi.fn<() => void>()
    controller.subscribe(listener)
    controller.selectFlavor('vue')
    expect(listener).toHaveBeenCalledTimes(1)

    controller.setInputs({ nodes: [tsxNode] })
    expect(listener).toHaveBeenCalledTimes(1)
    // flavor 是已知框架就保留；激活节点退回回退链（首节点）。
    expect(controller.getSnapshot()).toMatchObject({ flavor: 'vue', active: tsxNode })

    const variants = [{ value: 'pnpm', label: 'pnpm', node: tsxNode }]
    controller.setInputs({ nodes: [tsxNode], variants })
    // variants 里没有 'vue' 了：退回初始值。
    expect(controller.getSnapshot()).toMatchObject({ flavor: 'pnpm' })
  })

  it('派生值未变时 setInputs 复用上一份快照引用（React useSyncExternalStore 的稳定性契约）', () => {
    const { controller } = setup([tsxNode, vueNode])
    const before = controller.getSnapshot()

    // 宿主每次重渲染都传新数组，不能比数组引用：内容相同的全新输入不得产出新快照，
    // 否则渲染期 setInputs 让 getSnapshot 每次都换引用，React 判定 store 变化，
    // 立即再渲染再进 setInputs，陷入重渲染循环。
    controller.setInputs({ nodes: [{ ...tsxNode }, { ...vueNode }], variants: undefined })
    expect(controller.getSnapshot()).toBe(before)

    // 激活内容真变了才换引用。
    const changed = { label: 'codeblock', lang: 'tsx', content: 'const b = 2' } as MetaNode
    controller.setInputs({ nodes: [changed, vueNode] })
    expect(controller.getSnapshot()).not.toBe(before)
    expect(controller.getSnapshot().active?.content).toBe('const b = 2')
  })

  it('copy 接线：发起复制后快照带反馈状态', async () => {
    vi.stubGlobal('navigator', {
      clipboard: { writeText: vi.fn<(text: string) => Promise<void>>().mockResolvedValue() }
    })
    try {
      const { controller } = setup([tsxNode])
      await controller.copy()
      expect(controller.getSnapshot().copy).toMatchObject({ status: 'copied', run: 1 })
    } finally {
      vi.unstubAllGlobals()
    }
  })
})
