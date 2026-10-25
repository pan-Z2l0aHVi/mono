import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import {
  createNpmReleaseAdapter,
  createReleasesForPackages,
  parsePackageReleases
} from './create-npm-github-releases.mjs'

const mergeSha = 'a'.repeat(40)
const repository = 'greypan/mono'
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'npm-release-'))
const packages = [
  { name: '@greypan/carry', version: '0.9.0', directory: 'packages/carry' },
  { name: '@greypan/alpha', version: '1.2.0', directory: 'packages/alpha' }
]
for (const item of packages) {
  const directory = path.join(root, item.directory)
  fs.mkdirSync(directory, { recursive: true })
  fs.writeFileSync(
    path.join(directory, 'package.json'),
    JSON.stringify({ name: item.name, version: item.version }, null, 2)
  )
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

const log = { log() {} }

try {
  {
    assert.deepEqual(await parsePackageReleases(JSON.stringify([packages[1]]), { root }), [packages[1]])
    await assert.rejects(parsePackageReleases('{broken', { root }), /package-releases is not valid JSON/)
    await assert.rejects(
      parsePackageReleases([{ ...packages[1], directory: 'packages/..' }], { root }),
      /packages\/<directory> path/
    )
    await assert.rejects(parsePackageReleases([packages[1], packages[1]], { root }), /duplicate package/)
    const manifest = path.join(root, packages[1].directory, 'package.json')
    fs.writeFileSync(manifest, JSON.stringify({ name: packages[1].name, version: '1.2.1' }))
    await assert.rejects(parsePackageReleases([packages[1]], { root }), /does not match public manifest/)
    fs.writeFileSync(manifest, JSON.stringify({ name: packages[1].name, version: packages[1].version, private: true }))
    await assert.rejects(parsePackageReleases([packages[1]], { root }), /does not match public manifest/)
    fs.writeFileSync(manifest, JSON.stringify({ name: packages[1].name, version: packages[1].version }))
  }

  {
    const gh = adapter()
    const selectedByVersionDiff = [packages[1]]
    const result = await createReleasesForPackages({
      packages: JSON.stringify(selectedByVersionDiff),
      root,
      repository,
      mergeSha,
      adapter: gh,
      log
    })
    assert.deepEqual(result, selectedByVersionDiff)
    assert.deepEqual(
      gh.created.map(({ tag }) => tag),
      ['@greypan/alpha@1.2.0']
    )
    assert.match(gh.created[0].notes, /packages\/alpha\/CHANGELOG\.md/)
  }

  {
    const tag = '@greypan/alpha@1.2.0'
    const gh = adapter({ [tag]: { draft: false, targetSha: mergeSha } })
    await createReleasesForPackages({
      packages: [packages[1]],
      root,
      repository,
      mergeSha,
      adapter: gh,
      log
    })
    assert.deepEqual(gh.created, [])
  }

  {
    const tag = '@greypan/alpha@1.2.0'
    const gh = adapter()
    gh.tags.set(tag, 'b'.repeat(40))
    await assert.rejects(
      createReleasesForPackages({
        packages: [packages[1]],
        root,
        repository,
        mergeSha,
        adapter: gh,
        log
      }),
      /tag .*expected/
    )
    assert.deepEqual(gh.created, [])
  }

  {
    const calls = []
    const spawn = (_command, args) => {
      calls.push(args)
      if (args[0] === 'api') {
        return { status: 1, stdout: '', stderr: 'gh: HTTP 403: Resource not accessible by integration' }
      }
      return { status: 0, stdout: '', stderr: '' }
    }
    const gh = createNpmReleaseAdapter({ repository, mergeSha, spawn })
    assert.throws(() => gh.findRelease('@greypan/alpha@1.2.0'), /HTTP 403/)
    assert.deepEqual(calls[0], ['api', 'repos/greypan/mono/releases/tags/%40greypan%2Falpha%401.2.0'])
  }

  {
    const calls = []
    const spawn = (_command, args) => {
      calls.push(args)
      if (args[0] === 'api') {
        return { status: 1, stdout: '', stderr: 'gh: HTTP 404: Not Found' }
      }
      return { status: 0, stdout: '', stderr: '' }
    }
    const gh = createNpmReleaseAdapter({ repository, mergeSha, spawn })
    await gh.createRelease({ tag: '@greypan/alpha@1.2.0', title: 'alpha v1.2.0', notes: 'release' })
    const args = calls.find(entry => entry[0] === 'release')
    assert.ok(args.includes('--target'))
    assert.ok(args.includes(mergeSha))
    assert.ok(args.includes('--latest=false'))
    assert.ok(args.includes('--verify-tag') === false)
  }

  console.log('.github/scripts/create-npm-github-releases.test.mjs: all assertions passed')
} finally {
  fs.rmSync(root, { recursive: true, force: true })
}
