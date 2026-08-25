import { afterEach, describe, expect, it } from 'vite-plus/test'

import '@/components/theme'
import type { WebUiTheme } from '@/components/theme'

import { findNearestTheme, findRootTheme } from '../theme-scope'

afterEach(() => document.body.replaceChildren())

const createTheme = (): WebUiTheme => {
  const el = document.createElement('web-ui-theme') as WebUiTheme
  el.setAttribute('appearance', 'light')
  return el
}

describe('shared/theme theme-scope', () => {
  it('findNearestTheme 沿父链命中最近的可承载浮层的主题宿主', async () => {
    const outer = createTheme()
    const inner = createTheme()
    // inner 作为 outer 的 light DOM 子级，形成嵌套作用域
    outer.append(inner)
    const insideInner = document.createElement('span')
    inner.append(insideInner)
    document.body.append(outer)
    await Promise.all([outer.updateComplete, inner.updateComplete])

    expect(inner.getOverlayRoot()).toBeTruthy()
    expect(findNearestTheme(insideInner)).toBe(inner)
    expect(findNearestTheme(inner)).toBe(inner)
  })

  it('findNearestTheme 穿透 shadow 边界（经 shadow host 继续向上）', async () => {
    const outer = createTheme()
    // shadow host 挂在 theme 的 light DOM 内，其 shadow 中的元素
    // 经 host 父链应解析到 outer
    const host = document.createElement('div')
    outer.append(host)
    const span = document.createElement('span')
    host.attachShadow({ mode: 'open' }).append(span)
    document.body.append(outer)
    await outer.updateComplete

    expect(findNearestTheme(span)).toBe(outer)
    expect(findNearestTheme(host)).toBe(outer)
  })

  it('未设置 appearance 的主题不参与作用域解析', async () => {
    const inactive = document.createElement('web-ui-theme') as WebUiTheme
    const span = document.createElement('span')
    inactive.append(span)
    document.body.append(inactive)
    await inactive.updateComplete

    expect(findNearestTheme(span)).toBeUndefined()
  })

  it('无主题时 findNearestTheme 与 findRootTheme 均返回 undefined', () => {
    const span = document.createElement('span')
    document.body.append(span)

    expect(findNearestTheme(span)).toBeUndefined()
    expect(findRootTheme()).toBeUndefined()
  })

  it('findRootTheme 返回文档级根主题（无父主题的第一个）', async () => {
    const root1 = createTheme()
    const nested = createTheme()
    root1.append(nested)
    const root2 = createTheme()
    document.body.append(root1, root2)
    await Promise.all([root1.updateComplete, root2.updateComplete])

    // nested 有父主题 root1，不是根；root1 与 root2 均为根，取文档序第一个
    expect(findRootTheme()).toBe(root1)
  })
})
