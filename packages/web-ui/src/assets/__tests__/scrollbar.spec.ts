import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vite-plus/test'

// 从磁盘读源码：vitest 默认把 CSS 模块处理成空模块，`?inline` / `?raw` 都返回空串，
// 组件用 `?inline` 拿到空样式也照常通过，所以只能读原文断言形状。路径以包根为基准，
// 与 vitest 的 root 一致。
const scrollbarCss = readFileSync('src/assets/scrollbar.css', 'utf8')
// 断言只看声明：注释里为了讲清楚会提到这些属性名，不能被当成声明命中。
const scrollbarDeclarations = scrollbarCss.replace(/\/\*[\s\S]*?\*\//g, '')

/** 取一份自定义属性的值。 */
function varValue(source: string, name: string): string {
  return new RegExp(`${name}\\s*:\\s*([^;]+)`).exec(source)?.[1]?.trim() ?? ''
}

describe('组件内部 scrollbar 主题', () => {
  it('走 var() 读主题 token，而不是写死颜色', () => {
    // `--wui-scrollbar-handle` 由 web-ui-theme 的外观分支提供；组件 shadow 里只有继承的
    // 自定义属性穿得过去，写成字面量会让组件内部 scrollbar 不再跟随外观切换。
    expect(varValue(scrollbarDeclarations, 'scrollbar-color')).toMatch(/^var\(--wui-scrollbar-handle/)
  })

  it('不声明 ::-webkit-scrollbar：它会让引擎改用占宽度的经典 scrollbar', () => {
    // 实测（macOS Chromium）：给容器一条 `::-webkit-scrollbar { width: 7px }` 后，
    // 同尺寸容器的 `offsetWidth - clientWidth` 从 0 变成 7，而组件内部 scrollbar 不能占布局宽度。
    // 运行期几何的守卫在 scrollbar.browser.spec.ts。
    expect(scrollbarDeclarations).not.toContain('::-webkit-scrollbar')
  })

  it('用 scrollbar-width: thin 收窄经典 scrollbar', () => {
    // 覆盖式平台不看它（仍零宽）；经典平台的 scrollbar 据此收窄，尽量靠近 macOS 的细 thumb。
    expect(varValue(scrollbarDeclarations, 'scrollbar-width')).toBe('thin')
  })
})
