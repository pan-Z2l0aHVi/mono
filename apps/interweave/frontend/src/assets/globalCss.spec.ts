/// <reference types="node" />
/*
 * 这些是 app 侧自绘的、与「无障碍」直接相关的 CSS 契约，jsdom 不跑 Tailwind 也不做
 * 级联，所以这里读的是样式表源码、断言契约的**判据形状**而不是最终像素。三条都在钉一个
 * 具体且现实的回归；一旦有人改成 stock 写法，深色模式在亮色系统上会失效对比度、
 * 触摸最小可点尺寸会退到 36px、或 focus ring 会退回 UA 蓝环。
 *
 * 只保留「删掉/改写就真的会坏用户可感知的无障碍行为」的形状断言；具体尺寸、颜色与
 * 具体工具类选择器属于浏览器取证范围（见 docs/agents/browser-verification.md），不在这里钉。
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vite-plus/test'

const globalCss = readFileSync(fileURLToPath(new URL('./global.css', import.meta.url)), 'utf8')

// 注释里会解释为什么不跟 prefers-color-scheme，断言只看真正参与级联的声明。
const globalCssDeclarations = globalCss.replace(/\/\*[\s\S]*?\*\//g, '')

describe('global.css 的 dark 变体判据', () => {
  it('dark: 跟随 web-ui-theme 的 resolved-appearance，而不是操作系统偏好', () => {
    // 用户可在设置里显式选深色；OS 偏好仍是亮色时 stock 变体不会命中，app 会停在
    // 亮底 + 浅色字，对比度塌掉。判据必须挂在 resolved-appearance 上。
    expect(globalCss).toMatch(/@custom-variant\s+dark\s*\([^)]*web-ui-theme\[resolved-appearance=['"]dark['"]\][^)]*\)/)
    expect(globalCssDeclarations).not.toContain('prefers-color-scheme')
  })
})

describe('global.css 的触摸控件最小可点尺寸', () => {
  it('用 pointer: coarse 抬到至少 40px，且不退回宽度断点', () => {
    // 判据必须是 coarse pointer：改成宽度断点会让窄视口桌面窗口也命中，触控板用户平白
    // 拿到放大的控件。值落在 web-ui-theme 宿主上（外部作者样式压过 shadow 内 :host）。
    const coarseBlock = globalCssDeclarations.match(/@media\s*\(pointer:\s*coarse\)\s*\{[\s\S]*?\n\}/)
    expect(coarseBlock).toBeTruthy()
    expect(coarseBlock![0]).toMatch(/web-ui-theme\s*\{[^}]*--wui-control-size:\s*40px/)
    expect(coarseBlock![0]).not.toMatch(/max-width|min-width/)
  })
})

describe('global.css 的页面级 focus ring', () => {
  it('给原生可聚焦元素画 :focus-visible 的 outline，且整条选择器保持 0 特异性', () => {
    // 删掉整条会让原生元素（AppNav 按钮、添加对话框里的按钮）退回 UA 默认蓝环，与 web-ui
    // 组件的浅蓝 focus 环形成两套 focus 语言，键盘用户看到不一致的焦点指示。
    expect(globalCssDeclarations).toMatch(/:focus-visible\s*\{[^}]*outline:\s*var\(--wui-focus-ring-width/)

    /*
     * 特异性是这条规则里最容易悄悄坏掉的部分，所以按**完整选择器**断言，不按片段。
     * 两层 `:where()` 都必须在：外层锚在 #app（只让 app 自绘元素命中），内层包住元素
     * 选择器列表（把元素本身的权重清零）。任一层被拆掉：
     *   - 拆内层 → 元素选择器恢复 (0,1,0)，整条升到 (0,2,0)，压不住页面自己的
     *     `focus:outline-none`（同权重，靠顺序决胜），键盘焦点环被工具类吃掉；
     *   - 拆外层 → 规则泄漏到 app 之外。
     * 剩下的权重只有 :focus-visible 伪类 (0,1,0)，既能压过 UA 默认环，又让 app 的
     * focus 工具类 (0,2,0) 照旧能单点覆盖。
     *
     * 所以这里匹配从 `:where(#app)` 起、到 `:focus-visible` 止的整段选择器前缀：内层
     * `:where(` 一旦消失，元素列表就会直接暴露在 `:where(#app)` 之后，匹配随即失败。
     */
    const selectorPrefix = globalCssDeclarations.match(/:where\(#app\)\s*:where\([\s\S]*?\)\s*:focus-visible/)
    expect(selectorPrefix, 'focus ring 的两层 :where() 选择器前缀应完整').not.toBeNull()

    // 内层列表里确实列着原生可聚焦元素，而不是一个空壳 :where()。
    const elementList = selectorPrefix![0].slice(selectorPrefix![0].indexOf(':where(', ':where(#app)'.length))
    for (const selector of ['button', 'input', "[tabindex]:not([tabindex='-1'])"]) {
      expect(elementList, `focus ring 应覆盖 ${selector}`).toContain(selector)
    }
  })
})
