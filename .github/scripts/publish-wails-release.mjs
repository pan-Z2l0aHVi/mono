import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { appendFile, mkdtemp, readFile, readdir, rm, stat } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

function commandError(command, args, result) {
  if (result.error) return new Error('could not start ' + command + ': ' + result.error.message)
  const reason = result.signal ? 'signal ' + result.signal : 'exit ' + result.status
  const output = ((result.stderr ?? '') + '\n' + (result.stdout ?? '')).trim()
  return new Error(command + ' ' + args.join(' ') + ' failed (' + reason + '): ' + (output || 'no diagnostic output'))
}

function run(command, args, { spawn = spawnSync, cwd = process.cwd(), env = process.env } = {}) {
  const result = spawn(command, args, { encoding: 'utf8', cwd, env })
  if (result.status !== 0) throw commandError(command, args, result)
  return result.stdout ?? ''
}

function http404(error) {
  return /\bHTTP\s+404\b|\b404\s+Not Found\b/i.test(error.message)
}

export function ownershipMarker({ repository, mergeSha, runId }) {
  return '<!-- interweave-release repository=' + repository + ' merge-sha=' + mergeSha + ' run-id=' + runId + ' -->'
}

function expectedAssets(version) {
  return ['interweave-' + version + '-macos-arm64.dmg', 'interweave-' + version + '-windows-x64.exe', 'checksums.txt']
}

async function sha256(file) {
  return createHash('sha256')
    .update(await readFile(file))
    .digest('hex')
}

function parseChecksums(content, version) {
  const expected = expectedAssets(version).filter(name => name !== 'checksums.txt')
  const parsed = new Map()
  for (const line of content.trim().split(/\r?\n/)) {
    const match = line.match(/^([a-f\d]{64})\s+\*?([^/\\]+)$/i)
    if (!match || parsed.has(match[2])) throw new Error('invalid checksum entry: ' + line)
    parsed.set(match[2], match[1].toLowerCase())
  }
  if (parsed.size !== expected.length || expected.some(name => !parsed.has(name))) {
    throw new Error('checksums.txt must list both desktop binaries exactly once')
  }
  return parsed
}

export async function inspectReleaseDirectory(directory, version) {
  const expected = expectedAssets(version)
  const entries = (await readdir(directory)).sort()
  if (entries.length !== expected.length || expected.some(name => !entries.includes(name))) {
    throw new Error('release assets must contain exactly: ' + expected.join(', '))
  }
  for (const name of expected) {
    const info = await stat(path.join(directory, name))
    if (!info.isFile() || info.size === 0) throw new Error('release asset ' + name + ' must be a non-empty file')
  }
  const checksumContent = await readFile(path.join(directory, 'checksums.txt'), 'utf8')
  const checksums = parseChecksums(checksumContent, version)
  const digests = new Map([['checksums.txt', createHash('sha256').update(checksumContent).digest('hex')]])
  for (const name of expected.filter(asset => asset !== 'checksums.txt')) {
    const actual = await sha256(path.join(directory, name))
    if (actual !== checksums.get(name)) throw new Error('checksum mismatch for ' + name)
    digests.set(name, actual)
  }
  return digests
}

export function createGhWailsAdapter({
  repository,
  mergeSha,
  spawn = spawnSync,
  cwd = process.cwd(),
  env = process.env
}) {
  const gh = args => run('gh', args, { spawn, cwd, env })
  const api = endpoint => {
    const args = ['api', 'repos/' + repository + '/' + endpoint]
    const result = spawn('gh', args, { encoding: 'utf8', cwd, env })
    if (result.status !== 0) {
      const error = commandError('gh', args, result)
      if (http404(error)) return null
      throw error
    }
    try {
      return JSON.parse(result.stdout)
    } catch (error) {
      throw new Error('gh api returned invalid JSON for ' + endpoint + ': ' + error.message)
    }
  }

  const resolveTag = tag => {
    const reference = api('git/ref/tags/' + encodeURIComponent(tag))
    if (!reference) return null
    let object = reference.object
    const annotated = object?.type === 'tag'
    const seen = new Set()
    while (object?.type === 'tag') {
      if (seen.has(object.sha)) throw new Error('annotated tag ' + tag + ' contains a cycle')
      seen.add(object.sha)
      const tagObject = api('git/tags/' + object.sha)
      if (!tagObject) throw new Error('annotated tag object ' + object.sha + ' for ' + tag + ' is missing')
      object = tagObject.object
    }
    if (object?.type !== 'commit' || typeof object.sha !== 'string') {
      throw new Error('tag ' + tag + ' does not resolve to a commit')
    }
    return { sha: object.sha, annotated }
  }

  const getRelease = tag => api('releases/tags/' + encodeURIComponent(tag))

  const createAnnotatedTag = tag => {
    const title = tag.replace(/^interweave-v/, 'Interweave v')
    run(
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
        title,
        mergeSha
      ],
      { spawn, cwd, env }
    )
    run('git', ['push', 'origin', 'refs/tags/' + tag + ':refs/tags/' + tag], { spawn, cwd, env })
  }

  const createDraft = ({ tag, title, notes }) => {
    gh([
      'release',
      'create',
      tag,
      '--repo',
      repository,
      '--target',
      mergeSha,
      '--verify-tag',
      '--draft',
      '--title',
      title,
      '--generate-notes',
      '--notes',
      notes
    ])
  }

  const uploadAssets = (tag, directory, names) => {
    gh(['release', 'upload', tag, ...names.map(name => path.join(directory, name)), '--repo', repository])
  }

  const deleteDraft = tag => gh(['release', 'delete', tag, '--repo', repository, '--yes'])
  const publishDraft = tag => gh(['release', 'edit', tag, '--repo', repository, '--draft=false'])

  const downloadAssets = async (tag, directory, names) => {
    const args = ['release', 'download', tag, '--repo', repository, '--dir', directory]
    for (const name of names) args.push('--pattern', name)
    gh(args)
  }

  return {
    getRelease,
    resolveTag,
    createAnnotatedTag,
    createDraft,
    uploadAssets,
    deleteDraft,
    publishDraft,
    downloadAssets
  }
}

async function verifyReleaseAssets(adapter, tag, release, version, expectedDigests) {
  const expected = expectedAssets(version)
  const binaries = expected.filter(name => name !== 'checksums.txt')
  const assets = Array.isArray(release.assets) ? release.assets : []
  const byName = new Map(assets.map(asset => [asset.name, asset]))
  if (assets.length !== expected.length || expected.some(name => !byName.has(name))) {
    throw new Error('GitHub release ' + tag + ' must have exactly the three expected assets')
  }
  for (const name of expected) {
    const asset = byName.get(name)
    if (asset.state !== 'uploaded' || !(asset.size > 0)) {
      throw new Error('GitHub release asset ' + name + ' is not fully uploaded')
    }
    if (asset.digest && !/^sha256:[a-f\d]{64}$/i.test(asset.digest)) {
      throw new Error('GitHub release asset ' + name + ' has an unsupported digest')
    }
  }

  const downloadNames = ['checksums.txt', ...binaries.filter(name => !byName.get(name).digest)]
  const directory = await mkdtemp(path.join(os.tmpdir(), 'wails-release-'))
  try {
    await adapter.downloadAssets(tag, directory, downloadNames)
    const checksumPath = path.join(directory, 'checksums.txt')
    const checksumInfo = await stat(checksumPath)
    if (checksumInfo.size !== byName.get('checksums.txt').size) {
      throw new Error('downloaded checksums.txt size does not match GitHub release metadata')
    }
    const checksumContent = await readFile(checksumPath, 'utf8')
    const checksums = parseChecksums(checksumContent, version)
    const actualDigests = new Map([['checksums.txt', createHash('sha256').update(checksumContent).digest('hex')]])
    const checksumAssetDigest = byName.get('checksums.txt').digest?.slice('sha256:'.length).toLowerCase()
    if (checksumAssetDigest && checksumAssetDigest !== actualDigests.get('checksums.txt')) {
      throw new Error('release checksums.txt digest does not match its API content')
    }

    if (expectedDigests && actualDigests.get('checksums.txt') !== expectedDigests.get('checksums.txt')) {
      throw new Error('uploaded checksums.txt does not match this run local artifact')
    }

    for (const name of binaries) {
      const remoteDigest = byName.get(name).digest?.slice('sha256:'.length).toLowerCase()
      let actual = remoteDigest
      if (!actual) {
        const binaryPath = path.join(directory, name)
        const binaryInfo = await stat(binaryPath)
        if (binaryInfo.size !== byName.get(name).size) {
          throw new Error('downloaded ' + name + ' size does not match GitHub release metadata')
        }
        actual = await sha256(binaryPath)
      }
      if (checksums.get(name) !== actual) throw new Error('release checksum mismatch for ' + name)
      if (expectedDigests && expectedDigests.get(name) !== actual) {
        throw new Error('uploaded ' + name + ' does not match this run local artifact')
      }
      actualDigests.set(name, actual)
    }
    for (const name of expected) {
      const remoteDigest = byName.get(name).digest?.slice('sha256:'.length).toLowerCase()
      if (remoteDigest && remoteDigest !== actualDigests.get(name)) {
        throw new Error('release asset ' + name + ' digest does not match its verified content')
      }
      if (expectedDigests && remoteDigest && remoteDigest !== expectedDigests.get(name)) {
        throw new Error('uploaded ' + name + ' does not match this run local artifact')
      }
    }
    return actualDigests
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
}

function hasMarker(body, marker) {
  return String(body ?? '')
    .split(/\r?\n/)
    .includes(marker)
}

function validateReleaseIdentity({ repository, version, mergeSha, runId }) {
  if (!/^[^/]+\/[^/]+$/.test(repository ?? '')) throw new Error('repository must be owner/repository')
  if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(version ?? '')) throw new Error('version must be a semantic version')
  if (!/^[a-f\d]{40}$/i.test(mergeSha ?? '')) throw new Error('mergeSha must be a 40-character commit SHA')
  if (!/^\d+$/.test(String(runId ?? ''))) throw new Error('runId must be numeric')
}

export async function inspectExistingWailsRelease({ repository, version, mergeSha, runId, adapter }) {
  validateReleaseIdentity({ repository, version, mergeSha, runId })
  const tag = 'interweave-v' + version
  const marker = ownershipMarker({ repository, mergeSha, runId })
  const release = await adapter.getRelease(tag)
  const tagState = await adapter.resolveTag(tag)
  if (release && !tagState) throw new Error('GitHub release ' + tag + ' exists but its tag is missing')
  if (tagState && tagState.sha !== mergeSha) {
    throw new Error('GitHub tag ' + tag + ' points to ' + tagState.sha + ', expected ' + mergeSha)
  }
  if (tagState && !tagState.annotated)
    throw new Error('GitHub tag ' + tag + ' is lightweight; an annotated tag is required')

  if (release?.draft === false) {
    await verifyReleaseAssets(adapter, tag, release, version)
    return { tag, skipBuild: true }
  }
  if (release && (release.draft !== true || !hasMarker(release.body, marker))) {
    throw new Error('GitHub draft ' + tag + ' is not owned by this repository, merge SHA, and workflow run')
  }
  return { tag, skipBuild: false }
}

export async function publishWailsRelease({ repository, version, mergeSha, runId, assetsDirectory, adapter }) {
  validateReleaseIdentity({ repository, version, mergeSha, runId })
  const localDigests = await inspectReleaseDirectory(assetsDirectory, version)
  const tag = 'interweave-v' + version
  const marker = ownershipMarker({ repository, mergeSha, runId })
  const existing = await inspectExistingWailsRelease({ repository, version, mergeSha, runId, adapter })
  if (existing.skipBuild) return { tag, skipped: true, assets: localDigests.size }

  const releaseNotes = marker + '\n\nThe macOS and Windows artifacts are not yet signed for public distribution.'
  let release = await adapter.getRelease(tag)
  let tagState = await adapter.resolveTag(tag)

  if (release && !tagState) throw new Error('GitHub release ' + tag + ' exists but its tag is missing')
  if (tagState && tagState.sha !== mergeSha) {
    throw new Error('GitHub tag ' + tag + ' points to ' + tagState.sha + ', expected ' + mergeSha)
  }
  if (tagState && !tagState.annotated)
    throw new Error('GitHub tag ' + tag + ' is lightweight; an annotated tag is required')

  if (release && release.draft === false) {
    await verifyReleaseAssets(adapter, tag, release, version)
    return { tag, skipped: true, assets: localDigests.size }
  }

  if (release) {
    if (release.draft !== true || !hasMarker(release.body, marker)) {
      throw new Error('GitHub draft ' + tag + ' is not owned by this repository, merge SHA, and workflow run')
    }
    const currentRelease = await adapter.getRelease(tag)
    const currentTag = await adapter.resolveTag(tag)
    if (
      !currentRelease ||
      currentRelease.draft !== true ||
      !hasMarker(currentRelease.body, marker) ||
      !currentTag ||
      !currentTag.annotated ||
      currentTag.sha !== mergeSha
    ) {
      throw new Error('GitHub draft ' + tag + ' changed before recovery; refusing to delete it')
    }
    await adapter.deleteDraft(tag)
    if (await adapter.getRelease(tag)) throw new Error('GitHub draft ' + tag + ' still exists after deletion')
    tagState = await adapter.resolveTag(tag)
    if (!tagState || !tagState.annotated || tagState.sha !== mergeSha) {
      throw new Error('annotated tag ' + tag + ' did not survive draft deletion at ' + mergeSha)
    }
    release = null
  }

  if (!tagState) {
    await adapter.createAnnotatedTag(tag, mergeSha)
    tagState = await adapter.resolveTag(tag)
    if (!tagState || !tagState.annotated || tagState.sha !== mergeSha) {
      throw new Error('annotated tag ' + tag + ' was not created at ' + mergeSha)
    }
  }

  await adapter.createDraft({
    tag,
    title: 'Interweave v' + version,
    notes: releaseNotes
  })
  const createdDraft = await adapter.getRelease(tag)
  const createdTag = await adapter.resolveTag(tag)
  if (!createdDraft || createdDraft.draft !== true || !hasMarker(createdDraft.body, marker)) {
    throw new Error('GitHub draft ' + tag + ' was not created with this run ownership marker')
  }
  if (!createdTag || !createdTag.annotated || createdTag.sha !== mergeSha) {
    throw new Error('GitHub draft ' + tag + ' does not have the expected annotated tag')
  }

  await adapter.uploadAssets(tag, assetsDirectory, expectedAssets(version))
  const uploadedDraft = await adapter.getRelease(tag)
  if (!uploadedDraft || uploadedDraft.draft !== true || !hasMarker(uploadedDraft.body, marker)) {
    throw new Error('GitHub draft ' + tag + ' changed during asset upload')
  }
  await verifyReleaseAssets(adapter, tag, uploadedDraft, version, localDigests)

  await adapter.publishDraft(tag)
  const published = await adapter.getRelease(tag)
  const publishedTag = await adapter.resolveTag(tag)
  if (
    !published ||
    published.draft !== false ||
    !publishedTag ||
    !publishedTag.annotated ||
    publishedTag.sha !== mergeSha
  ) {
    throw new Error('GitHub release ' + tag + ' did not publish at ' + mergeSha)
  }
  await verifyReleaseAssets(adapter, tag, published, version, localDigests)
  return { tag, skipped: false, assets: localDigests.size }
}

async function main() {
  const command = process.argv[2] ?? 'publish'
  const repository = process.env.GITHUB_REPOSITORY
  const version = process.env.VERSION
  const mergeSha = process.env.MERGE_SHA
  const runId = process.env.GITHUB_RUN_ID
  const assetsDirectory = process.env.ASSETS_DIRECTORY ?? 'release-assets/publish'
  if (!repository || !version || !mergeSha || !runId) {
    throw new Error('GITHUB_REPOSITORY, VERSION, MERGE_SHA, and GITHUB_RUN_ID are required')
  }
  const adapter = createGhWailsAdapter({ repository, mergeSha })
  if (command === 'inspect') {
    const result = await inspectExistingWailsRelease({ repository, version, mergeSha, runId, adapter })
    if (!process.env.GITHUB_OUTPUT) throw new Error('GITHUB_OUTPUT is required for inspect mode')
    await appendFile(process.env.GITHUB_OUTPUT, 'skip-build=' + result.skipBuild + '\n')
    console.log(
      (result.skipBuild ? 'Verified existing' : 'No complete published release') + ' ' + result.tag + ' at ' + mergeSha
    )
    return
  }
  if (command !== 'publish') throw new Error('usage: node publish-wails-release.mjs <inspect|publish>')
  const result = await publishWailsRelease({ repository, version, mergeSha, runId, assetsDirectory, adapter })
  console.log((result.skipped ? 'Verified existing' : 'Published') + ' ' + result.tag + ' at ' + mergeSha)
}

if (import.meta.url === 'file://' + process.argv[1]) {
  main().catch(error => {
    console.error(error.message)
    process.exitCode = 1
  })
}
