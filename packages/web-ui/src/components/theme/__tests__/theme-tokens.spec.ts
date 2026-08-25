import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vite-plus/test'

// Vite 会把 `new URL(relative, import.meta.url)` 字面量重写为 dev-server 资产 URL，
// jsdom 下 fileURLToPath 会因非 file scheme 抛错。先取出 file:// 形式的模块 URL
// 再解析包根目录，CSS 也改从磁盘读取（?raw 导入在 jsdom 项目下返回空串）。
const here = import.meta.url
const packageRoot = fileURLToPath(new URL('../../../../', here))
const style = fs.readFileSync(`${packageRoot}src/components/theme/style.css`, 'utf8')

const tokenNames = [...style.matchAll(/(--wui-[a-z0-9-]+):/g)].map(match => match[1])
const uniqueTokenNames = [...new Set(tokenNames)]

describe('WebUiTheme token contract', () => {
  it('使用语义化文本和 focus token', () => {
    for (const name of [
      '--wui-color-text-secondary',
      '--wui-color-text-tertiary',
      '--wui-color-text-disabled',
      '--wui-color-focus-ring',
      '--wui-focus-ring-width'
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
      '--wui-color-surface-raised-mid',
      '--wui-color-surface-raised-deep',
      '--wui-shadow-pop',
      '--wui-focus-ring:',
      '--wui-duration-regular'
    ]) {
      expect(style).not.toContain(name)
    }
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
      '--wui-color-surface-raised-mid',
      '--wui-color-surface-raised-deep',
      '--wui-shadow-pop',
      '--wui-focus-ring:',
      '--wui-duration-regular',
      '--wui-ease-out'
    ]) {
      expect(readme).not.toContain(name)
      expect(readmeCN).not.toContain(name)
    }
  })
})
