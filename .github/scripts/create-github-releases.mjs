import { spawnSync } from 'node:child_process'

import { createNpmRegistryLookup, loadReceipt, resolvePublishedReceiptPackages } from './npm-release-receipt.mjs'

function commandError(command, args, result) {
  if (result.error) return new Error(`could not start ${command}: ${result.error.message}`)
  const reason = result.signal ? `signal ${result.signal}` : `exit ${result.status}`
  const output = `${result.stderr ?? ''}\n${result.stdout ?? ''}`.trim()
  return new Error(`${command} ${args.join(' ')} failed (${reason}): ${output || 'no diagnostic output'}`)
}

function run(command, args, { spawn = spawnSync, env = process.env, cwd = process.cwd() } = {}) {
  const result = spawn(command, args, { encoding: 'utf8', env, cwd })
  if (result.status !== 0) throw commandError(command, args, result)
  return (result.stdout ?? '').trim()
}

function isHttp404(error) {
  return /\bHTTP\s+404\b|\b404\s+Not Found\b/i.test(error.message)
}

export function createNpmReleaseAdapter({
  repository,
  mergeSha,
  spawn = spawnSync,
  env = process.env,
  cwd = process.cwd()
}) {
  const api = endpoint => {
    const args = ['api', `repos/${repository}/${endpoint}`]
    const result = spawn('gh', args, { encoding: 'utf8', env, cwd })
    if (result.status !== 0) {
      const error = commandError('gh', args, result)
      if (isHttp404(error)) return null
      throw error
    }
    try {
      return JSON.parse(result.stdout)
    } catch (error) {
      throw new Error(`gh api returned invalid JSON for ${endpoint}: ${error.message}`)
    }
  }

  const resolveTag = tag => {
    const reference = api(`git/ref/tags/${encodeURIComponent(tag)}`)
    if (!reference) return null
    let object = reference.object
    const seen = new Set()
    while (object?.type === 'tag') {
      if (seen.has(object.sha)) throw new Error(`annotated tag ${tag} contains a cycle`)
      seen.add(object.sha)
      const tagObject = api(`git/tags/${object.sha}`)
      if (!tagObject) throw new Error(`annotated tag object ${object.sha} for ${tag} is missing`)
      object = tagObject.object
    }
    if (object?.type !== 'commit' || typeof object.sha !== 'string') {
      throw new Error(`tag ${tag} does not resolve to a commit`)
    }
    return object.sha
  }

  const findRelease = tag => api(`releases/tags/${encodeURIComponent(tag)}`)

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

export async function createReleasesForReceipt({
  receipt,
  repository,
  mergeSha,
  publishResult,
  lookupRegistry,
  adapter,
  log = console,
  retryDelays = [0, 1000, 2000, 4000],
  wait = delay => new Promise(resolve => setTimeout(resolve, delay))
}) {
  if (receipt.repository !== repository || receipt.mergeSha !== mergeSha) {
    throw new Error('receipt repository or merge SHA does not match the release request')
  }
  const { present } = await resolvePublishedReceiptPackages(receipt, {
    lookupRegistry,
    publishResult,
    retryDelays,
    wait,
    log
  })
  for (const { name, version, directory } of present) {
    const tag = `${name}@${version}`
    const release = await adapter.findRelease(tag)
    const targetSha = await adapter.resolveTag(tag)

    if (release) {
      if (!targetSha) throw new Error(`GitHub release ${tag} exists but its tag is missing`)
      if (targetSha !== mergeSha) {
        throw new Error(`GitHub release ${tag} tag points to ${targetSha}, expected ${mergeSha}`)
      }
      if (release.draft !== false) throw new Error(`GitHub release ${tag} is not published`)
      log.log(`Release ${tag} already targets ${mergeSha}; skipping.`)
      continue
    }

    if (targetSha && targetSha !== mergeSha) {
      throw new Error(`GitHub tag ${tag} points to ${targetSha}, expected ${mergeSha}`)
    }
    const npmUrl = `https://www.npmjs.com/package/${name}/v/${version}`
    const changelogUrl = `https://github.com/${repository}/blob/${mergeSha}/${directory}/CHANGELOG.md`
    const notes = `Published to npm: [${name}@${version}](${npmUrl}).\n\nSee [${directory}/CHANGELOG.md](${changelogUrl}) for release notes.`
    await adapter.createRelease({ tag, title: `${name} v${version}`, notes })

    const createdRelease = await adapter.findRelease(tag)
    const createdTarget = await adapter.resolveTag(tag)
    if (!createdRelease || createdRelease.draft !== false || createdTarget !== mergeSha) {
      throw new Error(`GitHub release ${tag} was created but did not verify at ${mergeSha}`)
    }
    log.log(`Created release ${tag} at ${mergeSha}.`)
  }
  return present
}

async function main() {
  const receiptPath = process.env.RECEIPT_PATH
  const repository = process.env.GITHUB_REPOSITORY
  const mergeSha = process.env.MERGE_SHA
  const publishResult = process.env.PUBLISH_RESULT
  if (!receiptPath || !repository || !mergeSha || !publishResult) {
    throw new Error('RECEIPT_PATH, GITHUB_REPOSITORY, MERGE_SHA, and PUBLISH_RESULT are required')
  }
  const receipt = await loadReceipt(receiptPath, {
    root: process.cwd(),
    repository,
    mergeSha,
    runId: process.env.GITHUB_RUN_ID
  })
  await createReleasesForReceipt({
    receipt,
    repository,
    mergeSha,
    publishResult,
    lookupRegistry: createNpmRegistryLookup(),
    adapter: createNpmReleaseAdapter({ repository, mergeSha })
  })
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error(error.message)
    process.exitCode = 1
  })
}
