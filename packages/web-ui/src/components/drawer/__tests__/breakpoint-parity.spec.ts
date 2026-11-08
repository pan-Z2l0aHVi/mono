import fs from 'node:fs'

import { describe, expect, it } from 'vite-plus/test'

const root = `${process.cwd()}/`
const drawerTs = fs.readFileSync(`${root}src/shared/overlay/nested-drawer-layers.ts`, 'utf8')
const drawerCss = fs.readFileSync(`${root}src/components/drawer/style.css`, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

describe('drawer 嵌套层断点', () => {
  it('JS 与 CSS 的断点一致', () => {
    const query = drawerTs.match(/NESTED_PEEK_BASE_QUERY\s*=\s*'\(width\s*<=\s*(\d+)px\)/)?.[1]
    const media = [...drawerCss.matchAll(/@media\s*\(width\s*<=\s*(\d+)px\)/g)]
    expect(query).toBeTruthy()
    expect(media).toHaveLength(1)
    expect(media[0][1]).toBe(query)
  })
})
