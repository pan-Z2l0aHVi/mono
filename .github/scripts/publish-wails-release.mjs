import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFile, readdir, stat } from 'node:fs/promises'
import path from 'node:path'

import { createGitHubApi, run } from './lib/github.mjs'

function expectedAssets(version) {
  return [`interweave-${version}-macos-arm64.dmg`, `interweave-${version}-windows-x64.exe`, 'checksums.txt']
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
    if (!match || parsed.has(match[2])) throw new Error(`invalid checksum entry: ${line}`)
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
    throw new Error(`release assets must contain exactly: ${expected.join(', ')}`)
  }

  const sizes = new Map()
  for (const name of expected) {
    const info = await stat(path.join(directory, name))
    if (!info.isFile() || info.size === 0) throw new Error(`release asset ${name} must be a non-empty file`)
    sizes.set(name, info.size)
  }

  const checksumContent = await readFile(path.join(directory, 'checksums.txt'), 'utf8')
  const checksums = parseChecksums(checksumContent, version)
  const digests = new Map([['checksums.txt', createHash('sha256').update(checksumContent).digest('hex')]])
  for (const name of expected.filter(asset => asset !== 'checksums.txt')) {
    const actual = await sha256(path.join(directory, name))
    if (actual !== checksums.get(name)) throw new Error(`checksum mismatch for ${name}`)
    digests.set(name, actual)
  }
  return { digests, sizes }
}

export function createGhWailsAdapter({
  repository,
  mergeSha,
  spawn = spawnSync,
  cwd = process.cwd(),
  env = process.env
}) {
  const gh = args => run('gh', args, { spawn, cwd, env })
  const github = createGitHubApi({ repository, spawn, cwd, env })
  const { resolveTag, getRelease } = github

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
    run('git', ['push', 'origin', `refs/tags/${tag}:refs/tags/${tag}`], { spawn, cwd, env })
  }

  const createRelease = ({ tag, title, assetsDirectory, names }) => {
    gh([
      'release',
      'create',
      tag,
      ...names.map(name => path.join(assetsDirectory, name)),
      '--repo',
      repository,
      '--target',
      mergeSha,
      '--verify-tag',
      '--title',
      title,
      '--generate-notes'
    ])
  }

  return { getRelease, resolveTag, createAnnotatedTag, createRelease }
}

function validateReleaseIdentity({ repository, version, mergeSha }) {
  if (!/^[^/]+\/[^/]+$/.test(repository ?? '')) throw new Error('repository must be owner/repository')
  if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(version ?? '')) throw new Error('version must be a semantic version')
  if (!/^[a-f\d]{40}$/i.test(mergeSha ?? '')) throw new Error('mergeSha must be a 40-character commit SHA')
}

function verifyReleaseAssets(release, tag, version, localAssets) {
  const expected = expectedAssets(version)
  const assets = Array.isArray(release.assets) ? release.assets : []
  const byName = new Map(assets.map(asset => [asset.name, asset]))
  if (assets.length !== expected.length || expected.some(name => !byName.has(name))) {
    throw new Error(`GitHub release ${tag} must have exactly the three expected assets`)
  }

  for (const name of expected) {
    const asset = byName.get(name)
    if (asset.state !== 'uploaded' || !(asset.size > 0)) {
      throw new Error(`GitHub release asset ${name} is not fully uploaded`)
    }
    if (asset.digest && !/^sha256:[a-f\d]{64}$/i.test(asset.digest)) {
      throw new Error(`GitHub release asset ${name} has an unsupported digest`)
    }
    if (asset.size !== localAssets.sizes.get(name)) {
      throw new Error(`GitHub release asset ${name} size does not match this run artifact`)
    }
    const digest = asset.digest?.slice('sha256:'.length).toLowerCase()
    if (digest && digest !== localAssets.digests.get(name)) {
      throw new Error(`GitHub release asset ${name} digest does not match this run artifact`)
    }
  }
}

export async function inspectExistingWailsRelease({ repository, version, mergeSha, adapter }) {
  validateReleaseIdentity({ repository, version, mergeSha })
  const tag = `interweave-v${version}`
  const release = await adapter.getRelease(tag)
  const tagState = await adapter.resolveTag(tag)

  if (release && !tagState) throw new Error(`GitHub release ${tag} exists but its tag is missing`)
  if (release) throw new Error(`GitHub release ${tag} already exists; refusing to modify it`)
  if (tagState && tagState.sha !== mergeSha) {
    throw new Error(`GitHub tag ${tag} points to ${tagState.sha}, expected ${mergeSha}`)
  }
  if (tagState && !tagState.annotated) throw new Error(`GitHub tag ${tag} is lightweight; an annotated tag is required`)
  return { tag }
}

export async function publishWailsRelease({ repository, version, mergeSha, assetsDirectory, adapter }) {
  validateReleaseIdentity({ repository, version, mergeSha })
  const localAssets = await inspectReleaseDirectory(assetsDirectory, version)
  const { tag } = await inspectExistingWailsRelease({ repository, version, mergeSha, adapter })

  let tagState = await adapter.resolveTag(tag)
  if (!tagState) {
    await adapter.createAnnotatedTag(tag, mergeSha)
    tagState = await adapter.resolveTag(tag)
  }
  if (!tagState || !tagState.annotated || tagState.sha !== mergeSha) {
    throw new Error(`annotated tag ${tag} does not point to ${mergeSha}`)
  }

  await adapter.createRelease({
    tag,
    title: `Interweave v${version}`,
    assetsDirectory,
    names: expectedAssets(version)
  })

  const release = await adapter.getRelease(tag)
  const publishedTag = await adapter.resolveTag(tag)
  if (
    !release ||
    release.draft !== false ||
    !publishedTag ||
    !publishedTag.annotated ||
    publishedTag.sha !== mergeSha
  ) {
    throw new Error(`GitHub release ${tag} did not publish at ${mergeSha}`)
  }
  verifyReleaseAssets(release, tag, version, localAssets)
  return { tag, assets: localAssets.digests.size }
}

async function main() {
  const command = process.argv[2] ?? 'publish'
  const repository = process.env.GITHUB_REPOSITORY
  const version = process.env.VERSION
  const mergeSha = process.env.MERGE_SHA
  const assetsDirectory = process.env.ASSETS_DIRECTORY ?? 'release-assets/publish'
  if (!repository || !version || !mergeSha) {
    throw new Error('GITHUB_REPOSITORY, VERSION, and MERGE_SHA are required')
  }
  const adapter = createGhWailsAdapter({ repository, mergeSha })
  if (command === 'inspect') {
    const result = await inspectExistingWailsRelease({ repository, version, mergeSha, adapter })
    console.log(`No conflicting release for ${result.tag} at ${mergeSha}`)
    return
  }
  if (command !== 'publish') throw new Error('usage: node publish-wails-release.mjs <inspect|publish>')
  const result = await publishWailsRelease({ repository, version, mergeSha, assetsDirectory, adapter })
  console.log(`Published ${result.tag} at ${mergeSha}`)
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error(error.message)
    process.exitCode = 1
  })
}
