/// <reference types="node" />
/*
 * 走 node:fs 而不是 `?raw` import：test 侧的 CSS import 被 stub 成空串，两种查询都取不到内容。
 * app 的 tsconfig 把 types 收成空数组，这行引用按文件放行 @types/node——根 node_modules 里
 * 已经装着，web-ui 那边则是靠独立的 tsconfig.vitest.json 放行的，app 侧没有对应工程。
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vite-plus/test'

const globalCss = readFileSync(fileURLToPath(new URL('./global.css', import.meta.url)), 'utf8')

// 注释里会解释为什么不跟 prefers-color-scheme，断言只看真正参与级联的声明。
const globalCssDeclarations = globalCss.replace(/\/\*[\s\S]*?\*\//g, '')

/*
 * 这里只钉声明本身。`dark:` 展开后是否真的命中，取决于 web-ui 在 host 上写的
 * resolved-appearance 和浏览器的匹配结果，jsdom 既不实现媒体查询也不跑 Tailwind
 * 变体（见 ResourceList.spec.ts 关于 focus ring 的说明），所以视觉行为由真实浏览器
 * 取证负责，这里防的是有人把这条 @custom-variant 删掉或改回 prefers-color-scheme。
 */
describe('global.css 的 dark 变体判据', () => {
  it('重定义 dark 变体指向 web-ui-theme 的 resolved-appearance', () => {
    expect(globalCss).toMatch(/@custom-variant\s+dark\s*\([^)]*web-ui-theme\[resolved-appearance=['"]dark['"]\][^)]*\)/)
  })

  it('判据不退回 prefers-color-scheme，否则用户在亮色系统上选深色会失效', () => {
    expect(globalCssDeclarations).not.toContain('prefers-color-scheme')
  })

  it('判据包在 :where() 里，不抬高工具类的特异性', () => {
    expect(globalCssDeclarations).toMatch(/@custom-variant\s+dark\s*\(&:where\(web-ui-theme\[resolved-appearance=/)
  })
})

/*
 * 触摸设备的控件高度覆写。jsdom 不实现媒体查询也不跑 shadow 级联，所以「40px 在真机上
 * 生效」由浏览器取证负责；这里钉的是这条声明的**形状**——它有三处一改就静默失效：
 *
 * ① 选择器必须是 `web-ui-theme`。36px 由 theme 的 shadow 内 `:host` 提供，写在 `:root` 上
 *    与它特异性相同，胜负取决于样式表顺序。
 * ② 判据必须是 `pointer: coarse`。改成宽度断点会让窄视口的桌面窗口也命中，触控板用户
 *    平白拿到 40px 的控件。
 * ③ 值必须落在 `--wui-control-size` 上。菜单项行高写死在 dropdown-item/style.css，
 *    不吃这个 token——所以这一条只该抬控件，不该把菜单行一起撑高。
 */
describe('global.css 的触摸控件尺寸', () => {
  it('在 web-ui-theme 上用 pointer: coarse 抬到 40px', () => {
    expect(globalCssDeclarations).toMatch(
      /@media\s*\(pointer:\s*coarse\)\s*\{[^}]*web-ui-theme\s*\{[^}]*--wui-control-size:\s*40px/
    )
  })

  it('不退回宽度断点，触控板与窄视口桌面窗口不该命中', () => {
    const coarseBlock = globalCssDeclarations.match(/@media\s*\(pointer:\s*coarse\)\s*\{[\s\S]*?\n\}/)
    expect(coarseBlock).toBeTruthy()
    expect(coarseBlock![0]).not.toMatch(/max-width|min-width/)
  })

  it('不写在 :root 上——那与 theme 的 shadow :host 同特异性，胜负取决于样式表顺序', () => {
    const coarseBlock = globalCssDeclarations.match(/@media\s*\(pointer:\s*coarse\)\s*\{[\s\S]*?\n\}/)
    expect(coarseBlock![0]).toContain('web-ui-theme {')
    expect(coarseBlock![0]).not.toMatch(/:root/)
  })
})
