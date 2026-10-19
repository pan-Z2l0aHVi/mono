import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import {
  createNpmRegistryLookup,
  createReceipt,
  discoverPublicPackages,
  loadReceipt,
  resolvePublishedReceiptPackages,
  validateReceipt,
  writeReceipt
} from './npm-release-receipt.mjs'

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'npm-release-receipt-'))
const identity = { repository: 'greypan/mono', mergeSha: 'a'.repeat(40), runId: '12345' }
const packages = {
  alpha: { name: '@greypan/alpha', version: '1.2.0' },
  beta: { name: '@greypan/beta', version: '2.3.0' },
  carry: { name: '@greypan/carry', version: '0.9.0' },
  internal: { name: '@greypan/internal', version: '1.0.0', private: true }
}

function putPackage(directory, manifest) {
  const target = path.join(root, 'packages', directory)
  fs.mkdirSync(target, { recursive: true })
  fs.writeFileSync(path.join(target, 'package.json'), JSON.stringify(manifest))
}

for (const [directory, manifest] of Object.entries(packages)) putPackage(directory, manifest)

try {
  assert.deepEqual(
    (await discoverPublicPackages(root)).map(({ name }) => name),
    ['@greypan/alpha', '@greypan/beta', '@greypan/carry']
  )

  // Alpha could be in the release PR diff, but the exact version already exists. It must not be attributed
  // to this merge SHA. Carry is unchanged by the PR and absent from npm, so it remains in the receipt.
  const receipt = await createReceipt({
    root,
    ...identity,
    lookupRegistry: async (name, version) => {
      assert.equal(version, packages[name.split('/').at(-1)].version)
      return name !== '@greypan/carry'
    }
  })
  assert.deepEqual(
    receipt.packages.map(({ name }) => name),
    ['@greypan/carry']
  )

  const receiptPath = path.join(root, 'receipt', 'npm-release-receipt.json')
  await writeReceipt(receiptPath, receipt)
  assert.deepEqual(await loadReceipt(receiptPath, { root, ...identity }), receipt)
  await assert.rejects(writeReceipt(receiptPath, receipt), /EEXIST/)
  await assert.rejects(validateReceipt(receipt, { root, ...identity, mergeSha: 'b'.repeat(40) }), /mergeSha mismatch/)
  await assert.rejects(validateReceipt(receipt, { root, ...identity, repository: 'other/mono' }), /repository mismatch/)
  await assert.rejects(validateReceipt(receipt, { root, ...identity, runId: '12346' }), /runId mismatch/)

  const staleManifestReceipt = structuredClone(receipt)
  staleManifestReceipt.packages[0].version = '0.8.0'
  await assert.rejects(
    validateReceipt(staleManifestReceipt, { root, ...identity }),
    /no longer matches public manifest/
  )
  const privateReceipt = {
    ...receipt,
    packages: [{ name: '@greypan/internal', version: '1.0.0', directory: 'packages/internal' }]
  }
  await assert.rejects(validateReceipt(privateReceipt, { root, ...identity }), /no longer matches public manifest/)

  let lookupCalls = 0
  const published = await resolvePublishedReceiptPackages(receipt, {
    publishResult: 'success',
    retryDelays: [0, 0, 0],
    wait: async () => {},
    lookupRegistry: async () => ++lookupCalls === 3
  })
  assert.equal(lookupCalls, 3, 'registry 404 gets a bounded retry before the version is accepted')
  assert.deepEqual(
    published.present.map(({ name }) => name),
    ['@greypan/carry']
  )

  await assert.rejects(
    resolvePublishedReceiptPackages(receipt, {
      publishResult: 'success',
      retryDelays: [0, 0],
      wait: async () => {},
      lookupRegistry: async () => false
    }),
    /publish job result is success.*still absent/
  )
  const partial = await resolvePublishedReceiptPackages(
    {
      ...receipt,
      packages: [...receipt.packages, { name: '@greypan/alpha', version: '1.2.0', directory: 'packages/alpha' }]
    },
    {
      publishResult: 'failure',
      retryDelays: [0],
      wait: async () => {},
      lookupRegistry: async name => name === '@greypan/carry'
    }
  )
  assert.deepEqual(
    partial.present.map(({ name }) => name),
    ['@greypan/carry']
  )
  assert.deepEqual(
    partial.missing.map(({ name }) => name),
    ['@greypan/alpha']
  )
  await assert.rejects(
    resolvePublishedReceiptPackages(receipt, {
      publishResult: 'skipped',
      retryDelays: [0],
      wait: async () => {},
      lookupRegistry: async () => false
    }),
    /publish job result is skipped/
  )

  const lookup404 = createNpmRegistryLookup({
    spawn: () => ({ status: 1, stdout: '', stderr: 'npm error code E404\nNot Found' })
  })
  assert.equal(await lookup404('@greypan/alpha', '1.2.0'), false)
  let lookupCommand
  let lookupArgs
  const lookupFound = createNpmRegistryLookup({
    spawn: (command, args) => {
      lookupCommand = command
      lookupArgs = args
      return { status: 0, stdout: '"1.2.0"\n', stderr: '' }
    }
  })
  assert.equal(await lookupFound('@greypan/alpha', '1.2.0'), true)
  assert.equal(lookupCommand, 'npm')
  assert.ok(lookupArgs.includes('@greypan/alpha@1.2.0'), 'registry lookup must query the exact package version')
  assert.ok(
    lookupArgs.includes('--registry=https://registry.npmjs.org'),
    'registry lookups must use npmjs.com explicitly'
  )
  const lookupNetworkFailure = createNpmRegistryLookup({
    spawn: () => ({ status: 1, stdout: '', stderr: 'ECONNRESET' })
  })
  await assert.rejects(lookupNetworkFailure('@greypan/alpha', '1.2.0'), /ECONNRESET/)
  const lookupSpawnFailure = createNpmRegistryLookup({ spawn: () => ({ error: new Error('ENOENT'), status: null }) })
  await assert.rejects(lookupSpawnFailure('@greypan/alpha', '1.2.0'), /ENOENT/)

  console.log('.github/scripts/npm-release-receipt.test.mjs: all assertions passed')
} finally {
  fs.rmSync(root, { recursive: true, force: true })
}
