import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { afterAll, it } from 'vite-plus/test'

import { defineContextCorpus, type ContextCorpusOptions } from '../context-corpus'

const tempRoot = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'greypan-context-corpus-')))
let fixture = 0

function write(root: string, file: string, content: string): void {
  fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true })
  fs.writeFileSync(path.join(root, file), content)
}

// 只开必要分支：workspace、ADR、软链、架构索引与 commit scope 各有专门的门禁，这里验证的是
// options 真的驱动语料面与授权判定，而不是这一份 fixture 恰好合法。
const options: ContextCorpusOptions = {
  entry: 'AGENTS.md',
  entryMarkers: ['docs/agents/workflow.md'],
  rootDocuments: ['AGENTS.md'],
  forbiddenRootFiles: [],
  agentDocs: 'docs/agents',
  adrDocs: 'docs/adr',
  agentAssets: '.agents',
  rules: '.agents/rules',
  skills: {
    lockFile: 'skills-lock.json',
    entity: 'skills',
    surface: '.agents/skills',
    vendored: '.agents/skills-vendored',
    facades: []
  },
  workspaces: [],
  applicationDirs: [],
  referenceDirs: [],
  requiredScripts: [],
  symlinks: [],
  authorization: { pointer: 'workflow.md#custom', owner: 'docs/agents/workflow.md' }
}

const contextCorpus = defineContextCorpus(options)

function makeFixture(routed = true): string {
  const root = path.join(tempRoot, `fixture-${fixture++}`)
  write(root, 'pnpm-workspace.yaml', 'packages:\n  - packages/*\n')
  write(root, 'package.json', `${JSON.stringify({ scripts: {} }, null, 2)}\n`)
  write(root, 'skills-lock.json', `${JSON.stringify({ skills: {} }, null, 2)}\n`)
  write(
    root,
    'AGENTS.md',
    routed
      ? '# 入口\n\n[workflow](docs/agents/workflow.md)\n\n[a](docs/agents/a.md)\n'
      : '# 入口\n\n[workflow](docs/agents/workflow.md)\n'
  )
  write(root, 'docs/agents/workflow.md', '# workflow\n\n## custom\n')
  write(root, 'docs/agents/a.md', '# a\n\n这里没有远端写命令。\n')
  return root
}

// 链里会 spawn git（跟踪 Markdown 清单），env 显式给出一份不依赖开发者 shell 的副本。
type Corpus = ReturnType<typeof defineContextCorpus>

function run(plugin: Corpus, root: string) {
  return plugin.make({ root, env: { ...process.env } }).run()
}

async function failure(plugin: Corpus, root: string): Promise<string> {
  const result = await run(plugin, root)
  if (result.ok) assert.fail('expected context-corpus to fail')
  return result.error
}

it('context-corpus', async () => {
  assert.ok((await run(contextCorpus, makeFixture())).ok)

  // 路由表由入口提供：入口没提到的 task-specific 文档没有加载路径。
  assert.match(
    await failure(contextCorpus, makeFixture(false)),
    /^md:[\s\S]*docs\/agents\/a\.md: no loading path from the AGENTS\.md task routing table/
  )

  // 授权指针来自组合点：同一篇文档，换一个 pointer 就从通过变成失败。
  const unauthorized = makeFixture()
  write(unauthorized, 'docs/agents/a.md', '# a\n\n执行 git push 后合并。\n')
  assert.match(
    await failure(contextCorpus, unauthorized),
    /^md:[\s\S]*a\.md: remote write commands require the authorization pointer workflow\.md#custom/
  )

  // pointer 命中即通过；文档名写成链接，因为裸文本引用本身已被语料门禁判红。
  write(unauthorized, 'docs/agents/a.md', '# a\n\n执行 git push 前先读 [workflow.md](./workflow.md#custom)。\n')
  assert.ok((await run(contextCorpus, unauthorized)).ok)

  const otherPointer = defineContextCorpus({
    ...options,
    authorization: { pointer: 'workflow.md#other', owner: 'docs/agents/workflow.md' }
  })
  assert.match(
    await failure(otherPointer, unauthorized),
    /^md:[\s\S]*a\.md: remote write commands require the authorization pointer workflow\.md#other/
  )

  // owner 文档定义授权机制本身，不要求指向自己。
  const owned = makeFixture()
  write(owned, 'docs/agents/workflow.md', '# workflow\n\n## custom\n\n执行 git push。\n')
  assert.ok((await run(contextCorpus, owned)).ok)
})

it('commit scopes collapse nested workspaces', async () => {
  const scoped = (file: string) =>
    defineContextCorpus({
      ...options,
      commitScopes: {
        file,
        rootScope: 'root',
        pick: config => (config as { prompt?: { scopes?: readonly string[] } }).prompt?.scopes ?? []
      }
    })
  const makeNestedFixture = (): string => {
    const root = makeFixture()
    write(root, 'pnpm-workspace.yaml', 'packages:\n  - packages/**\n')
    write(root, 'packages/app/package.json', `${JSON.stringify({ name: '@acme/app', private: true })}\n`)
    write(root, 'packages/app/web/package.json', `${JSON.stringify({ name: '@acme/app-web', private: true })}\n`)
    return root
  }

  // 嵌套 workspace 归入最近的祖先 workspace，不要求在 scope 清单里单独出现。
  const passing = makeNestedFixture()
  write(passing, 'commitlint.config.js', "export default { prompt: { scopes: ['root', 'app'] } }\n")
  assert.ok((await run(scoped('commitlint.config.js'), passing)).ok)

  // 反过来，把嵌套 workspace 当独立 scope 登记就是指向不存在的 option。
  const failing = makeNestedFixture()
  write(failing, 'commitlint-extra.config.js', "export default { prompt: { scopes: ['root', 'app', 'app-web'] } }\n")
  assert.match(
    await failure(scoped('commitlint-extra.config.js'), failing),
    /^md:[\s\S]*lists an unknown scope: app-web/
  )
})

afterAll(() => {
  fs.rmSync(tempRoot, { recursive: true, force: true })
})
