import assert from 'node:assert/strict'

import { createNpmReleaseAdapter, createReleasesForReceipt } from './create-github-releases.mjs'

const mergeSha = 'a'.repeat(40)
const receipt = {
  schemaVersion: 1,
  repository: 'greypan/mono',
  mergeSha,
  runId: '123',
  packages: [
    { name: '@greypan/carry', version: '0.9.0', directory: 'packages/carry' },
    { name: '@greypan/alpha', version: '1.2.0', directory: 'packages/alpha' }
  ]
}

function adapter(initial = {}) {
  const releases = new Map(Object.entries(initial))
  const tags = new Map(Object.entries(initial).map(([tag, release]) => [tag, release.targetSha]))
  const created = []
  return {
    releases,
    tags,
    created,
    findRelease: async tag => releases.get(tag) ?? null,
    resolveTag: async tag => tags.get(tag) ?? null,
    createRelease: async value => {
      created.push(value)
      releases.set(value.tag, { draft: false, targetSha: mergeSha })
      tags.set(value.tag, mergeSha)
    }
  }
}

const log = { log() {}, warn() {} }
const fastRetry = { retryDelays: [0], wait: async () => {} }

// Alpha may have changed in the release PR, but its exact version already existed. It must not be attributed
// to this merge SHA. Carry is unchanged by the PR and absent from npm, so the original receipt includes it.
{
  const gh = adapter()
  const result = await createReleasesForReceipt({
    receipt: { ...receipt, packages: [receipt.packages[0]] },
    repository: 'greypan/mono',
    mergeSha,
    publishResult: 'success',
    lookupRegistry: async () => true,
    adapter: gh,
    log,
    ...fastRetry
  })
  assert.deepEqual(
    result.map(({ name }) => name),
    ['@greypan/carry']
  )
  assert.deepEqual(
    gh.created.map(({ tag }) => tag),
    ['@greypan/carry@0.9.0']
  )
}

// Existing release/tag is idempotent only when its commit matches the current merge SHA.
{
  const tag = '@greypan/carry@0.9.0'
  const gh = adapter({ [tag]: { draft: false, targetSha: mergeSha } })
  await createReleasesForReceipt({
    receipt: { ...receipt, packages: [receipt.packages[0]] },
    repository: 'greypan/mono',
    mergeSha,
    publishResult: 'success',
    lookupRegistry: async () => true,
    adapter: gh,
    log,
    ...fastRetry
  })
  assert.deepEqual(gh.created, [])
}

for (const invalid of [
  adapter({ '@greypan/carry@0.9.0': { draft: false, targetSha: 'b'.repeat(40) } }),
  adapter({ '@greypan/carry@0.9.0': { draft: false, targetSha: null } }),
  adapter({ '@greypan/carry@0.9.0': { draft: true, targetSha: mergeSha } })
]) {
  await assert.rejects(
    createReleasesForReceipt({
      receipt: { ...receipt, packages: [receipt.packages[0]] },
      repository: 'greypan/mono',
      mergeSha,
      publishResult: 'success',
      lookupRegistry: async () => true,
      adapter: invalid,
      log,
      ...fastRetry
    }),
    /points to|tag is missing|not published/
  )
}

// An absent release cannot be created on a tag pointing at a different commit.
{
  const gh = adapter()
  gh.tags.set('@greypan/carry@0.9.0', 'b'.repeat(40))
  await assert.rejects(
    createReleasesForReceipt({
      receipt: { ...receipt, packages: [receipt.packages[0]] },
      repository: 'greypan/mono',
      mergeSha,
      publishResult: 'success',
      lookupRegistry: async () => true,
      adapter: gh,
      log,
      ...fastRetry
    }),
    /tag .*expected/
  )
  assert.deepEqual(gh.created, [])
}

// A failed publisher may write notes for its confirmed subset. A successful or skipped publisher may not
// leave a receipt package absent and still report a green release-notes job.
{
  const gh = adapter()
  await createReleasesForReceipt({
    receipt,
    repository: 'greypan/mono',
    mergeSha,
    publishResult: 'failure',
    lookupRegistry: async name => name === '@greypan/carry',
    adapter: gh,
    log,
    ...fastRetry
  })
  assert.deepEqual(
    gh.created.map(({ tag }) => tag),
    ['@greypan/carry@0.9.0']
  )
  await assert.rejects(
    createReleasesForReceipt({
      receipt,
      repository: 'greypan/mono',
      mergeSha,
      publishResult: 'success',
      lookupRegistry: async () => false,
      adapter: adapter(),
      log,
      ...fastRetry
    }),
    /still absent after registry retries/
  )
}

// The GitHub CLI adapter treats only HTTP 404 as absent. Authentication, network, and server failures stay fatal.
{
  const spawn = (_command, args) => {
    assert.ok(args[0] === 'api')
    return { status: 1, stdout: '', stderr: 'gh: HTTP 403: Resource not accessible by integration' }
  }
  const gh = createNpmReleaseAdapter({ repository: 'greypan/mono', mergeSha, spawn })
  await assert.rejects(async () => gh.findRelease('@greypan/carry@0.9.0'), /HTTP 403/)
}

console.log('.github/scripts/create-github-releases.test.mjs: all assertions passed')
