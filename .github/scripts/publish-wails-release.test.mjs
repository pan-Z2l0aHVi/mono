import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import {
  createGhWailsAdapter,
  inspectReleaseDirectory,
  inspectExistingWailsRelease,
  ownershipMarker,
  publishWailsRelease
} from './publish-wails-release.mjs'

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'wails-release-test-'))
const repository = 'greypan/mono'
const version = '1.2.3'
const mergeSha = 'a'.repeat(40)
const runId = '12345'
const tag = 'interweave-v' + version
const marker = ownershipMarker({ repository, mergeSha, runId })
const expectedNames = [
  'interweave-' + version + '-macos-arm64.dmg',
  'interweave-' + version + '-windows-x64.exe',
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
    digest(contents[0]) + '  ' + expectedNames[0] + '\n' + digest(contents[1]) + '  ' + expectedNames[1] + '\n'
  )
}

function releaseAssetsFrom(directory, withDigests = false) {
  return expectedNames.map(name => {
    const contents = fs.readFileSync(path.join(directory, name))
    return {
      name,
      size: contents.length,
      state: 'uploaded',
      ...(withDigests ? { digest: 'sha256:' + digest(contents) } : {})
    }
  })
}

function fakeAdapter({ initialRelease, initialTag, failUpload = false, uploadFromDirectory, onGetRelease } = {}) {
  const releases = new Map(initialRelease ? [[tag, structuredClone(initialRelease)]] : [])
  const tags = new Map(initialTag ? [[tag, structuredClone(initialTag)]] : [])
  const remoteAssets = path.join(root, 'remote-' + Math.random().toString(16).slice(2))
  const calls = []
  let getCount = 0
  return {
    releases,
    tags,
    calls,
    async getRelease(name) {
      calls.push(['getRelease', name])
      getCount++
      if (onGetRelease) onGetRelease({ getCount, releases, tags })
      return releases.get(name) ? structuredClone(releases.get(name)) : null
    },
    async resolveTag(name) {
      calls.push(['resolveTag', name])
      return tags.get(name) ? structuredClone(tags.get(name)) : null
    },
    async createAnnotatedTag(name, sha) {
      calls.push(['createAnnotatedTag', name, sha])
      if (tags.has(name)) throw new Error('tag already exists')
      tags.set(name, { sha, annotated: true })
    },
    async deleteDraft(name) {
      calls.push(['deleteDraft', name])
      if (releases.get(name)?.draft !== true) throw new Error('not a draft')
      releases.delete(name)
    },
    async createDraft(value) {
      calls.push(['createDraft', value.tag])
      if (releases.has(value.tag)) throw new Error('release already exists')
      releases.set(value.tag, { draft: true, body: value.notes, assets: [] })
    },
    async uploadAssets(name, directory, names) {
      calls.push(['uploadAssets', name, [...names]])
      if (failUpload) throw new Error('simulated upload failure')
      const sourceDirectory = uploadFromDirectory ?? directory
      fs.mkdirSync(remoteAssets, { recursive: true })
      for (const asset of names) fs.copyFileSync(path.join(sourceDirectory, asset), path.join(remoteAssets, asset))
      releases.get(name).assets = releaseAssetsFrom(remoteAssets, true)
    },
    async downloadAssets(name, directory, names) {
      calls.push(['downloadAssets', name, [...names]])
      if (!releases.has(name)) throw new Error('release missing')
      fs.mkdirSync(directory, { recursive: true })
      for (const asset of names) fs.copyFileSync(path.join(remoteAssets, asset), path.join(directory, asset))
    },
    async publishDraft(name) {
      calls.push(['publishDraft', name])
      const release = releases.get(name)
      if (!release?.draft) throw new Error('not a draft')
      release.draft = false
    },
    seedRemote(directory, { withDigests = false } = {}) {
      fs.rmSync(remoteAssets, { recursive: true, force: true })
      fs.mkdirSync(remoteAssets, { recursive: true })
      for (const asset of fs.readdirSync(directory))
        fs.copyFileSync(path.join(directory, asset), path.join(remoteAssets, asset))
      if (releases.has(tag)) releases.get(tag).assets = releaseAssetsFrom(remoteAssets, withDigests)
    }
  }
}

function releaseOptions(assetsDirectory, adapter) {
  return { repository, version, mergeSha, runId, assetsDirectory, adapter }
}

try {
  const localAssets = path.join(root, 'local-assets')
  makeAssets(localAssets)
  assert.equal((await inspectReleaseDirectory(localAssets, version)).size, 3)

  // Prepare can inspect an existing published release without native artifacts; only a complete, correctly
  // tagged release skips the build.
  {
    const gh = fakeAdapter()
    const result = await inspectExistingWailsRelease({ repository, version, mergeSha, runId, adapter: gh })
    assert.deepEqual(result, { tag, skipBuild: false })
    assert.deepEqual(
      gh.calls.map(([name]) => name),
      ['getRelease', 'resolveTag']
    )
  }

  // A clean release creates the annotated tag first, creates an owned draft, uploads the complete asset set,
  // verifies the downloaded assets and checksums, and only then publishes.
  {
    const gh = fakeAdapter()
    const result = await publishWailsRelease(releaseOptions(localAssets, gh))
    assert.deepEqual(result, { tag, skipped: false, assets: 3 })
    assert.deepEqual(gh.tags.get(tag), { sha: mergeSha, annotated: true })
    assert.equal(gh.releases.get(tag).draft, false)
    assert.ok(gh.releases.get(tag).body.split('\n').includes(marker))
    assert.ok(
      gh.calls.findIndex(entry => entry[0] === 'createAnnotatedTag') <
        gh.calls.findIndex(entry => entry[0] === 'createDraft')
    )
    assert.ok(
      gh.calls.findIndex(entry => entry[0] === 'uploadAssets') <
        gh.calls.findIndex(entry => entry[0] === 'publishDraft')
    )
    assert.equal(
      gh.calls.some(entry => entry[0] === 'deleteDraft'),
      false
    )
  }

  // A complete published release at the expected annotated tag is idempotent and remains untouched.
  {
    const gh = fakeAdapter({
      initialRelease: {
        draft: false,
        body: 'previous published run',
        assets: expectedNames.map(name => ({ name, size: 3, state: 'uploaded' }))
      },
      initialTag: { sha: mergeSha, annotated: true }
    })
    gh.seedRemote(localAssets)
    const result = await publishWailsRelease(releaseOptions(localAssets, gh))
    assert.equal(result.skipped, true)
    assert.equal(
      gh.calls.some(entry => ['deleteDraft', 'createDraft', 'publishDraft'].includes(entry[0])),
      false
    )
  }

  // A complete published release is checked against its own API digests and checksums, never against a
  // nondeterministic local rebuild from a later retry. API digests avoid downloading the desktop binaries.
  {
    const publishedAssets = path.join(root, 'published-assets')
    makeAssets(publishedAssets, ['published dmg from first run', 'published exe from first run'])
    const gh = fakeAdapter({
      initialRelease: { draft: false, body: 'previous published run', assets: [] },
      initialTag: { sha: mergeSha, annotated: true }
    })
    gh.seedRemote(publishedAssets, { withDigests: true })
    const result = await publishWailsRelease(releaseOptions(localAssets, gh))
    assert.equal(result.skipped, true)
    assert.deepEqual(gh.calls.find(entry => entry[0] === 'downloadAssets')?.[2], ['checksums.txt'])
    assert.equal(
      gh.calls.some(entry => ['deleteDraft', 'uploadAssets', 'publishDraft'].includes(entry[0])),
      false
    )
  }

  // An API digest must also match the downloaded checksums file itself.
  {
    const gh = fakeAdapter({
      initialRelease: { draft: false, body: 'published', assets: [] },
      initialTag: { sha: mergeSha, annotated: true }
    })
    gh.seedRemote(localAssets, { withDigests: true })
    gh.releases.get(tag).assets.find(asset => asset.name === 'checksums.txt').digest = 'sha256:' + '0'.repeat(64)
    await assert.rejects(
      inspectExistingWailsRelease({ repository, version, mergeSha, runId, adapter: gh }),
      /checksums\.txt digest does not match/
    )
  }

  // Published assets without a completed upload state are incomplete even when bytes and digests exist.
  {
    const gh = fakeAdapter({
      initialRelease: { draft: false, body: 'published', assets: [] },
      initialTag: { sha: mergeSha, annotated: true }
    })
    gh.seedRemote(localAssets, { withDigests: true })
    delete gh.releases.get(tag).assets.find(asset => asset.name === expectedNames[1]).state
    await assert.rejects(
      inspectExistingWailsRelease({ repository, version, mergeSha, runId, adapter: gh }),
      /is not fully uploaded/
    )
  }

  // A published release with incomplete assets is a hard error and is never modified.
  {
    const gh = fakeAdapter({
      initialRelease: { draft: false, body: '', assets: [{ name: expectedNames[0], size: 3, state: 'uploaded' }] },
      initialTag: { sha: mergeSha, annotated: true }
    })
    await assert.rejects(publishWailsRelease(releaseOptions(localAssets, gh)), /exactly the three expected assets/)
    assert.equal(
      gh.calls.some(entry => ['deleteDraft', 'uploadAssets', 'publishDraft'].includes(entry[0])),
      false
    )
  }

  // Never create a missing tag to paper over an already existing release.
  {
    const gh = fakeAdapter({ initialRelease: { draft: true, body: marker, assets: [] } })
    await assert.rejects(
      publishWailsRelease(releaseOptions(localAssets, gh)),
      /release .* exists but its tag is missing/
    )
    assert.equal(
      gh.calls.some(entry => entry[0] === 'createAnnotatedTag'),
      false
    )
  }

  // A tag pointing elsewhere or a lightweight tag is not safe to reuse.
  for (const initialTag of [
    { sha: 'b'.repeat(40), annotated: true },
    { sha: mergeSha, annotated: false }
  ]) {
    const gh = fakeAdapter({ initialTag })
    await assert.rejects(publishWailsRelease(releaseOptions(localAssets, gh)), /points to|lightweight/)
    assert.equal(
      gh.calls.some(entry => entry[0] === 'createDraft'),
      false
    )
  }

  // Only a draft carrying this exact repository/SHA/run marker is automatically recoverable.
  {
    const foreign = fakeAdapter({
      initialRelease: {
        draft: true,
        body: '<!-- interweave-release repository=greypan/mono merge-sha=' + 'b'.repeat(40) + ' run-id=9 -->',
        assets: []
      },
      initialTag: { sha: mergeSha, annotated: true }
    })
    await assert.rejects(publishWailsRelease(releaseOptions(localAssets, foreign)), /not owned/)
    assert.equal(
      foreign.calls.some(entry => entry[0] === 'deleteDraft'),
      false
    )
  }

  // A draft owned by this exact run is deleted without deleting its annotated tag, then rebuilt from only
  // this run's artifacts and re-verified before publication.
  {
    const gh = fakeAdapter({
      initialRelease: {
        draft: true,
        body: 'title\n' + marker,
        assets: [{ name: 'old-partial.dmg', size: 2, state: 'uploaded' }]
      },
      initialTag: { sha: mergeSha, annotated: true }
    })
    const result = await publishWailsRelease(releaseOptions(localAssets, gh))
    assert.equal(result.skipped, false)
    assert.deepEqual(gh.tags.get(tag), { sha: mergeSha, annotated: true })
    assert.equal(gh.releases.get(tag).draft, false)
    assert.equal(gh.calls.filter(entry => entry[0] === 'deleteDraft').length, 1)
    assert.ok(
      gh.calls.findIndex(entry => entry[0] === 'deleteDraft') < gh.calls.findIndex(entry => entry[0] === 'createDraft')
    )
  }

  // Re-read before deletion catches a release that changed after the first observation.
  {
    const gh = fakeAdapter({
      initialRelease: { draft: true, body: marker, assets: [] },
      initialTag: { sha: mergeSha, annotated: true },
      onGetRelease: ({ getCount, releases }) => {
        if (getCount === 3) releases.get(tag).body = 'changed by another run'
      }
    })
    await assert.rejects(publishWailsRelease(releaseOptions(localAssets, gh)), /changed before recovery/)
    assert.equal(
      gh.calls.some(entry => entry[0] === 'deleteDraft'),
      false
    )
  }

  // A self-consistent but different uploaded asset set must fail the current-run digest comparison.
  {
    const otherAssets = path.join(root, 'other-assets')
    makeAssets(otherAssets, ['different self-consistent dmg', 'different self-consistent exe'])
    const gh = fakeAdapter({ uploadFromDirectory: otherAssets })
    await assert.rejects(
      publishWailsRelease(releaseOptions(localAssets, gh)),
      /uploaded checksums\.txt does not match this run local artifact/
    )
    assert.equal(gh.releases.get(tag).draft, true)
    assert.equal(
      gh.calls.some(entry => entry[0] === 'publishDraft'),
      false
    )
  }

  // Failed upload leaves a draft for safe same-run recovery and can never publish partial contents.
  {
    const gh = fakeAdapter({ failUpload: true })
    await assert.rejects(publishWailsRelease(releaseOptions(localAssets, gh)), /simulated upload failure/)
    assert.equal(gh.releases.get(tag).draft, true)
    assert.equal(
      gh.calls.some(entry => entry[0] === 'publishDraft'),
      false
    )
  }

  // Checksums are part of the publication boundary.
  {
    const malformed = path.join(root, 'bad-assets')
    makeAssets(malformed)
    fs.writeFileSync(path.join(malformed, 'checksums.txt'), '0'.repeat(64) + '  ' + expectedNames[0] + '\n')
    await assert.rejects(
      publishWailsRelease(releaseOptions(malformed, fakeAdapter())),
      /checksums.txt must list both|checksum mismatch/
    )
  }

  // Non-404 API errors remain fatal; only an explicit missing release can be treated as absent.
  {
    const forbidden = createGhWailsAdapter({
      repository,
      mergeSha,
      spawn: () => ({ status: 1, stdout: '', stderr: 'gh: HTTP 403: Resource not accessible by integration' })
    })
    await assert.rejects(async () => forbidden.getRelease(tag), /HTTP 403/)
    const absent = createGhWailsAdapter({
      repository,
      mergeSha,
      spawn: () => ({ status: 1, stdout: '', stderr: 'gh: HTTP 404: Not Found' })
    })
    assert.equal(await absent.getRelease(tag), null)
  }

  // Keep the existing release creation policy: GitHub generates release notes, and draft recovery never
  // deletes the protected tag or opts out of the default latest-release behavior.
  {
    const calls = []
    const gh = createGhWailsAdapter({
      repository,
      mergeSha,
      spawn: (command, args) => {
        calls.push([command, args])
        return { status: 0, stdout: '', stderr: '' }
      }
    })
    gh.createDraft({ tag, title: 'Interweave v' + version, notes: marker + '\n\nRelease note' })
    gh.uploadAssets(tag, localAssets, expectedNames)
    gh.deleteDraft(tag)
    const createArgs = calls[0][1]
    assert.ok(createArgs.includes('--generate-notes'))
    assert.ok(createArgs.includes('--draft'))
    assert.ok(createArgs.includes('--verify-tag'))
    assert.equal(createArgs.includes('--latest=false'), false)
    assert.equal(calls[1][1].includes('--clobber'), false)
    assert.equal(calls[2][1].includes('--cleanup-tag'), false)
  }

  console.log('.github/scripts/publish-wails-release.test.mjs: all assertions passed')
} finally {
  fs.rmSync(root, { recursive: true, force: true })
}
