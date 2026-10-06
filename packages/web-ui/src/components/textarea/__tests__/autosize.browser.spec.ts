import { afterEach, describe, expect, it } from 'vite-plus/test'

import '..'
import '@/components/theme'

import type { WebUiTextarea } from '..'

afterEach(() => document.body.replaceChildren())

function createTextarea(attrs: Record<string, string> = {}): WebUiTextarea {
  const el = document.createElement('web-ui-textarea')
  el.setAttribute('full', '')
  for (const [name, value] of Object.entries(attrs)) el.setAttribute(name, value)
  document.body.append(el)
  return el
}

function nativeTextarea(el: WebUiTextarea): HTMLTextAreaElement {
  return el.shadowRoot!.querySelector('textarea')!
}

// 高度是内联 px，跟帧走才稳；autosize 自身同步，但字体与布局要等一帧落定。
async function nextFrame() {
  await new Promise(resolve => requestAnimationFrame(resolve))
}

const heightOf = (el: WebUiTextarea) => Math.round(el.getBoundingClientRect().height)

// 宿主比原生 textarea 多一圈 wrapper padding，行高要从原生控件上量，
// 直接拿宿主高度除以行数会把 padding 算进行内。
const lineHeightOf = (el: WebUiTextarea) => parseFloat(getComputedStyle(nativeTextarea(el)).lineHeight)

describe('WebUiTextarea autosize 高度跟随值变化', () => {
  it('rows 作为下限：短内容不低于 rows 行，长内容撑高', async () => {
    const el = createTextarea({ rows: '2', autosize: '' })
    await el.updateComplete
    await nextFrame()

    // 空内容也应占满 rows 行：_autosize 走 height:auto 后读 scrollHeight，
    // 换成 height:0px（editable-text 的做法）会塌成一行，下限就没了。
    const lineHeight = lineHeightOf(el)
    // 量原生控件而不是宿主：宿主带 15px wrapper padding，拿它比会多出容差，
    // padding 一涨这条断言就悄悄失效。
    const emptyHeight = heightOf(el)
    expect(nativeTextarea(el).getBoundingClientRect().height).toBeGreaterThanOrEqual(lineHeight * 2)

    el.value = '内容'.repeat(120)
    await el.updateComplete
    await nextFrame()
    expect(heightOf(el)).toBeGreaterThan(emptyHeight)
  })

  it('外部改 rows 后高度跟着重算', async () => {
    const el = createTextarea({ rows: '2', autosize: '' })
    await el.updateComplete
    await nextFrame()
    const before = heightOf(el)

    // 内联 px 高度会盖掉 rows 的自然高度，ResizeObserver 又看不到盒子尺寸变化，
    // 所以只能由 updated() 自己重算。
    el.rows = 6
    await el.updateComplete
    await nextFrame()
    expect(heightOf(el)).toBeGreaterThan(before)
  })

  it('外部改写 value 后高度跟着重算，长内容撑高、短内容回落', async () => {
    const el = createTextarea({ rows: '2', autosize: '' })
    await el.updateComplete
    await nextFrame()

    const shortHeight = heightOf(el)

    el.value = '内容'.repeat(120)
    await el.updateComplete
    await nextFrame()
    const tallHeight = heightOf(el)

    el.value = '短'
    await el.updateComplete
    await nextFrame()

    // 回落而非停在长内容高度：render() 的 .value 绑定先把新值写进 DOM，
    // ResizeObserver 又看不到"盒子尺寸没变"的换值，这里必须由组件自己重算。
    expect(tallHeight).toBeGreaterThan(shortHeight)
    expect(heightOf(el)).toBe(shortHeight)
    expect(nativeTextarea(el).value).toBe('短')
  })

  it('属性改写 value 同样触发重算', async () => {
    const el = createTextarea({ rows: '2', autosize: '' })
    await el.updateComplete
    await nextFrame()
    const shortHeight = heightOf(el)

    // attributeChangedCallback → value setter → _value，与 Vue 的 :value 绑定同源。
    el.setAttribute('value', '内容'.repeat(120))
    await el.updateComplete
    await nextFrame()
    expect(heightOf(el)).toBeGreaterThan(shortHeight)
  })

  it('autosize 时关掉原生 resize grip，高度只由 autosize 决定', async () => {
    const el = createTextarea({ autosize: '' })
    await el.updateComplete
    await nextFrame()

    // 原生 resize grip 与 autosize 是两套高度来源：用户拖高后，下一次内容变化
    // 又会被 autosize 拉回去，拖拽变成假动作。
    expect(getComputedStyle(nativeTextarea(el)).resize).toBe('none')
  })

  it('未开 autosize 时保留原生 resize 行为', async () => {
    const el = createTextarea()
    await el.updateComplete

    expect(getComputedStyle(nativeTextarea(el)).resize).toBe('vertical')
  })
})
