import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vite-plus/test'

// 布局的移动端断点在 TS（切树与 resize 收尾逻辑）与 CSS（@media 隐藏 aside）各写一份；
// media query 无法读取 CSS 自定义属性，无法真正单源化，只能用守卫测试锁住两处字面量一致。
const here = import.meta.url
const packageRoot = fileURLToPath(new URL('../../../../', here))
const ts = fs.readFileSync(`${packageRoot}src/components/layout/index.ts`, 'utf8')
const css = fs.readFileSync(`${packageRoot}src/components/layout/style.css`, 'utf8')

const tsBreakpoint = ts.match(/window\.innerWidth\s*<=\s*(\d+)/)?.[1]
const cssBreakpoint = css.match(/@media\s*\(width\s*<=\s*(\d+)px\)/)?.[1]

describe('layout 移动端断点单一来源', () => {
  it('TS 切树阈值与 CSS media query 阈值一致', () => {
    expect(tsBreakpoint, 'index.ts 未匹配到 window.innerWidth <= N，守卫正则需更新').toBeTruthy()
    expect(cssBreakpoint, 'style.css 未匹配到 @media (width <= Npx)，守卫正则需更新').toBeTruthy()
    expect(tsBreakpoint).toBe(cssBreakpoint)
  })
})
