import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import {
  createGhWailsAdapter,
  inspectExistingWailsRelease,
  inspectReleaseDirectory,
  publishWailsRelease
} from './publish-wails-release.mjs'

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'wails-release-test-'))
const repository = 'greypan/mono'
const version = '1.2.3'
const mergeSha = 'a'.repeat(40)
const tag = `interweave-v${version}`
const expectedNames = [
  `interweave-${version}-macos-arm64.dmg`,
  `interweave-${version}-windows-x64.exe`,
  'checksums.txt'
]

function digest(value) {
  return createHash('sha256').update(value).digest('hex')
}

function makeAssets(directory, contents = ['mac dmg bytes', 'windows exe bytes']) {
  fs.mkdirSync(directory, { recursive: true })
  fs.writeFileSync(path.join(directory, expectedNames[0]), contents[0])
  fs.writeFileSync(path.join(directory, expectedNames[1]), contents[1])
  fs.writeFileSync(
    path.join(directory, 'checksums.txt'),
    `${digest(contents[0])}  ${expectedNames[0]}\n${digest(contents[1])}  ${expectedNames[1]}\n`
  )
}

function releaseAssetsFrom(directory, withDigests = true) {
  return expectedNames.map(name => {
    const contents = fs.readFileSync(path.join(directory, name))
    return {
      name,
      size: contents.length,
      state: 'uploaded',
      ...(withDigests ? { digest: `sha256:${digest(contents)}` } : {})
    }
  })
}

function fakeAdapter({ initialRelease, initialTag, invalidCreatedRelease = false } = {}) {
  const releases = new Map(initialRelease ? [[tag, structuredClone(initialRelease)]] : [])
  const tags = new Map(initialTag ? [[tag, structuredClone(initialTag)]] : [])
  const calls = []
  return {
    releases,
    tags,
    calls,
    async getRelease(name) {
      calls.push(['getRelease', name])
      return releases.has(name) ? structuredClone(releases.get(name)) : null
    },
    async resolveTag(name) {
      calls.push(['resolveTag', name])
      return tags.has(name) ? structuredClone(tags.get(name)) : null
    },
    async createAnnotatedTag(name, sha) {
      calls.push(['createAnnotatedTag', name, sha])
      if (tags.has(name)) throw new Error('tag already exists')
      tags.set(name, { sha, annotated: true })
    },
    async createRelease(value) {
      calls.push(['createRelease', value])
      const assets = invalidCreatedRelease
        ? [{ name: 'unexpected.bin', size: 1, state: 'uploaded' }]
        : value.names.map(name => {
            const file = path.join(value.assetsDirectory, name)
            const contents = fs.readFileSync(file)
            return { name, size: contents.length, state: 'uploaded', digest: `sha256:${digest(contents)}` }
          })
      releases.set(value.tag, { draft: false, assets })
    }
  }
}

function releaseOptions(assetsDirectory, adapter) {
  return { repository, version, mergeSha, assetsDirectory, adapter }
}

try {
  const localAssets = path.join(root, 'local-assets')
  makeAssets(localAssets)
  const localInfo = await inspectReleaseDirectory(localAssets, version)
  assert.equal(localInfo.digests.size, 3)
  assert.equal(localInfo.sizes.size, 3)

  // Local files must have an exact, nonempty asset set and checksums matching both desktop binaries.
  {
    const extra = path.join(root, 'extra-assets')
    makeAssets(extra)
    fs.writeFileSync(path.join(extra, 'extra.bin'), 'extra')
    await assert.rejects(inspectReleaseDirectory(extra, version), /must contain exactly/)

    const malformed = path.join(root, 'bad-assets')
    makeAssets(malformed)
    fs.writeFileSync(path.join(malformed, 'checksums.txt'), `${'0'.repeat(64)}  ${expectedNames[0]}\n`)
    await assert.rejects(inspectReleaseDirectory(malformed, version), /checksums.txt must list both|checksum mismatch/)

    const mismatch = path.join(root, 'checksum-mismatch')
    makeAssets(mismatch)
    fs.writeFileSync(path.join(mismatch, expectedNames[0]), 'changed after checksums were generated')
    const gh = fakeAdapter()
    await assert.rejects(publishWailsRelease(releaseOptions(mismatch, gh)), /checksum mismatch/)
    assert.deepEqual(gh.calls, [], 'checksum mismatch must fail before any tag or release write')
  }

  // Preflight is read-only and allows a new version only when neither a release nor a conflicting tag exists.
  {
    const gh = fakeAdapter()
    assert.deepEqual(await inspectExistingWailsRelease({ repository, version, mergeSha, adapter: gh }), { tag })
    assert.deepEqual(
      gh.calls.map(([name]) => name),
      ['getRelease', 'resolveTag']
    )
  }

  // Any existing release, including a valid published one, requires human inspection rather than automation.
  {
    const gh = fakeAdapter({
      initialRelease: { draft: false, assets: releaseAssetsFrom(localAssets) },
      initialTag: { sha: mergeSha, annotated: true }
    })
    await assert.rejects(inspectExistingWailsRelease({ repository, version, mergeSha, adapter: gh }), /already exists/)
    assert.deepEqual(
      gh.calls.map(([name]) => name),
      ['getRelease', 'resolveTag']
    )
  }

  // A new release uses one normal release-create operation with the verified local files.
  {
    const gh = fakeAdapter()
    const result = await publishWailsRelease(releaseOptions(localAssets, gh))
    assert.deepEqual(result, { tag, assets: 3 })
    assert.deepEqual(gh.tags.get(tag), { sha: mergeSha, annotated: true })
    assert.equal(gh.releases.get(tag).draft, false)
    assert.deepEqual(gh.calls.filter(([name]) => name === 'createAnnotatedTag').length, 1)
    assert.equal(gh.calls.filter(([name]) => name === 'createRelease').length, 1)
    assert.equal(
      gh.calls.some(([name]) => ['deleteDraft', 'uploadAssets', 'downloadAssets', 'publishDraft'].includes(name)),
      false
    )
    const create = gh.calls.find(([name]) => name === 'createRelease')[1]
    assert.deepEqual(create.names, expectedNames)
  }

  // Publishing never skips or modifies an already published release.
  {
    const gh = fakeAdapter({
      initialRelease: { draft: false, assets: releaseAssetsFrom(localAssets) },
      initialTag: { sha: mergeSha, annotated: true }
    })
    await assert.rejects(publishWailsRelease(releaseOptions(localAssets, gh)), /already exists/)
    assert.equal(
      gh.calls.some(([name]) => ['createAnnotatedTag', 'createRelease'].includes(name)),
      false
    )
  }

  // Existing drafts are rejected, regardless of run identity, and are never modified or replaced.
  {
    const gh = fakeAdapter({
      initialRelease: { draft: true, assets: [] },
      initialTag: { sha: mergeSha, annotated: true }
    })
    await assert.rejects(publishWailsRelease(releaseOptions(localAssets, gh)), /release .* already exists/)
    assert.equal(
      gh.calls.some(([name]) => ['createAnnotatedTag', 'createRelease', 'deleteDraft'].includes(name)),
      false
    )
  }

  // Existing metadata conflicts fail closed before tag or release writes.
  {
    const cases = [
      [fakeAdapter({ initialRelease: { draft: false, assets: [] } }), /release .* exists but its tag is missing/],
      [fakeAdapter({ initialTag: { sha: 'b'.repeat(40), annotated: true } }), /points to/],
      [fakeAdapter({ initialTag: { sha: mergeSha, annotated: false } }), /lightweight/],
      [
        fakeAdapter({ initialRelease: { draft: false, assets: [] }, initialTag: { sha: mergeSha, annotated: true } }),
        /already exists/
      ]
    ]
    for (const [gh, error] of cases) {
      await assert.rejects(inspectExistingWailsRelease({ repository, version, mergeSha, adapter: gh }), error)
      assert.equal(
        gh.calls.some(([name]) => ['createAnnotatedTag', 'createRelease', 'deleteDraft'].includes(name)),
        false
      )
    }
  }

  // A matching orphan annotated tag is safe to use; publication does not overwrite or recreate it.
  {
    const gh = fakeAdapter({ initialTag: { sha: mergeSha, annotated: true } })
    await publishWailsRelease(releaseOptions(localAssets, gh))
    assert.equal(
      gh.calls.some(([name]) => name === 'createAnnotatedTag'),
      false
    )
    assert.equal(
      gh.calls.some(([name]) => name === 'createRelease'),
      true
    )
  }

  // Post-create API metadata must verify against the same local files before the job can report success.
  {
    const gh = fakeAdapter({ invalidCreatedRelease: true })
    await assert.rejects(publishWailsRelease(releaseOptions(localAssets, gh)), /exactly the three expected assets/)
  }

  // The adapter preserves non-404 API failures while treating only an explicit missing tag/release as absent.
  {
    const forbidden = createGhWailsAdapter({
      repository,
      mergeSha,
      spawn: () => ({ status: 1, stdout: '', stderr: 'gh: HTTP 403: Resource not accessible by integration' })
    })
    assert.throws(() => forbidden.getRelease(tag), /HTTP 403/)
    const absent = createGhWailsAdapter({
      repository,
      mergeSha,
      spawn: () => ({ status: 1, stdout: '', stderr: 'gh: HTTP 404: Not Found' })
    })
    assert.equal(absent.getRelease(tag), null)
  }

  // The CLI uses the normal GH release lifecycle; it does not expose recovery, overwrite, or cleanup operations.
  {
    const calls = []
    const adapter = createGhWailsAdapter({
      repository,
      mergeSha,
      spawn: (command, args) => {
        calls.push([command, args])
        return { status: 0, stdout: '', stderr: '' }
      }
    })
    adapter.createAnnotatedTag(tag)
    adapter.createRelease({ tag, title: `Interweave v${version}`, assetsDirectory: localAssets, names: expectedNames })
    assert.deepEqual(calls[0], [
      'git',
      [
        '-c',
        'user.name=github-actions[bot]',
        '-c',
        'user.email=41898282+github-actions[bot]@users.noreply.github.com',
        'tag',
        '-a',
        tag,
        '-m',
        `Interweave v${version}`,
        mergeSha
      ]
    ])
    assert.deepEqual(calls[1], ['git', ['push', 'origin', `refs/tags/${tag}:refs/tags/${tag}`]])
    const [, args] = calls[2]
    assert.equal(args[0], 'release')
    assert.equal(args[1], 'create')
    assert.ok(args.includes('--target'))
    assert.ok(args.includes(mergeSha))
    assert.ok(args.includes('--verify-tag'))
    assert.ok(args.includes('--generate-notes'))
    assert.equal(args.includes('--draft'), false)
    assert.equal(args.includes('--clobber'), false)
    assert.deepEqual(Object.keys(adapter).sort(), ['createAnnotatedTag', 'createRelease', 'getRelease', 'resolveTag'])
  }

  console.log('.github/scripts/publish-wails-release.test.mjs: all assertions passed')
} finally {
  fs.rmSync(root, { recursive: true, force: true })
}
