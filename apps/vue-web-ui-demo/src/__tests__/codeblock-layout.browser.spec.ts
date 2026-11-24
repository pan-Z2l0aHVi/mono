import '@/assets/global.css'
import '@/generated/theme.css'

import { setViewport } from '@greypan/doc-demo-kit/testing.viewport'
import { mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vite-plus/test'

import ExampleDoc from '@/components/example-doc/index.vue'
import { ensureExampleDoc, loadDemoLocale } from '@/i18n/locale'

/*
 * 代码卡的两条布局回归，读回的都是真实渲染结果。与 react demo 的同名 spec 判据一致。
 *
 * 一、示例类名进得了样式表。可运行示例的源码落在生成目录，而根 `.ignore` 为静音检索把那个目录整个
 * 排除，Tailwind 的自动源检测同样遵守它：只在示例源码里出现的工具类不会生成 CSS，示例布局静默散架
 * （进度条贴在一起、限宽失效），而任何按源码字符串做的断言都看不出来。这里渲染真实的 progress 示例，
 * 读它根节点上「行间距 20px、限宽已生效」的计算值。本文件**不能出现那些类名的字面量**——写进来
 * Tailwind 就会连这个 spec 一起扫，断言在没有登记生成目录时也恒绿。
 *
 * 二、展开态不横向溢出。折叠卡收进 web-ui-collapse 后，它内部的网格轨道按内容的 min-content 撑宽，
 * 而卡片外框按设计不裁剪：长行代码会把整张卡顶出页面。收起态靠 peek 裁剪看不见，只有展开后才暴露。
 * 这里渲染 autocomplete（全仓行最长的示例之一），展开第一张卡，断言代码块的盒子不越过卡片，同时长行
 * 仍保留自身宽度（靠滚动看，不靠换行）。
 */

const VIEWPORT_HEIGHT = 750

let wrapper: VueWrapper | null = null

afterEach(async () => {
  wrapper?.unmount()
  wrapper = null
  await setViewport(1280, VIEWPORT_HEIGHT)
})

async function mountExampleDoc(component: string) {
  await loadDemoLocale('en', false)
  // 示例文档按组件异步装载；先等到本次所需文档落定，避免用固定超时赌并行测试下的加载耗时。
  await ensureExampleDoc(component)
  wrapper = mount(ExampleDoc, { props: { component }, attachTo: document.body })
  await vi.waitFor(() => {
    const preview = document.querySelector(`[data-example-doc="${component}"] [data-codeblock-preview]`)
    if (!preview) throw new Error('example doc not mounted')
  })
}

function previewRoot(component: string): HTMLElement {
  const root = document.querySelector<HTMLElement>(`[data-example-doc="${component}"] [data-codeblock-preview] > *`)
  if (!root) throw new Error('preview root not found')
  return root
}

/**
 * 折叠区是否已落稳态。溢出只在落稳之后出现：过渡期间内层是 `overflow: hidden`，本身就是滚动容器、
 * min-content 贡献为 0；落稳后组件放开裁剪（`data-wui-settled`），内层网格轨道才按内容撑宽。
 */
function collapseSettled(card: HTMLElement): boolean {
  const track = card.querySelector('web-ui-collapse')?.shadowRoot?.querySelector('.wui-collapse-track')
  return track?.hasAttribute('data-wui-settled') ?? false
}

describe('代码卡布局（浏览器）', () => {
  it('progress 示例只写在生成源码里的间距与限宽类名在样式表里生效', async () => {
    await setViewport(1280, VIEWPORT_HEIGHT)
    await mountExampleDoc('progress')

    const style = getComputedStyle(previewRoot('progress'))
    // 5 档间距：本站 `--spacing` 为 4px。限宽类生效时 max-width 不再是 `none`。
    expect(style.rowGap).toBe('20px')
    expect(style.maxWidth).not.toBe('none')
    expect(parseFloat(style.maxWidth)).toBeGreaterThan(0)
  })

  it('折叠卡展开后代码块不越过卡片，长行仍保留自身宽度', async () => {
    await setViewport(440, VIEWPORT_HEIGHT)
    await mountExampleDoc('autocomplete')

    const card = document.querySelector<HTMLElement>('[data-example-doc="autocomplete"] article[data-codeblock]')
    const toggle = card?.querySelector<HTMLElement>('[data-toggle-code]')
    if (!card || !toggle) throw new Error('collapsible codeblock not found')
    toggle.click()

    // 溢出只在两件事之后出现：OverlayScrollbars 接管（接管前宿主自己是滚动容器，min-content 贡献为 0），
    // 以及折叠区落稳态。两件都按结果等，等到再量代码块盒子是否越过卡片。
    await vi.waitFor(() => {
      if (!collapseSettled(card)) throw new Error('collapse not settled')
      if (!card.querySelector('[data-overlayscrollbars-viewport]')) throw new Error('scrollbars not initialized')
      const pre = card.querySelector('pre')
      if (!pre) throw new Error('code not rendered')
      expect(pre.getBoundingClientRect().right).toBeLessThanOrEqual(card.getBoundingClientRect().right + 1)
    })

    const pre = card.querySelector('pre')!
    // 修复前 pre 自己被撑到 616px（越过卡片）；修复后盒子收在卡片内，但内容宽度不变、靠横向滚动看。
    // 不顺手断言页面级滚动宽度：这里裸挂载示例文档、没有页面壳，其余正文（表格等）的溢出不属于本判据。
    expect(pre.scrollWidth).toBeGreaterThan(pre.clientWidth)
  })
})
