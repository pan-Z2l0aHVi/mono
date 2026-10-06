import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vite-plus/test'

// Vite 会把 `new URL(relative, import.meta.url)` 字面量重写为 dev-server 资产 URL，
// jsdom 下 fileURLToPath 会因非 file scheme 抛错。先取出 file:// 形式的模块 URL
// 再解析包根目录，CSS 也改从磁盘读取（?raw 导入在 jsdom 项目下返回空串）。
const here = import.meta.url
const packageRoot = fileURLToPath(new URL('../../../../', here))
const style = fs.readFileSync(`${packageRoot}src/components/theme/style.css`, 'utf8')
const glass = fs.readFileSync(`${packageRoot}src/assets/glass.css`, 'utf8')

const tokenNames = [...style.matchAll(/(--wui-[a-z0-9-]+):/g)].map(match => match[1])
const uniqueTokenNames = [...new Set(tokenNames)]

// 明色档定义块：颜色 token 只定义在 [appearance] 三个选择器下，基础 :host 块里一枚都没有
const lightBlock = style.slice(style.indexOf(":host([appearance='light'])")).split('\n}')[0]
const lightValue = (name: string) => lightBlock.match(new RegExp(`${name}:\\s*([^;]+);`))?.[1].trim() ?? ''

describe('WebUiTheme token contract', () => {
  it('使用语义化文本、radius 和 focus token', () => {
    for (const name of [
      '--wui-color-text-secondary',
      '--wui-color-text-tertiary',
      '--wui-color-text-disabled',
      '--wui-color-focus-ring',
      '--wui-focus-ring-width',
      // 三个语义 radius token：theme-radius.browser.spec.ts 被 D2 删除后，
      // 「theme 定义这三个 token 且它们被文档化」由本文件的两个用例承接
      //（此处守主题层定义，下面「全局 token 完整同步到双语文档」守文档）。
      '--wui-radius-control',
      '--wui-radius-menu',
      '--wui-radius-overlay'
    ]) {
      expect(uniqueTokenNames).toContain(name)
    }
  })

  it('不保留已删除的旧 token', () => {
    for (const name of [
      '--wui-color-text-muted',
      '--wui-color-text-faint',
      '--wui-color-border-strong',
      '--wui-button-size',
      '--wui-layer-base',
      '--wui-color-surface-raised-mid',
      '--wui-color-surface-raised-deep',
      '--wui-shadow-pop',
      '--wui-layout-sidebar-bg',
      '--wui-focus-ring:',
      '--wui-duration-regular',
      '--wui-duration-menu-enter',
      '--wui-duration-menu-exit',
      '--wui-duration-overlay-enter',
      '--wui-duration-overlay-exit',
      // 只存在于未发布 changeset 里的过渡版本，已被两个 group 各自的 gap token 取代
      '--wui-selection-group-gap',
      // 玻璃环按「画在哪一层」改名后的三枚旧名：环底色 / 角部受光 / 角部背光
      '--wui-color-glass-border',
      '--wui-color-glass-corner',
      '--wui-color-glass-shade'
    ]) {
      expect(style).not.toContain(name)
    }
  })

  /*
   * 改名只被 theme 定义侧守卫是不够的：三枚 token 的唯一消费点是 assets/glass.css，
   * 而 assets/*.css 被 fallback 守卫显式排除。写错 var 名或改回旧名时浏览器会静默
   * 回落到字面量默认值——明色下 shade / sheen 的字面量恰好等于目标值，改错了在明色
   * 完全看不出来。这里把「新名被引用、旧名不再被引用」钉死。
   */
  it('glass.css 按新名引用环 token', () => {
    for (const name of ['--wui-color-glass-ring', '--wui-color-glass-ring-sheen', '--wui-color-glass-ring-shade']) {
      expect(glass, `${name} 应被 glass.css 引用`).toContain(`var(${name},`)
    }

    for (const name of ['--wui-color-glass-border', '--wui-color-glass-corner', '--wui-color-glass-shade']) {
      expect(glass, `${name} 不应再被 glass.css 引用`).not.toContain(`var(${name},`)
    }
  })

  /*
   * fallback 同样承重：颜色 token 只定义在 [appearance] 三个选择器下，theme 未设
   * appearance 或根本没有 theme 时，这一层取字面量。退回 transparent 会让环重新
   * 缺一段，且明色观感与整套玻璃的明色 fallback 体系不一致。期望值从明色定义块解析
   * 而非写死，否则「把明色调淡」这种正常编辑会让定义与 fallback 静默漂移。
   */
  it('环底色的 fallback 与明色真值一致', () => {
    const defined = lightValue('--wui-color-glass-ring')
    expect(defined, '明色档应定义环底色').not.toBe('')
    expect(glass).toContain(`var(--wui-color-glass-ring, ${defined})`)
  })

  it('全局 token 完整同步到双语文档', () => {
    const readme = fs.readFileSync(`${packageRoot}README.md`, 'utf8')
    const readmeCN = fs.readFileSync(`${packageRoot}README.CN.md`, 'utf8')

    for (const name of uniqueTokenNames) {
      expect(readme).toContain(name)
      expect(readmeCN).toContain(name)
    }
  })

  it('README 不残留已删除的旧 token', () => {
    const readme = fs.readFileSync(`${packageRoot}README.md`, 'utf8')
    const readmeCN = fs.readFileSync(`${packageRoot}README.CN.md`, 'utf8')

    for (const name of [
      '--wui-color-text-muted',
      '--wui-color-text-faint',
      '--wui-color-border-strong',
      '--wui-button-size',
      '--wui-layer-base',
      '--wui-color-surface-raised-mid',
      '--wui-color-surface-raised-deep',
      '--wui-shadow-pop',
      '--wui-layout-sidebar-bg',
      '--wui-focus-ring:',
      '--wui-duration-regular',
      '--wui-ease-out',
      '--wui-duration-menu-enter',
      '--wui-duration-menu-exit',
      '--wui-duration-overlay-enter',
      '--wui-duration-overlay-exit',
      // 只存在于未发布 changeset 里的过渡版本，已被两个 group 各自的 gap token 取代
      '--wui-selection-group-gap',
      // 玻璃环按「画在哪一层」改名后的三枚旧名
      '--wui-color-glass-border',
      '--wui-color-glass-corner',
      '--wui-color-glass-shade'
    ]) {
      expect(readme).not.toContain(name)
      expect(readmeCN).not.toContain(name)
    }
  })
})
