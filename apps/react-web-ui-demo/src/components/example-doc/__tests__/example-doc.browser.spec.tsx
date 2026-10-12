import '@/assets/global.css'
import '@/generated/web-ui-examples.css'

import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vite-plus/test'

import { exampleDocs } from '@/generated/web-ui-examples'

import ExampleDoc from '..'

/*
 * 这一档量的是「markdown 生成的数据真的变成了页面」：示例条数与标题取自生成数据、
 * 代码块里真的有被着色的 token 且颜色在真实浏览器里生效、API 表逐行对得上组件源码。
 * jsdom 层能证明结构，但证明不了 `.hl-*` 的颜色有没有真的落到 DOM 上——那需要真实引擎。
 */

const button = exampleDocs.find(doc => doc.component === 'button')
const collapse = exampleDocs.find(doc => doc.component === 'collapse')
if (!button || !collapse) throw new Error('生成数据里缺少 button / collapse')

// `.hl-tag` 的定义在生成样式里（`#c0455e`），这里钉住它渲染后的实际颜色。
const TAG_COLOR = 'rgb(192, 69, 94)'

function sectionRows(container: HTMLElement, key: string) {
  const section = container.querySelector(`[data-example-api="${key}"]`)
  if (!section) throw new Error(`API 小节 ${key} 没有渲染`)
  return [...section.querySelectorAll('tbody tr')].map(row =>
    [...row.querySelectorAll('td')].map(cell => cell.textContent)
  )
}

function apiSection(doc: NonNullable<typeof button>, key: string) {
  const section = doc.api.find(candidate => candidate.key === key)
  if (!section) throw new Error(`生成数据里缺少 ${doc.component} 的 ${key}`)
  return section
}

describe('example-doc（React 面 / 真实浏览器）', () => {
  afterEach(cleanup)

  it('示例逐条来自 markdown，代码块带高亮 token 且颜色生效', () => {
    const { container } = render(<ExampleDoc component="button" />)

    expect(container.querySelector('[data-example-intro]')?.textContent).toBe(button.intro)

    const samples = [...container.querySelectorAll('[data-example-sample]')]
    expect(samples.map(element => element.getAttribute('data-example-sample'))).toEqual(
      button.samples.map(sample => sample.title)
    )

    const tag = container.querySelector('.hl-tag')
    expect(tag, '示例代码里必须有被着色的标签名').not.toBeNull()
    expect(getComputedStyle(tag as Element).color).toBe(TAG_COLOR)
    expect(container.querySelector('.hl-attr')).not.toBeNull()
  })

  it('渲染的是 react 那一份代码，不是 vue 的', () => {
    const { container } = render(<ExampleDoc component="button" />)
    const code = container.querySelector('[data-example-sample] code')
    expect(code?.innerHTML).toBe(button.samples[0]?.html.react)
  })

  it('props 表逐行来自组件源码，不是手写的', () => {
    const { container } = render(<ExampleDoc component="collapse" />)
    const props = apiSection(collapse, 'props')
    const rows = sectionRows(container, 'props')

    expect(rows.map(cells => cells[0])).toEqual(props.rows.map(row => row.name))
    // `boolean` / `false` 只写在 packages/web-ui 的 @property 装饰器里。
    expect(rows.find(cells => cells[0] === 'open')?.slice(1)).toEqual(['boolean', 'false', expect.any(String)])
  })

  it('events 与 slots 表也来自源码契约', () => {
    const { container } = render(<ExampleDoc component="collapse" />)

    expect(sectionRows(container, 'events').map(cells => cells[0])).toEqual(['open-change'])
    expect(sectionRows(container, 'slots').map(cells => cells[0])).toEqual(
      apiSection(collapse, 'slots').rows.map(row => row.name)
    )
    // button 没有 $events，就不该凭空多出 Events 小节。
    const { container: buttonContainer } = render(<ExampleDoc component="button" />)
    expect(buttonContainer.querySelector('[data-example-api="events"]')).toBeNull()
  })
})
