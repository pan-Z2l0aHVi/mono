import '@/assets/global.css'
import '@/generated/web-ui-examples.css'

import { mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vite-plus/test'

import { exampleDocs } from '@/generated/web-ui-examples'

import ExampleDoc from '../index.vue'

/*
 * 与 React 面同一组断言，量的是「同一份生成数据在 vue demo 里渲染出同样的结构」。
 * 两侧逐字节相同的生成数据由 `scripts/generate-web-ui-examples.test.mjs` 保证，
 * 这里补上「渲染真的用上了它」。
 *
 * `attachTo: document.body` 是必需的：@vue/test-utils 默认挂到脱离文档的元素上，
 * 那种节点 `getComputedStyle` 只会回空串，颜色断言会变成一句永远失败的噪声。
 */

const button = exampleDocs.find(doc => doc.component === 'button')
const collapse = exampleDocs.find(doc => doc.component === 'collapse')
if (!button || !collapse) throw new Error('生成数据里缺少 button / collapse')

const TAG_COLOR = 'rgb(192, 69, 94)'

type Doc = NonNullable<typeof button>

const wrappers: VueWrapper[] = []

function mountDoc(component: string) {
  const wrapper = mount(ExampleDoc, { props: { component }, attachTo: document.body })
  wrappers.push(wrapper)
  return wrapper.element as HTMLElement
}

function rowsOf(element: HTMLElement, key: string) {
  const section = element.querySelector(`[data-example-api="${key}"]`)
  if (!section) throw new Error(`API 小节 ${key} 没有渲染`)
  return [...section.querySelectorAll('tbody tr')].map(row =>
    [...row.querySelectorAll('td')].map(cell => cell.textContent)
  )
}

function apiSection(doc: Doc, key: string) {
  const section = doc.api.find(candidate => candidate.key === key)
  if (!section) throw new Error(`生成数据里缺少 ${doc.component} 的 ${key}`)
  return section
}

afterEach(() => {
  for (const wrapper of wrappers.splice(0)) wrapper.unmount()
})

describe('example-doc（Vue 面 / 真实浏览器）', () => {
  it('示例逐条来自 markdown，代码块带高亮 token 且颜色生效', () => {
    const element = mountDoc('button')

    expect(element.querySelector('[data-example-intro]')?.textContent).toBe(button.intro)

    const samples = [...element.querySelectorAll('[data-example-sample]')]
    expect(samples.map(node => node.getAttribute('data-example-sample'))).toEqual(
      button.samples.map(sample => sample.title)
    )

    const tag = element.querySelector('.hl-tag')
    expect(tag, '示例代码里必须有被着色的标签名').not.toBeNull()
    expect(getComputedStyle(tag as Element).color).toBe(TAG_COLOR)
    expect(element.querySelector('.hl-attr')).not.toBeNull()
  })

  it('渲染的是 vue 那一份代码，不是 react 的', () => {
    const element = mountDoc('button')
    const code = element.querySelector('[data-example-sample] code')
    expect(code?.innerHTML).toBe(button.samples[0]?.html.vue)
  })

  it('API 表逐行来自组件源码，不是手写的', () => {
    const element = mountDoc('collapse')

    const props = apiSection(collapse, 'props')
    const rows = rowsOf(element, 'props')
    expect(rows.map(cells => cells[0])).toEqual(props.rows.map(row => row.name))
    // `boolean` / `false` 只写在 packages/web-ui 的 @property 装饰器里。
    expect(rows.find(cells => cells[0] === 'open')?.slice(1, 3)).toEqual(['boolean', 'false'])

    expect(rowsOf(element, 'events').map(cells => cells[0])).toEqual(['open-change'])
    expect(rowsOf(element, 'slots').map(cells => cells[0])).toEqual(
      apiSection(collapse, 'slots').rows.map(row => row.name)
    )
  })

  it('button 没有 $events，就不该凭空多出 Events 小节', () => {
    expect(mountDoc('button').querySelector('[data-example-api="events"]')).toBeNull()
  })
})
