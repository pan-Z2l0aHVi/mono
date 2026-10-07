import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vite-plus/test'

import { WEB_UI_SCROLLBARS_THEME, webUiScrollbarsOptions } from '..'

// 从磁盘读源码，拿不到就走 `./style.css?inline`：vitest 默认把 CSS 模块处理成空模块，
// `?inline` / `?raw` 都返回空串（组件用 `?inline` 拿到空样式也照常通过，所以没人会发现）。
// 路径以包根为基准，与 vitest 的 root 一致。
const style = readFileSync('src/scrollbars/style.css', 'utf8')

/**
 * 取主题规则块里的一个自定义属性值。主题类与库初值都写在 .os-scrollbar 上、特异性相同，
 * 靠源顺序取胜，所以这里只认主题块自己声明了什么。行首锚定让深色分支里那几个同名选择器
 * 不会顶替浅色主块——它们不以类名开头。
 */
function themeVar(name: string): string {
  const block = new RegExp(`^\\.${WEB_UI_SCROLLBARS_THEME}\\s*\\{([^}]*)\\}`, 'm').exec(style)?.[1] ?? ''
  return new RegExp(`--${name}\\s*:\\s*([^;]+)`).exec(block)?.[1]?.trim() ?? ''
}

describe('scrollbars 公共面', () => {
  it('主题类名在 style.css 里有对应规则块', () => {
    // 类名由 options.scrollbars.theme 挂到滚动条元素上，CSS 里改了名字就会静默退回库初值：
    // 滚动条还在，只是变成无色无宽度的默认皮肤。这条把两边钉在一起。
    expect(themeVar('os-handle-border-radius')).not.toBe('')
  })

  it('主题自带的度量覆盖库初值里的零值', () => {
    // 库在 .os-scrollbar 上给的初值是 --os-size: 0 与 --os-handle-bg: none；漏掉任一项不会报错，
    // 只会让滚动条整条不可见。
    expect(Number.parseFloat(themeVar('os-size'))).toBeGreaterThan(0)
    expect(themeVar('os-handle-bg')).not.toBe('')
    expect(themeVar('os-handle-bg')).not.toBe('none')
    // 覆盖式滚动条没有轨道底色，这条是 macOS 观感的判据，回退到库初值就会画出轨道。
    expect(themeVar('os-track-bg')).toBe('none')
  })

  it('默认行为对齐产品要求', () => {
    const { scrollbars } = webUiScrollbarsOptions
    expect(scrollbars?.theme).toBe(WEB_UI_SCROLLBARS_THEME)
    expect(scrollbars?.autoHide).toBe('scroll')
    expect(scrollbars?.autoHideDelay).toBeGreaterThan(0)
  })

  it('track 点击以点击处为目标，而不是步进一个视口', () => {
    const clickScroll = webUiScrollbarsOptions.scrollbars?.clickScroll
    // 库只在 `isFunction` 分支里读这个选项，直接给对象会被静默忽略；`true` 则是「按一个视口
    // 步进」，与点击位置无关。距离为 0 才是「目标即点击处」——三种写法都长得像能用，这条钉住。
    expect(typeof clickScroll).toBe('function')
    const resolved = typeof clickScroll === 'function' ? clickScroll(false) : null
    expect(resolved).toMatchObject({ clickScrollDistance: 0 })
  })
})
