import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vite-plus/test'

// 移动端断点 640px 在包里共有四份字面量：drawer 的 TS（matchMedia 查询）与 CSS
// （嵌套堆叠基准 A 的媒体查询）各一份，layout 的 TS（matchMedia 查询，切树阈值）与 CSS
// （隐藏 aside）各一份。media query 无法读取 CSS 自定义属性，无法真正单源化，只能用守卫测试锁住。
//
// 为什么需要这个守卫（而不只是复用某一个组件的自检）：这里锁的是四份字面量**一起**相等，
// 任何只读自己的守卫都抓不到下面两种漂移：
//   a. drawer 自身两副本（TS 与 CSS）失配 —— 跨越断点时 JS 侧不重算，或基准不换；
//   b. drawer 与 layout 整体错开 —— 某个宽度区间里 layout 已是移动模式、drawer 却
//      仍用另一档基准，表现为该区间内堆叠偏移观感不对（纯视觉，非正确性破坏）。
// 变异注入已实测：把 JS 侧断点改成 700px、CSS 保持 640px，当前没有任何测试会红
// （browser spec 量的是"重算后 step/base ≈ ln2"，断点整体平移时该比值不变）。
// 这就是本文件存在的理由——把两份 TS 与两份 CSS 的数字一起比。
const here = import.meta.url
const packageRoot = fileURLToPath(new URL('../../../../', here))
const read = (relativePath: string) => fs.readFileSync(`${packageRoot}${relativePath}`, 'utf8')

const drawerTs = read('src/shared/overlay/nested-drawer-layers.ts')
const drawerCss = read('src/components/drawer/style.css')
const layoutTs = read('src/components/layout/index.ts')
const layoutCss = read('src/components/layout/style.css')

/*
 * 提取方式分两种，各自的局限如实写明——**不要把 CSS 侧也说成"锚定到声明"，它不是**：
 *
 * TS 侧：锚定到自身声明。nested-drawer-layers.ts 里 NESTED_PEEK_BASE_QUERY 上方三行就是
 * 一段说明性注释，注释里也写着 `@media (width <= 640px)`，且出现在真正赋值之前；宽松的
 * first-match 正则会先命中注释，将来谁改了注释里的示例数字，守卫就会校验到错误的那一个。
 * layout/index.ts 的断点同样锚定声明（`MOBILE_VIEWPORT_QUERY = '(width <= Npx)'`），但它
 * 上方的注释里写的是同形的 `@media (width <= 640px)`，所以同样必须锚定声明而不是 first-match。
 *
 * CSS 侧：先剥注释再取**唯一一个** width 媒体查询。CSS 注释同样能藏
 * `@media (width <= Npx)`——不剥注释时 first-match 会被注释劫持，注释里写 640、真实规则
 * 写 700，守卫照样全绿，而那正是它要抓的漂移（review 已实测复现）。断言"恰好一个"是
 * 为了将来新增第二个 width 媒体查询时也能绊住守卫，而不是静默取到第一个。
 *
 * 这是文本守卫的实际上限：它只保证这四处**字面量**相等。若有人把断点抽成常量、拼接
 * 字符串，或用 `var()` 之类手段让字面量不再出现，守卫就抓不到了——那时需要改守卫形态，
 * 而不是误以为它还在生效。抽不到值时下面的断言会报"守卫正则需更新"，而不是让
 * undefined === undefined 静默通过：守卫自己悄悄失效是这里最坏的失败模式。
 */
const stripComments = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, '')
const widthMediaBreakpoints = (css: string) =>
  [...stripComments(css).matchAll(/@media\s*\(width\s*<=\s*(\d+)px\)/g)].map(found => found[1])

const drawerQuery = drawerTs.match(/NESTED_PEEK_BASE_QUERY\s*=\s*'\(width\s*<=\s*(\d+)px\)/)?.[1]
const layoutQuery = layoutTs.match(/MOBILE_VIEWPORT_QUERY\s*=\s*'\(width\s*<=\s*(\d+)px\)/)?.[1]
const drawerMediaFound = widthMediaBreakpoints(drawerCss)
const layoutMediaFound = widthMediaBreakpoints(layoutCss)
const drawerMedia = drawerMediaFound[0]
const layoutMedia = layoutMediaFound[0]

describe('移动端断点 640px 单一来源', () => {
  it('四份字面量均已定位（任一抽不到值即需更新守卫正则）', () => {
    expect(drawerQuery, 'nested-drawer-layers.ts 未匹配到 NESTED_PEEK_BASE_QUERY 赋值，守卫正则需更新').toBeTruthy()
    expect(layoutQuery, 'layout/index.ts 未匹配到 MOBILE_VIEWPORT_QUERY 赋值，守卫正则需更新').toBeTruthy()
    // 恰好一个：0 个说明正则与源码脱节或规则被删；多个说明新增了 width 媒体查询、
    // 取第一个已不可靠。两种情况都该由人来更新守卫，而不是让比较静默通过。
    expect(
      drawerMediaFound,
      'drawer/style.css 剥注释后应恰好有一个 @media (width <= Npx)：0 个=正则需更新或规则被删，多个=新增了 width 媒体查询需更新守卫'
    ).toHaveLength(1)
    expect(
      layoutMediaFound,
      'layout/style.css 剥注释后应恰好有一个 @media (width <= Npx)：0 个=正则需更新或规则被删，多个=新增了 width 媒体查询需更新守卫'
    ).toHaveLength(1)
  })

  it('drawer 的 TS 与 CSS 断点一致（漂移 a：跨断点不重算或基准不换）', () => {
    expect(drawerQuery).toBe(drawerMedia)
  })

  it('drawer 与 layout 的断点一致（漂移 b：某区间内 layout 已移动而 drawer 未移动）', () => {
    expect(drawerMedia).toBe(layoutMedia)
    expect(drawerQuery).toBe(layoutQuery)
  })
})
