import { spawnSync } from 'node:child_process'
import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

const schemaVersion = 1

function requiredIdentity(repository, mergeSha, runId) {
  if (typeof repository !== 'string' || !/^[^/]+\/[^/]+$/.test(repository)) {
    throw new Error('GITHUB_REPOSITORY must be owner/repository')
  }
  if (typeof mergeSha !== 'string' || !/^[0-9a-f]{40}$/i.test(mergeSha)) {
    throw new Error('MERGE_SHA must be a 40-character commit SHA')
  }
  if (typeof runId !== 'string' || !/^\d+$/.test(runId)) {
    throw new Error('GITHUB_RUN_ID must be a numeric workflow run id')
  }
}

export async function discoverPublicPackages(root) {
  const packagesRoot = path.join(root, 'packages')
  const entries = await readdir(packagesRoot, { withFileTypes: true })
  const packages = []
  for (const entry of entries.filter(item => item.isDirectory()).sort((a, b) => a.name.localeCompare(b.name))) {
    const directory = `packages/${entry.name}`
    const manifestPath = path.join(root, directory, 'package.json')
    let manifest
    try {
      manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
    } catch (error) {
      if (error.code === 'ENOENT') continue
      throw new Error(`cannot read ${directory}/package.json: ${error.message}`)
    }
    if (manifest.private === true || typeof manifest.name !== 'string' || typeof manifest.version !== 'string') continue
    packages.push({ name: manifest.name, version: manifest.version, directory })
  }
  return packages
}

export function createNpmRegistryLookup({
  npm = 'npm',
  registry = 'https://registry.npmjs.org',
  env = process.env,
  spawn = spawnSync
} = {}) {
  return async (name, version) => {
    const result = spawn(npm, ['view', `${name}@${version}`, 'version', '--json', `--registry=${registry}`], {
      encoding: 'utf8',
      env
    })
    if (result.error) throw new Error(`could not start npm view for ${name}@${version}: ${result.error.message}`)
    if (result.status === 0) {
      const stdout = (result.stdout ?? '').trim()
      let value
      try {
        value = JSON.parse(stdout)
      } catch {
        value = stdout.replace(/^['"]|['"]$/g, '')
      }
      if (Array.isArray(value) && value.length === 1) value = value[0]
      if (value !== version) {
        throw new Error(`npm view returned ${JSON.stringify(value)} for ${name}@${version}`)
      }
      return true
    }
    const message = `${result.stderr ?? ''}\n${result.stdout ?? ''}`
    if (/\bE404\b|HTTP\s+404|404\s+Not Found/i.test(message)) return false
    const reason = result.signal ? `signal ${result.signal}` : `exit ${result.status}`
    throw new Error(`npm view failed for ${name}@${version} (${reason}): ${message.trim() || 'no diagnostic output'}`)
  }
}

export async function createReceipt({ root, repository, mergeSha, runId, lookupRegistry }) {
  requiredIdentity(repository, mergeSha, runId)
  if (typeof lookupRegistry !== 'function') throw new Error('lookupRegistry must be a function')
  const packages = []
  for (const candidate of await discoverPublicPackages(root)) {
    const exists = await lookupRegistry(candidate.name, candidate.version)
    if (!exists) packages.push(candidate)
  }
  return { schemaVersion, repository, mergeSha, runId, packages }
}

export async function validateReceipt(receipt, { root, repository, mergeSha, runId }) {
  requiredIdentity(repository, mergeSha, runId)
  if (!receipt || receipt.schemaVersion !== schemaVersion) throw new Error('receipt schemaVersion must be 1')
  if (receipt.repository !== repository) throw new Error(`receipt repository mismatch: ${receipt.repository}`)
  if (receipt.mergeSha !== mergeSha) throw new Error(`receipt mergeSha mismatch: ${receipt.mergeSha}`)
  if (String(receipt.runId) !== runId) throw new Error(`receipt runId mismatch: ${receipt.runId}`)
  if (!Array.isArray(receipt.packages)) throw new Error('receipt packages must be an array')

  const seen = new Set()
  for (const item of receipt.packages) {
    if (!item || typeof item.name !== 'string' || typeof item.version !== 'string') {
      throw new Error('receipt package entries must contain name and version strings')
    }
    if (typeof item.directory !== 'string' || !/^packages\/[^/]+$/.test(item.directory)) {
      throw new Error(`receipt package directory is invalid: ${item.directory}`)
    }
    const key = `${item.name}@${item.version}`
    if (seen.has(key)) throw new Error(`receipt contains duplicate package ${key}`)
    seen.add(key)
    const manifestPath = path.join(root, item.directory, 'package.json')
    let manifest
    try {
      manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
    } catch (error) {
      throw new Error(`cannot validate receipt manifest ${item.directory}/package.json: ${error.message}`)
    }
    if (manifest.private === true || manifest.name !== item.name || manifest.version !== item.version) {
      throw new Error(`receipt package no longer matches public manifest ${item.directory}/package.json`)
    }
  }
  return receipt
}

export async function loadReceipt(file, identity) {
  let receipt
  try {
    receipt = JSON.parse(await readFile(file, 'utf8'))
  } catch (error) {
    throw new Error(`cannot read npm release receipt ${file}: ${error.message}`)
  }
  return validateReceipt(receipt, identity)
}

export async function writeReceipt(file, receipt) {
  await mkdir(path.dirname(file), { recursive: true })
  await writeFile(file, `${JSON.stringify(receipt, null, 2)}\n`, { flag: 'wx' })
}

export async function resolvePublishedReceiptPackages(
  receipt,
  {
    lookupRegistry,
    publishResult,
    retryDelays = [0, 1000, 2000, 4000],
    wait = delay => new Promise(resolve => setTimeout(resolve, delay)),
    log = console
  }
) {
  const present = []
  const missing = []
  for (const item of receipt.packages) {
    let exists = false
    for (let attempt = 0; attempt < retryDelays.length; attempt++) {
      if (retryDelays[attempt] > 0) await wait(retryDelays[attempt])
      if (await lookupRegistry(item.name, item.version)) {
        exists = true
        break
      }
    }
    if (exists) {
      present.push(item)
      continue
    }
    missing.push(item)
    if (publishResult !== 'failure') {
      throw new Error(
        `npm publish job result is ${publishResult}; receipt version ${item.name}@${item.version} is still absent after registry retries`
      )
    }
    log.warn(`npm publish failed before ${item.name}@${item.version} appeared; leaving its GitHub release pending`)
  }
  return { present, missing }
}

async function main() {
  const [command, receiptPath] = process.argv.slice(2)
  if (!receiptPath || !['create', 'validate'].includes(command)) {
    throw new Error('usage: node npm-release-receipt.mjs <create|validate> <receipt-path>')
  }
  const identity = {
    repository: process.env.GITHUB_REPOSITORY,
    mergeSha: process.env.MERGE_SHA,
    runId: process.env.GITHUB_RUN_ID
  }
  if (command === 'create') {
    const receipt = await createReceipt({
      root: process.cwd(),
      ...identity,
      lookupRegistry: createNpmRegistryLookup()
    })
    await writeReceipt(receiptPath, receipt)
    console.log(`Recorded ${receipt.packages.length} public package version(s) absent from npm before publish`)
  } else {
    const receipt = await loadReceipt(receiptPath, { root: process.cwd(), ...identity })
    console.log(`Validated ${receipt.packages.length} npm receipt package(s)`)
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error(error.message)
    process.exitCode = 1
  })
}
