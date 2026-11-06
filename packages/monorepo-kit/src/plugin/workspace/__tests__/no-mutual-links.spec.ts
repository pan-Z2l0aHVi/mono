import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { afterAll, it } from 'vite-plus/test'

import { defineCatch } from '../../../runner/catch'
import { defineRunner } from '../../../runner/runner'
import { defineNoMutualLinks, type NoMutualLinksOptions } from '../no-mutual-links'

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'greypan-mutual-links-'))
let fixture = 0

function makeFixture(skills: Record<string, unknown> = {}): string {
  const root = path.join(tempRoot, `fixture-${fixture++}`)
  fs.mkdirSync(path.join(root, 'docs', 'agents'), { recursive: true })
  fs.mkdirSync(path.join(root, 'docs', 'adr'), { recursive: true })
  fs.writeFileSync(path.join(root, 'skills-lock.json'), JSON.stringify({ skills }) + '\n')
  return root
}

function write(root: string, file: string, content: string): void {
  fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true })
  fs.writeFileSync(path.join(root, file), content)
}

const mirror = {
  entity: 'skills',
  surface: '.agents/skills',
  vendored: '.agents/vendored',
  lockedNames: (root: string): string[] =>
    Object.keys(JSON.parse(fs.readFileSync(path.join(root, 'skills-lock.json'), 'utf8')).skills)
}

const options: NoMutualLinksOptions = {
  roots: ['ROOT.md', 'docs/agents', 'docs/adr', '.agents'],
  workspaces: [{ directory: 'packages', deep: ['notes.md'], shallow: ['index.md'] }],
  mirror,
  forbiddenDirections: [{ from: 'docs/agents/', to: '.agents/rules/', label: 'docs-to-rules' }]
}

const noMutualLinks = defineNoMutualLinks(options)

// 只扫磁盘、不 spawn 子进程；链尾带 defineCatch：测试喂坏的 lockedNames 属于装配故障，
// 走 `throw: ` 而不是某个域名前缀。
type NoMutualLinks = ReturnType<typeof defineNoMutualLinks>

function kit(plugin: NoMutualLinks, root: string) {
  return defineRunner().use(plugin).use(defineCatch()).make({ root, env: process.env }).run()
}

async function failure(plugin: NoMutualLinks, root: string): Promise<string> {
  const result = await kit(plugin, root)
  if (result.ok) assert.fail('expected no-mutual-links to fail')
  return result.error
}

it('no-mutual-links', async () => {
  const valid = makeFixture()
  write(valid, 'ROOT.md', '[a](docs/agents/a.md)\n')
  write(valid, 'docs/agents/a.md', '# a\n')
  assert.ok((await kit(noMutualLinks, valid)).ok)

  const docsToRules = makeFixture()
  write(docsToRules, 'docs/agents/a.md', '[rule](../../.agents/rules/x.md)\n')
  write(docsToRules, '.agents/rules/x.md', '# rule\n')
  assert.match(await failure(noMutualLinks, docsToRules), /^md:[\s\S]*docs-to-rules link forbidden/)

  const mutual = makeFixture()
  write(mutual, 'docs/agents/a.md', '[b](b.md)\n')
  write(mutual, 'docs/agents/b.md', '[a](a.md)\n')
  assert.match(await failure(noMutualLinks, mutual), /^md:[\s\S]*mutual links forbidden/)

  // 文件名全大写的入口层豁免互链判定。
  const exempt = makeFixture()
  write(exempt, 'docs/agents/MAP.md', '[a](a.md)\n')
  write(exempt, 'docs/agents/a.md', '[map](MAP.md)\n')
  assert.ok((await kit(noMutualLinks, exempt)).ok)

  const noEdges = makeFixture()
  write(noEdges, 'docs/agents/a.md', '[external](https://example.com)\n')
  assert.match(await failure(noMutualLinks, noEdges), /^md:[\s\S]*found 0 local Markdown links/)

  // workspace 面：直接子目录的 `shallow` 文件与递归的 `deep` 文件都在语料内。
  const shallow = makeFixture()
  write(shallow, 'packages/a/index.md', '[b](../b/index.md)\n')
  write(shallow, 'packages/b/index.md', '[a](../a/index.md)\n')
  assert.match(await failure(noMutualLinks, shallow), /^md:[\s\S]*mutual links forbidden/)

  const deep = makeFixture()
  write(deep, 'packages/a/deep/notes.md', '[b](../../b/deep/notes.md)\n')
  write(deep, 'packages/b/deep/notes.md', '[a](../../a/deep/notes.md)\n')
  assert.match(await failure(noMutualLinks, deep), /^md:[\s\S]*mutual links forbidden/)

  // 镜像面：正文以 `surface` 路径入列、读 `entity` 实体，判定用的是消费面路径。
  const mirrored = makeFixture()
  write(mirrored, 'docs/agents/a.md', '[x](../../.agents/skills/foo/notes.md)\n')
  write(mirrored, 'skills/foo/notes.md', '[a](../../../docs/agents/a.md)\n')
  assert.match(await failure(noMutualLinks, mirrored), /^md:[\s\S]*mutual links forbidden/)

  // 锁定清单里的上游件既不进镜像面，也不从 vendored 实体目录入列。
  const lockedMirror = makeFixture({ foo: {} })
  write(lockedMirror, 'docs/agents/a.md', '[x](../../.agents/skills/foo/notes.md)\n')
  write(lockedMirror, 'skills/foo/notes.md', '[a](../../../docs/agents/a.md)\n')
  assert.match(await failure(noMutualLinks, lockedMirror), /^md:[\s\S]*found 0 local Markdown links/)

  const vendored = makeFixture()
  write(vendored, 'docs/agents/a.md', '[x](../../.agents/vendored/foo/x.md)\n')
  write(vendored, '.agents/vendored/foo/x.md', '[a](../../../docs/agents/a.md)\n')
  assert.match(await failure(noMutualLinks, vendored), /^md:[\s\S]*mutual links forbidden/)

  const vendoredLocked = makeFixture({ foo: {} })
  write(vendoredLocked, 'docs/agents/a.md', '[x](../../.agents/vendored/foo/x.md)\n')
  write(vendoredLocked, '.agents/vendored/foo/x.md', '[a](../../../docs/agents/a.md)\n')
  assert.match(await failure(noMutualLinks, vendoredLocked), /^md:[\s\S]*found 0 local Markdown links/)

  // 清单读不出来时 fail-closed，错误由组合点给出。
  const unreadable = defineNoMutualLinks({
    ...options,
    mirror: {
      ...mirror,
      lockedNames: () => {
        throw new Error('cannot run: skills-lock.json is missing or unreadable')
      }
    }
  })
  assert.match(await failure(unreadable, makeFixture()), /^throw:.*skills-lock\.json is missing/)
})

afterAll(() => {
  fs.rmSync(tempRoot, { recursive: true, force: true })
})
