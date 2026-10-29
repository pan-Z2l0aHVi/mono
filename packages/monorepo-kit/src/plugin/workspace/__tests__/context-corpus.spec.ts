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

async function detail(result: Promise<string | void>): Promise<string> {
  const value = await result
  assert.ok(value, 'check-context returned no detail')
  return value
}

it('context-corpus', async () => {
  assert.match(
    await detail(contextCorpus.run({ root: makeFixture() })),
    /^3 Markdown files, 3 link-scanned files \/ 2 local links, corpus [0-9a-f]{12}$/
  )

  // 路由表由入口提供：入口没提到的 task-specific 文档没有加载路径。
  await assert.rejects(
    contextCorpus.run({ root: makeFixture(false) }),
    /docs\/agents\/a\.md: no loading path from the AGENTS\.md task routing table/
  )

  // 授权指针来自组合点：同一篇文档，换一个 pointer 就从通过变成失败。
  const unauthorized = makeFixture()
  write(unauthorized, 'docs/agents/a.md', '# a\n\n执行 git push 后合并。\n')
  await assert.rejects(
    contextCorpus.run({ root: unauthorized }),
    /a\.md: remote write commands require the authorization pointer workflow\.md#custom/
  )

  write(unauthorized, 'docs/agents/a.md', '# a\n\n执行 git push 前先读 workflow.md#custom。\n')
  await detail(contextCorpus.run({ root: unauthorized }))

  const otherPointer = defineContextCorpus({
    ...options,
    authorization: { pointer: 'workflow.md#other', owner: 'docs/agents/workflow.md' }
  })
  await assert.rejects(
    otherPointer.run({ root: unauthorized }),
    /a\.md: remote write commands require the authorization pointer workflow\.md#other/
  )

  // owner 文档定义授权机制本身，不要求指向自己。
  const owned = makeFixture()
  write(owned, 'docs/agents/workflow.md', '# workflow\n\n## custom\n\n执行 git push。\n')
  await detail(contextCorpus.run({ root: owned }))
})

afterAll(() => {
  fs.rmSync(tempRoot, { recursive: true, force: true })
})
