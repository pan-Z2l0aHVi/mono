import { describe, expect, it } from 'vite-plus/test'

import type { ComponentContract } from '../component-source'
import { DocError } from '../errors'
import { joinApi } from '../join'
import type { ApiTable } from '../markdown'

/*
 * join 是「表格不与组件漂移」这件事的落点：markdown 只给中文描述，名字/类型/默认值来自组件源码。
 * 两个方向的多与少都必须失败，静默补位会让文档看起来对、其实是错的。
 * 这里喂手写的契约，为的是把「源码有、描述没有」和「描述有、源码没有」两条分别钉住。
 */

const CONTRACT: ComponentContract = {
  file: 'packages/web-ui/src/components/slider/index.ts',
  tag: 'web-ui-slider',
  props: [
    { attribute: 'value', property: 'value', type: 'number', default: '0' },
    // attribute 与 property 不同名：表格写的是 HTML 属性那一个，join 也必须按它对齐。
    { attribute: 'max-length', property: 'maxLength', type: 'number', default: '0' }
  ],
  events: [{ name: 'input', type: 'CustomEvent<number>' }],
  slots: [{ name: 'label' }]
}

function table(...rows: [string, string][]): ApiTable {
  return { rows: rows.map(([name, descriptionHtml]) => ({ name, descriptionHtml })) }
}

describe('joinApi', () => {
  it('props 的类型与默认值取自源码，名字按 attribute 对齐', () => {
    const rows = joinApi('props', CONTRACT, table(['value', '当前值。'], ['max-length', '最大长度。']), 'slider.md')
    expect(rows).toEqual([
      { name: 'value', type: 'number', default: '0', descriptionHtml: '当前值。' },
      { name: 'max-length', type: 'number', default: '0', descriptionHtml: '最大长度。' }
    ])
  })

  it('events 与 slots 没有默认值这一列', () => {
    expect(joinApi('events', CONTRACT, table(['input', '拖拽时触发。']), 'slider.md')).toEqual([
      { name: 'input', type: 'CustomEvent<number>', descriptionHtml: '拖拽时触发。' }
    ])
    expect(joinApi('slots', CONTRACT, table(['label', '标签插槽。']), 'slider.md')).toEqual([
      { name: 'label', descriptionHtml: '标签插槽。' }
    ])
  })

  it('源码里有、markdown 没描述时失败（表格会静默缺行）', () => {
    expect(() => joinApi('props', CONTRACT, table(['value', '当前值。']), 'slider.md')).toThrow(/存在于组件源码/)
  })

  it('markdown 写了源码里没有的字段时失败（表格在漂移）', () => {
    expect(() =>
      joinApi(
        'props',
        CONTRACT,
        table(['value', '当前值。'], ['max-length', '最大长度。'], ['step', '步进值。']),
        'slider.md'
      )
    ).toThrow(DocError)
    expect(() =>
      joinApi(
        'props',
        CONTRACT,
        table(['value', '当前值。'], ['max-length', '最大长度。'], ['step', '步进值。']),
        'slider.md'
      )
    ).toThrow(/表格在漂移/)
  })

  it('描述是空字符串也算没写', () => {
    expect(() => joinApi('events', CONTRACT, table(['input', '   ']), 'slider.md')).toThrow(/描述是空字符串/)
  })
})
