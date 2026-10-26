import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { rmSync } from 'node:fs'
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
  const dir = mkdtempSync(path.join(tmpdir(), 'md-to-comp-'))
  dirs.push(dir)
  return dir
}

afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true })
})

function artifacts(dir: string) {
  const demos = path.join(dir, 'demos')
  const files: GeneratedFile[] = [
    { path: path.join(dir, 'examples.ts'), content: 'export const exampleDocs = []\n' },
    { path: path.join(demos, 'slider--basic.tsx'), content: 'export default function Demo() {}\n' }
  ]
  return { demos, files }
}

describe('writeIfChanged', () => {
  it('内容没变就不碰磁盘，变了才写', () => {
    const dir = scratch()
    const file = { path: path.join(dir, 'a.txt'), content: 'one' }
    expect(writeIfChanged(file)).toBe(true)
    // 内容相同：返回 false，磁盘上的字节不动。
    expect(writeIfChanged(file)).toBe(false)
    expect(readFileSync(file.path, 'utf8')).toBe('one')
    expect(writeIfChanged({ ...file, content: 'two' })).toBe(true)
    expect(readFileSync(file.path, 'utf8')).toBe('two')
  })
})

describe('writeArtifacts', () => {
  it('写出产物并把不在本轮产出集合里的组件示例清掉', () => {
    const dir = scratch()
    const { demos, files } = artifacts(dir)
    // 上一轮遗留的孤儿：改了示例标题后 markdown 里已经没有它了。
    mkdirSync(demos, { recursive: true })
    writeFileSync(path.join(demos, 'slider--old.tsx'), 'stale\n')

    writeArtifacts(files, [demos])

    expect(existsSync(path.join(demos, 'slider--old.tsx'))).toBe(false)
    expect(readFileSync(path.join(demos, 'slider--basic.tsx'), 'utf8')).toBe('export default function Demo() {}\n')
    expect(existsSync(path.join(dir, 'examples.ts'))).toBe(true)
  })
})

describe('checkArtifacts', () => {
  it('产物与产出集合一致时通过', () => {
    const dir = scratch()
    const { demos, files } = artifacts(dir)
    writeArtifacts(files, [demos])
    expect(() => checkArtifacts(files, [demos])).not.toThrow()
  })

  it('产物缺失时报出那个文件', () => {
    const dir = scratch()
    const { demos, files } = artifacts(dir)
    expect(() => checkArtifacts(files, [demos])).toThrow(/生成物缺失.*examples\.ts/s)
  })

  it('磁盘上的字节与产出不一致时报出那个文件', () => {
    const dir = scratch()
    const { demos, files } = artifacts(dir)
    writeArtifacts(files, [demos])
    // 一个字节的偏斜也要红：这条是「产物 == markdown」在测试档的唯一判据。
    const target = path.join(demos, 'slider--basic.tsx')
    writeFileSync(target, 'export default function Demo() {}!')
    expect(() => checkArtifacts(files, [demos])).toThrow(/生成物与 markdown 不一致.*slider--basic\.tsx/s)
  })

  it('上一轮遗留的孤儿先被报出来', () => {
    const dir = scratch()
    const { demos, files } = artifacts(dir)
    writeArtifacts(files, [demos])
    writeFileSync(path.join(demos, 'slider--orphan.tsx'), 'orphan\n')
    expect(() => checkArtifacts(files, [demos])).toThrow(/生成物陈旧.*slider--orphan\.tsx/s)
  })
})
