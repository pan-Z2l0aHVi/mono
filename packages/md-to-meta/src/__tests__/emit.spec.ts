import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { afterEach, describe, expect, it } from 'vite-plus/test'

import { checkArtifacts, writeArtifacts, writeIfChanged } from '../emit'
import type { GeneratedFile } from '../types'

/*
 * 落盘与「只判不改」共用同一份产出集合，也共用同一个「什么算差异」的谓词（内容是否变了）。
 * 这两条对外动作是宿主插件在 VITEST 上的分岔全部依据，所以它们各自的正例与负例都在这里钉住。
 */

const dirs: string[] = []

function scratch(): string {
  const dir = mkdtempSync(path.join(tmpdir(), 'md-to-meta-'))
  dirs.push(dir)
  return dir
}

afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true })
})

function artifacts(dir: string) {
  const codeblock = path.join(dir, 'codeblock')
  const files: GeneratedFile[] = [
    { path: path.join(dir, 'button.meta.js'), content: 'const meta = []\nexport default meta\n' },
    { path: path.join(dir, 'button.meta.d.ts'), content: 'declare const meta: unknown[]\nexport default meta\n' },
    { path: path.join(codeblock, 'abc123.tsx'), content: 'export default function Demo() {}\n' },
    { path: path.join(dir, 'theme.css'), content: '.mdm-markdown {}\n' }
  ]
  return { codeblock, files }
}

describe('writeIfChanged', () => {
  it('内容没变就不碰磁盘，变了才写', () => {
    const dir = scratch()
    const file = { path: path.join(dir, 'a.txt'), content: 'one' }
    expect(writeIfChanged(file)).toBe(true)
    expect(writeIfChanged(file)).toBe(false)
    expect(readFileSync(file.path, 'utf8')).toBe('one')
    expect(writeIfChanged({ ...file, content: 'two' })).toBe(true)
    expect(readFileSync(file.path, 'utf8')).toBe('two')
  })
})

describe('writeArtifacts', () => {
  it('写出产物、清理孤儿，但不碰宿主自己的文件', () => {
    const dir = scratch()
    const { codeblock, files } = artifacts(dir)
    mkdirSync(codeblock, { recursive: true })
    writeFileSync(path.join(codeblock, 'stale.tsx'), 'stale\n')
    writeFileSync(path.join(dir, 'stale.meta.js'), 'stale\n')
    writeFileSync(path.join(dir, 'host-module.ts'), 'export const host = true\n')

    writeArtifacts(files, dir)

    expect(existsSync(path.join(codeblock, 'stale.tsx'))).toBe(false)
    expect(existsSync(path.join(dir, 'stale.meta.js'))).toBe(false)
    expect(existsSync(path.join(dir, 'host-module.ts'))).toBe(true)
    expect(readFileSync(path.join(codeblock, 'abc123.tsx'), 'utf8')).toBe('export default function Demo() {}\n')
  })
})

describe('checkArtifacts', () => {
  it('产物与产出集合一致时通过', () => {
    const dir = scratch()
    const { files } = artifacts(dir)
    writeArtifacts(files, dir)
    expect(() => checkArtifacts(files, dir)).not.toThrow()
  })

  it('产物缺失时报出那个文件', () => {
    const { files } = artifacts(scratch())
    const output = path.dirname(files[0]?.path ?? '')
    expect(() => checkArtifacts(files, output)).toThrow(/生成物缺失.*button\.meta\.js/s)
  })

  it('磁盘上的字节与产出不一致时报出那个文件', () => {
    const dir = scratch()
    const { files } = artifacts(dir)
    writeArtifacts(files, dir)
    writeFileSync(path.join(dir, 'button.meta.js'), 'const meta = []\n')
    expect(() => checkArtifacts(files, dir)).toThrow(/生成物与 markdown 不一致.*button\.meta\.js/s)
  })

  it('上一轮遗留的孤儿先被报出来', () => {
    const dir = scratch()
    const { files } = artifacts(dir)
    writeArtifacts(files, dir)
    writeFileSync(path.join(dir, 'orphan.meta.js'), 'orphan\n')
    expect(() => checkArtifacts(files, dir)).toThrow(/生成物陈旧.*orphan\.meta\.js/s)
  })
})
