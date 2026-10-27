import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vite-plus/test'

import appScrollbarsOptions, { APP_SCROLLBARS_THEME } from '..'

// 从磁盘读源码：vitest 默认把 CSS 模块处理成空模块，`?raw` 也拿不到原文。
const style = readFileSync('src/style.css', 'utf8')
// 断言只看声明：注释里为了讲清楚会提到这些属性名，不能被当成声明命中。
const declarations = style.replace(/\/\*[\s\S]*?\*\//g, '')

// 静止档的权威值在 web-ui 的 theme 里。本包的回退字面量必须与它同值，否则无主题时
// 覆盖式 scrollbar 会停在旧颜色上；这条跨包不变量只能在这里守。
const webUiTheme = readFileSync('../web-ui/src/components/theme/style.css', 'utf8')

/** 取一条自定义属性的值。 */
function varValue(source: string, name: string): string {
  return new RegExp(`--${name}\\s*:\\s*([^;]+)`).exec(source)?.[1]?.trim() ?? ''
}

/** 取 web-ui theme 浅色分支里的一枚 token。 */
function webUiLightVar(name: string): string {
  const block = /:host\(\[appearance='light'\]\)[\s\S]*?\{([\s\S]*?)\}/.exec(webUiTheme)?.[1] ?? ''
  return varValue(block, name)
}

describe('应用级 scrollbar 配置', () => {
  it('入口自带样式导入，不需要单独引用 CSS', () => {
    // 样式随入口模块一起加载；拆出去会逼每个 app 记住第二行 import，漏了就静默退回无主题。
    expect(readFileSync('src/index.ts', 'utf8')).toContain("import './style.css'")
  })

  it('指向 macOS 覆盖式主题', () => {
    expect(appScrollbarsOptions.scrollbars?.theme).toBe(APP_SCROLLBARS_THEME)
    expect(APP_SCROLLBARS_THEME).toBe('os-theme-macos')
    expect(declarations).toContain(`.${APP_SCROLLBARS_THEME} {`)
  })

  it('保持「滚动时出现、停下自动隐去」的隐藏策略', () => {
    expect(appScrollbarsOptions.scrollbars?.autoHide).toBe('scroll')
    expect(appScrollbarsOptions.scrollbars?.autoHideDelay).toBe(2000)
  })

  it('track 点击以点击处为目标并即时落位', () => {
    const clickScroll = appScrollbarsOptions.scrollbars?.clickScroll
    // 库只在 `isFunction` 分支里读这个 option，对象形态会被静默忽略。
    expect(typeof clickScroll).toBe('function')
    if (typeof clickScroll !== 'function') throw new Error('clickScroll 必须是函数形态')
    expect(clickScroll()).toEqual({ clickScrollDistance: 0, clickScrollDuration: 0 })
  })

  it('静止档读 web-ui theme 的 token，本包不重复定义它', () => {
    // `--wui-scrollbar-handle` 的归属在 `@greypan/web-ui`：组件内部原生 scrollbar 与覆盖式
    // scrollbar 必须同源。这里一旦写死同名声明，两个包就会各说各话。
    expect(varValue(declarations, 'os-handle-bg')).toBe('var(--wui-scrollbar-handle, rgb(0 0 0 / 0.39))')
    expect(declarations).not.toMatch(/--wui-scrollbar-handle\s*:/)
  })

  it('hover / active 是本包私有的 token，静止档以外的状态才需要', () => {
    expect(varValue(declarations, 'os-handle-bg-hover')).toBe('var(--app-scrollbar-handle-hover, rgb(0 0 0 / 0.51))')
    expect(varValue(declarations, 'os-handle-bg-active')).toBe('var(--app-scrollbar-handle-active, rgb(0 0 0 / 0.63))')
    expect(declarations).toContain('--app-scrollbar-handle-hover: rgb(255 255 255 / 0.62)')
    expect(declarations).toContain('--app-scrollbar-handle-active: rgb(255 255 255 / 0.74)')
  })

  it('浅色档显式覆盖两档状态，不靠继承深色值', () => {
    // 少了浅色块，浅色主题嵌在深色页面里时会继续继承白色 hover / active。
    expect(declarations).toMatch(/web-ui-theme\[resolved-appearance='light'\]\s*\{/)
    expect(declarations).toContain('--app-scrollbar-handle-hover: rgb(0 0 0 / 0.51)')
    expect(declarations).toContain('--app-scrollbar-handle-active: rgb(0 0 0 / 0.63)')
  })

  it('无主题时的静止档回退值与 web-ui 的浅色 token 一致', () => {
    // 静止档 token 由 web-ui 定义、本包只读；两边都是手写字面量，改一边漏另一边就会漂移。
    const fallback = /var\(--wui-scrollbar-handle,\s*(.+)\)$/.exec(varValue(declarations, 'os-handle-bg'))?.[1]?.trim()
    expect(fallback).toBe(webUiLightVar('wui-scrollbar-handle'))
  })

  it('深色档同时覆盖主题子树与文档级 scrollbar', () => {
    // 文档级 scrollbar 挂在 <body> 下，位于 theme 元素之外，只有 `html:has()` 够得到。
    expect(declarations).toMatch(/html:has\(web-ui-theme\[resolved-appearance='dark'\]:not\(web-ui-theme \*\)\)/)
  })
})
