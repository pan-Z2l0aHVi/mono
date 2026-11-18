import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { afterEach, describe, expect, it } from 'vite-plus/test'

import { defineTurboInputs, type TurboInputsOptions } from '../turbo-inputs'

/*
 * G7 包级测试：turbo-inputs 的整条链在真实子进程上走通（chain → fixture 写盘 → exec 起真
 * node 进程跑 turbo CLI → 解析 --dry=json → 失效判定 → 清理）。turbo 本体用一份内容哈希
 * 的 stub CLI 顶上：它模拟 turbo 对「输入范围」的关键行为——只哈希 turbo.json 与 workspace
 * 声明的包目录，范围外文件不进哈希。被测的是本链的接线与判定，不是 turbo 自己的哈希算法。
 */

const TURBO_STUB = `
const fs = require('node:fs')
const path = require('node:path')
const crypto = require('node:crypto')
const args = process.argv.slice(2)
if (!args.includes('--dry=json')) {
  console.error('stub: only --dry=json is supported')
  process.exit(2)
}
const task = args[1]
const filter = args.find(arg => arg.startsWith('--filter='))?.slice('--filter='.length) ?? ''
const root = process.cwd()
// pnpm-workspace.yaml 的 packages 列表指到包目录；哈希范围 = turbo.json + 包目录全部文件。
const workspace = fs.readFileSync(path.join(root, 'pnpm-workspace.yaml'), 'utf8')
const packageDirs = [...workspace.matchAll(/^\\s*-\\s*(\\S+)/gm)].map(match => match[1])
const hashOf = relative => {
  const absolute = path.join(root, relative)
  if (!fs.existsSync(absolute)) return 'missing'
  const stat = fs.statSync(absolute)
  if (stat.isDirectory()) {
    return fs
      .readdirSync(absolute)
      .sort()
      .map(entry => hashOf(path.join(relative, entry)))
      .join('|')
  }
  return crypto.createHash('sha256').update(fs.readFileSync(absolute)).digest('hex').slice(0, 16)
}
const hash = JSON.stringify(['turbo.json', ...packageDirs].map(hashOf))
console.log(JSON.stringify({ tasks: [{ taskId: filter + '#' + task, hash }] }))
`

const OPTIONS: TurboInputsOptions = {
  name: 'turbo-inputs-spec',
  packageName: '@scope/demo',
  packageDir: 'packages/demo',
  copiedFiles: ['turbo.json'],
  requiredInputs: [
    {
      path: 'packages/demo/src/index.ts',
      label: 'src/index.ts',
      contents: 'export const v = 1\n',
      change: 'export const v = 2\n'
    }
  ],
  ignoredInputs: [{ path: 'docs/readme.md', label: 'docs/readme.md', contents: '# fixture\n', change: '# changed\n' }]
}

function makeFixtureRoot(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'turbo-inputs-spec-repo-'))
  fs.mkdirSync(path.join(root, 'node_modules/turbo/bin'), { recursive: true })
  fs.writeFileSync(path.join(root, 'node_modules/turbo/bin/turbo'), TURBO_STUB)
  fs.writeFileSync(path.join(root, 'turbo.json'), JSON.stringify({ tasks: {} }))
  return root
}

function run(options: TurboInputsOptions, root: string) {
  return defineTurboInputs(options).make({ root, env: process.env }).run()
}

const fixtureRoots: string[] = []

afterEach(() => {
  for (const root of fixtureRoots.splice(0)) fs.rmSync(root, { recursive: true, force: true })
})

describe('defineTurboInputs（真实子进程）', () => {
  it('范围内输入失效、范围外输入不失效：整条链跑通返回 ok', async () => {
    const root = makeFixtureRoot()
    fixtureRoots.push(root)

    const result = await run(OPTIONS, root)

    expect(result).toEqual({ ok: true, value: undefined })
  })

  it('必失效输入没有让任务失效时，以输入 label 呈现 Err', async () => {
    const root = makeFixtureRoot()
    fixtureRoots.push(root)
    // stub 只哈希 turbo.json 与包目录：范围外的文件被当作「必失效」输入时必须报错。
    const unwatched: TurboInputsOptions = {
      ...OPTIONS,
      requiredInputs: [{ path: 'unwatched/keep.txt', label: 'unwatched.txt', contents: 'a\n', change: 'b\n' }]
    }

    const result = await run(unwatched, root)

    expect(result.ok).toBe(false)
    assert.match(!result.ok ? result.error : '', /^turbo: unwatched\.txt must invalidate build/)
  })

  it('范围外输入让任务失效时，同样以输入 label 呈现 Err', async () => {
    const root = makeFixtureRoot()
    fixtureRoots.push(root)
    // README 放进包目录（stub 的哈希范围内）却被声明为忽略：必须报错。
    const watched: TurboInputsOptions = {
      ...OPTIONS,
      ignoredInputs: [
        { path: 'packages/demo/README.md', label: 'packages/demo/README.md', contents: '# a\n', change: '# b\n' }
      ]
    }

    const result = await run(watched, root)

    expect(result.ok).toBe(false)
    assert.match(!result.ok ? result.error : '', /^turbo: packages\/demo\/README\.md must not invalidate build/)
  })

  it('turbo 可执行缺席时以安装提示归因 Err', async () => {
    const root = makeFixtureRoot()
    fixtureRoots.push(root)
    fs.rmSync(path.join(root, 'node_modules/turbo/bin/turbo'))

    const result = await run(OPTIONS, root)

    expect(result.ok).toBe(false)
    assert.match(
      !result.ok ? result.error : '',
      /^turbo: Turbo executable not found at .*node_modules\/turbo\/bin\/turbo/
    )
  })

  it('dry-run 输出不是 JSON 时以「no JSON」归因 Err', async () => {
    const root = makeFixtureRoot()
    fixtureRoots.push(root)
    fs.writeFileSync(path.join(root, 'node_modules/turbo/bin/turbo'), 'console.error("not json")\nprocess.exit(0)\n')

    const result = await run(OPTIONS, root)

    expect(result.ok).toBe(false)
    assert.match(!result.ok ? result.error : '', /^turbo: turbo build dry-run printed no JSON/)
  })

  it('dry-run 输出缺目标任务的 hash 时归因 Err', async () => {
    const root = makeFixtureRoot()
    fixtureRoots.push(root)
    fs.writeFileSync(
      path.join(root, 'node_modules/turbo/bin/turbo'),
      'console.log(JSON.stringify({ tasks: [{ taskId: "other#build", hash: "h" }] }))\n'
    )

    const result = await run(OPTIONS, root)

    expect(result.ok).toBe(false)
    assert.match(!result.ok ? result.error : '', /^turbo: turbo dry-run must contain @scope\/demo#build/)
  })
})
