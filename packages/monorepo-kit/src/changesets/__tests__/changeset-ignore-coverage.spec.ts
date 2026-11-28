import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { afterAll, it } from 'vite-plus/test'

import { defineCatch } from '../../runner/catch'
import { defineRunner } from '../../runner/runner'
import { defineChangesetIgnoreCoverage } from '../changeset-ignore-coverage'

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'greypan-changeset-ignore-'))

function makeWorkspace(
  name: string,
  manifests: Record<string, { name: string; private?: boolean }>,
  ignore: string[]
): string {
  const root = path.join(tempRoot, name)
  fs.mkdirSync(path.join(root, '.changeset'), { recursive: true })
  fs.writeFileSync(path.join(root, 'pnpm-workspace.yaml'), 'packages:\n  - packages/*\n  - apps/*\n')
  fs.writeFileSync(path.join(root, '.changeset', 'config.json'), JSON.stringify({ ignore }, null, 2) + '\n')
  for (const [relDir, manifest] of Object.entries(manifests)) {
    const dir = path.join(root, relDir)
    fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify(manifest, null, 2) + '\n')
  }
  return root
}

function run(root: string, allowedPrivateVersioned: readonly string[] = []) {
  return defineRunner()
    .use(defineChangesetIgnoreCoverage({ allowedPrivateVersioned }))
    .use(defineCatch())
    .make({ root, env: process.env })
    .run()
}

it('accepts a workspace where all private packages except allowedPrivateVersioned are ignored', async () => {
  const root = makeWorkspace(
    'valid',
    {
      'packages/pub': { name: '@scope/pub' },
      'packages/priv': { name: '@scope/priv', private: true },
      'apps/desktop': { name: '@scope/desktop', private: true }
    },
    ['@scope/priv']
  )
  assert.ok((await run(root, ['@scope/desktop'])).ok)
})

it('rejects unignored private packages, ignored public packages, and stale ignore entries', async () => {
  const unignoredPrivate = makeWorkspace(
    'unignored-private',
    {
      'packages/pub': { name: '@scope/pub' },
      'packages/priv': { name: '@scope/priv', private: true }
    },
    []
  )
  const r1 = await run(unignoredPrivate)
  assert.equal(r1.ok, false)
  if (!r1.ok) assert.match(r1.error, /private package @scope\/priv must be listed/)

  const ignoredPublic = makeWorkspace('ignored-public', { 'packages/pub': { name: '@scope/pub' } }, ['@scope/pub'])
  const r2 = await run(ignoredPublic)
  assert.equal(r2.ok, false)
  if (!r2.ok) assert.match(r2.error, /public package @scope\/pub must not be listed/)

  const staleIgnore = makeWorkspace('stale-ignore', { 'packages/pub': { name: '@scope/pub' } }, ['@scope/deleted'])
  const r3 = await run(staleIgnore)
  assert.equal(r3.ok, false)
  if (!r3.ok) assert.match(r3.error, /stale ignore entry @scope\/deleted/)
})

it('rejects invalid allowedPrivateVersioned entries (ignored, missing, or public)', async () => {
  const allowedAlsoIgnored = makeWorkspace(
    'allowed-also-ignored',
    {
      'packages/pub': { name: '@scope/pub' },
      'apps/desktop': { name: '@scope/desktop', private: true }
    },
    ['@scope/desktop']
  )
  const r1 = await run(allowedAlsoIgnored, ['@scope/desktop'])
  assert.equal(r1.ok, false)
  if (!r1.ok) assert.match(r1.error, /allowed private deliverable @scope\/desktop must not be listed/)

  const allowedMissing = makeWorkspace('allowed-missing', { 'packages/pub': { name: '@scope/pub' } }, [])
  const r2 = await run(allowedMissing, ['@scope/missing'])
  assert.equal(r2.ok, false)
  if (!r2.ok) assert.match(r2.error, /allowedPrivateVersioned entry @scope\/missing does not exist/)

  const allowedPublic = makeWorkspace('allowed-public', { 'packages/pub': { name: '@scope/pub' } }, [])
  const r3 = await run(allowedPublic, ['@scope/pub'])
  assert.equal(r3.ok, false)
  if (!r3.ok) assert.match(r3.error, /allowedPrivateVersioned entry @scope\/pub is public/)
})

afterAll(() => {
  fs.rmSync(tempRoot, { recursive: true, force: true })
})
