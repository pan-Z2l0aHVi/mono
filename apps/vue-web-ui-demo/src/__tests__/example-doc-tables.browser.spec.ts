import '@/assets/global.css'
import '@/generated/theme.css'

import { setViewport } from '@greypan/doc-demo-kit/testing.viewport'
import { mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vite-plus/test'

import ExampleDoc from '@/components/example-doc/index.vue'
import { ensureExampleDoc, loadDemoLocale } from '@/i18n/locale'

let wrapper: VueWrapper | null = null

afterEach(async () => {
  wrapper?.unmount()
  wrapper = null
  await setViewport(1280, 900)
})

describe('示例文档表格（浏览器）', () => {
  it('窄视口下表格按结构渲染，在自身列宽内换行而不撑宽页面', async () => {
    await setViewport(320, 700)
    await loadDemoLocale('en', false)
    // 示例文档按组件异步装载；先等到本次所需文档落定，避免用固定超时赌并行测试下的加载耗时。
    await ensureExampleDoc('progress')
    wrapper = mount(ExampleDoc, { props: { component: 'progress' }, attachTo: document.body })

    const table = wrapper.find('table')
    expect(table.exists()).toBe(true)
    const tableElement = table.element as HTMLTableElement
    const rows = tableElement.querySelectorAll('tbody > tr')
    expect(rows.length).toBeGreaterThan(1)

    const header = rows[0].querySelectorAll('th')
    expect(header.length).toBe(4)
    expect([...header].map(cell => cell.textContent?.trim())).toEqual(['Name', 'Description', 'Type', 'Default'])
    expect(rows[1].querySelectorAll('td').length).toBe(4)

    // 主题让长标识符在单元格内换行（`overflow-wrap: anywhere`），所以表格自身不会越过正文容器。
    const container = tableElement.parentElement as HTMLElement
    expect(tableElement.getBoundingClientRect().width).toBeLessThanOrEqual(container.clientWidth + 0.5)
    expect(document.documentElement.scrollWidth).toBe(document.documentElement.clientWidth)
  })
})
