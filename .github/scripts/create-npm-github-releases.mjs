import { spawnSync } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import path from 'node:path'

import { createGitHubApi, run } from './lib/github.mjs'

export async function parsePackageReleases(value, { root = process.cwd() } = {}) {
  let packages
  try {
    packages = typeof value === 'string' ? JSON.parse(value) : value
  } catch (error) {
    throw new Error('package-releases is not valid JSON: ' + error.message)
  }
  if (!Array.isArray(packages)) throw new Error('package-releases must be a JSON array')

  const seenNames = new Set()
  for (const item of packages) {
    if (
      !item ||
      typeof item.name !== 'string' ||
      typeof item.version !== 'string' ||
      typeof item.directory !== 'string' ||
      !/^packages\/[^/]+$/.test(item.directory) ||
      ['.', '..'].includes(item.directory.slice('packages/'.length))
    ) {
      throw new Error('package-releases entries must contain a package name, version, and packages/<directory> path')
    }
    if (seenNames.has(item.name)) throw new Error(`package-releases contains duplicate package ${item.name}`)
    seenNames.add(item.name)

    let manifest
    try {
      manifest = JSON.parse(await readFile(path.join(root, item.directory, 'package.json'), 'utf8'))
    } catch (error) {
      throw new Error(`cannot validate ${item.directory}/package.json: ${error.message}`)
    }
    if (manifest.private === true || manifest.name !== item.name || manifest.version !== item.version) {
      throw new Error('package-releases entry does not match public manifest ' + item.directory + '/package.json')
    }
  }
  return packages
}

export function createNpmReleaseAdapter({
  repository,
  mergeSha,
  spawn = spawnSync,
  env = process.env,
  cwd = process.cwd()
}) {
  const github = createGitHubApi({ repository, spawn, env, cwd })

  const resolveTag = tag => github.resolveTag(tag)?.sha ?? null

  const findRelease = github.getRelease

  const createRelease = async ({ tag, title, notes }) => {
    const existingTarget = resolveTag(tag)
    if (existingTarget && existingTarget !== mergeSha) {
      throw new Error(`GitHub tag ${tag} points to ${existingTarget}, expected ${mergeSha}`)
    }
    const args = [
      'release',
      'create',
      tag,
      '--repo',
      repository,
      '--target',
      mergeSha,
      '--title',
      title,
      '--notes',
      notes,
      '--latest=false'
    ]
    if (existingTarget === mergeSha) args.push('--verify-tag')
    run('gh', args, { spawn, env, cwd })
  }

  return { findRelease, resolveTag, createRelease }
}

// publish job 成功即视为版本已发布；刻意不做 npm registry 回查与重试，取舍见 docs/agents/release.md「npm 发布重跑与 release notes」。
export async function createReleasesForPackages({
  packages,
  root = process.cwd(),
  repository,
  mergeSha,
  adapter,
  log = console
}) {
  if (typeof repository !== 'string' || !/^[^/]+\/[^/]+$/.test(repository)) {
    throw new Error('GITHUB_REPOSITORY must be owner/repository')
  }
  if (typeof mergeSha !== 'string' || !/^[0-9a-f]{40}$/i.test(mergeSha)) {
    throw new Error('MERGE_SHA must be a 40-character commit SHA')
  }
  const candidates = await parsePackageReleases(packages, { root })
  const published = []

  for (const candidate of candidates) {
    published.push(candidate)

    const tag = candidate.name + '@' + candidate.version
    const release = await adapter.findRelease(tag)
    const targetSha = await adapter.resolveTag(tag)

    if (release) {
      if (!targetSha) throw new Error('GitHub release ' + tag + ' exists but its tag is missing')
      if (targetSha !== mergeSha) {
        throw new Error('GitHub release ' + tag + ' tag points to ' + targetSha + ', expected ' + mergeSha)
      }
      if (release.draft !== false) throw new Error('GitHub release ' + tag + ' is not published')
      log.log('Release ' + tag + ' already targets ' + mergeSha + '; skipping.')
      continue
    }

    if (targetSha && targetSha !== mergeSha) {
      throw new Error('GitHub tag ' + tag + ' points to ' + targetSha + ', expected ' + mergeSha)
    }
    const npmUrl = `https://www.npmjs.com/package/${candidate.name}/v/${candidate.version}`
    const changelogUrl = `https://github.com/${repository}/blob/${mergeSha}/${candidate.directory}/CHANGELOG.md`
    const notes = `Published to npm: [${candidate.name}@${candidate.version}](${npmUrl}).\n\nSee [${candidate.directory}/CHANGELOG.md](${changelogUrl}) for release notes.`
    await adapter.createRelease({ tag, title: `${candidate.name} v${candidate.version}`, notes })

    const createdRelease = await adapter.findRelease(tag)
    const createdTarget = await adapter.resolveTag(tag)
    if (!createdRelease || createdRelease.draft !== false || createdTarget !== mergeSha) {
      throw new Error(`GitHub release ${tag} was created but did not verify at ${mergeSha}`)
    }
    log.log(`Created release ${tag} at ${mergeSha}.`)
  }
  return published
}

async function main() {
  const packageReleases = process.env.PACKAGE_RELEASES
  const repository = process.env.GITHUB_REPOSITORY
  const mergeSha = process.env.MERGE_SHA
  if (packageReleases === undefined || !repository || !mergeSha) {
    throw new Error('PACKAGE_RELEASES, GITHUB_REPOSITORY, and MERGE_SHA are required')
  }
  await createReleasesForPackages({
    packages: packageReleases,
    root: process.cwd(),
    repository,
    mergeSha,
    adapter: createNpmReleaseAdapter({ repository, mergeSha })
  })
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error(error.message)
    process.exitCode = 1
  })
}
