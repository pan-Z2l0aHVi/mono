import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { afterAll, describe, it } from 'vite-plus/test'

import { defineCatch } from '../../runner/catch'
import { defineRunner } from '../../runner/runner'
import { defineWorkspaceDepBoundaries } from '../workspace-dep-boundaries'

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'greypan-dep-boundaries-'))
let fixture = 0

function makeFixture(): string {
  const root = path.join(tempRoot, `fixture-${fixture++}`)
  fs.mkdirSync(root, { recursive: true })
  return root
}

function writeManifest(
  root: string,
  directory: string,
  manifest: {
    name: string
    private?: boolean
    dependencies?: Record<string, string>
    optionalDependencies?: Record<string, string>
    peerDependencies?: Record<string, string>
    devDependencies?: Record<string, string>
  }
): void {
  const file = path.join(root, directory, 'package.json')
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, `${JSON.stringify(manifest, null, 2)}\n`)
}

const boundaries = defineWorkspaceDepBoundaries({
  workspaces: ['apps', 'packages'],
  applicationDirs: ['apps']
})

type DepBoundaries = ReturnType<typeof defineWorkspaceDepBoundaries>

function run(plugin: DepBoundaries, root: string) {
  return defineRunner().use(plugin).use(defineCatch()).make({ root, env: process.env }).run()
}

async function failure(plugin: DepBoundaries, root: string): Promise<string> {
  const result = await run(plugin, root)
  if (result.ok) assert.fail('expected workspace-dep-boundaries to fail')
  return result.error
}

describe('defineWorkspaceDepBoundaries', () => {
  it('allows a valid acyclic DAG, public devDependencies on private packages, app dependencies on packages, and external npm packages', async () => {
    const root = makeFixture()

    writeManifest(root, 'packages/tsconfig', {
      name: '@acme/tsconfig',
      private: true,
      dependencies: {
        '@tsconfig/node24': '^24.0.0'
      }
    })
    writeManifest(root, 'packages/core', {
      name: '@acme/core',
      dependencies: {
        remeda: '^2.0.0'
      },
      devDependencies: {
        '@acme/tsconfig': 'workspace:*',
        'vite-plus': '1.5.0'
      }
    })
    writeManifest(root, 'packages/test-kit', {
      name: '@acme/test-kit',
      private: true,
      dependencies: {
        '@acme/core': 'workspace:*'
      },
      devDependencies: {
        '@acme/tsconfig': 'workspace:*'
      }
    })
    writeManifest(root, 'packages/ui', {
      name: '@acme/ui',
      dependencies: {
        '@acme/core': 'workspace:*',
        lit: '^3.0.0'
      },
      peerDependencies: {
        vue: '>=3.5'
      },
      optionalDependencies: {
        '@floating-ui/dom': '^1.8.0'
      },
      devDependencies: {
        '@acme/test-kit': 'workspace:*',
        '@acme/tsconfig': 'workspace:*'
      }
    })
    writeManifest(root, 'apps/demo', {
      name: '@acme/demo',
      private: true,
      dependencies: {
        '@acme/core': 'workspace:*',
        '@acme/ui': 'workspace:*'
      },
      devDependencies: {
        '@acme/test-kit': 'workspace:*',
        '@acme/tsconfig': 'workspace:*'
      }
    })
    writeManifest(root, 'apps/interweave', {
      name: '@acme/interweave',
      private: true,
      dependencies: {
        '@acme/interweave-frontend': 'workspace:*'
      }
    })
    writeManifest(root, 'apps/interweave/frontend', {
      name: '@acme/interweave-frontend',
      private: true,
      dependencies: {
        '@acme/core': 'workspace:*',
        '@acme/ui': 'workspace:*'
      },
      devDependencies: {
        '@acme/tsconfig': 'workspace:*'
      }
    })

    const result = await run(boundaries, root)
    assert.ok(result.ok)
  })

  it('rejects multi-node cycles and self-loops across all workspace dependency fields', async () => {
    const multiNode = makeFixture()
    writeManifest(multiNode, 'packages/a', {
      name: '@acme/a',
      dependencies: { '@acme/b': 'workspace:*' }
    })
    writeManifest(multiNode, 'packages/b', {
      name: '@acme/b',
      peerDependencies: { '@acme/c': 'workspace:*' }
    })
    writeManifest(multiNode, 'packages/c', {
      name: '@acme/c',
      devDependencies: { '@acme/a': 'workspace:*' }
    })

    const multiError = await failure(boundaries, multiNode)
    assert.equal(multiError, 'deps: circular workspace dependency: @acme/a -> @acme/b -> @acme/c -> @acme/a')

    const selfLoop = makeFixture()
    writeManifest(selfLoop, 'packages/self', {
      name: '@acme/self',
      optionalDependencies: { '@acme/self': 'workspace:*' }
    })

    const selfError = await failure(boundaries, selfLoop)
    assert.equal(selfError, 'deps: circular workspace dependency: @acme/self -> @acme/self')
  })

  it('rejects public packages depending on private workspace packages in dependencies, peerDependencies, or optionalDependencies', async () => {
    const root = makeFixture()
    writeManifest(root, 'packages/priv-dep', {
      name: '@acme/priv-dep',
      private: true
    })
    writeManifest(root, 'packages/priv-peer', {
      name: '@acme/priv-peer',
      private: true
    })
    writeManifest(root, 'packages/priv-opt', {
      name: '@acme/priv-opt',
      private: true
    })
    writeManifest(root, 'packages/priv-dev', {
      name: '@acme/priv-dev',
      private: true
    })
    writeManifest(root, 'packages/pub', {
      name: '@acme/pub',
      dependencies: { '@acme/priv-dep': 'workspace:*' },
      peerDependencies: { '@acme/priv-peer': 'workspace:*' },
      optionalDependencies: { '@acme/priv-opt': 'workspace:*' },
      devDependencies: { '@acme/priv-dev': 'workspace:*' }
    })

    const error = await failure(boundaries, root)
    assert.deepEqual(error.split('\n'), [
      'deps: public package @acme/pub cannot depend on private workspace package @acme/priv-dep in dependencies',
      'deps: public package @acme/pub cannot depend on private workspace package @acme/priv-opt in optionalDependencies',
      'deps: public package @acme/pub cannot depend on private workspace package @acme/priv-peer in peerDependencies'
    ])
  })

  it('rejects non-application workspaces depending on root-level or nested application workspaces in any dependency field', async () => {
    const root = makeFixture()
    writeManifest(root, 'apps/web-demo', {
      name: '@acme/web-demo',
      private: true
    })
    writeManifest(root, 'apps/interweave', {
      name: '@acme/interweave',
      private: true
    })
    writeManifest(root, 'apps/interweave/frontend', {
      name: '@acme/interweave-frontend',
      private: true
    })
    writeManifest(root, 'packages/shared-a', {
      name: '@acme/shared-a',
      private: true,
      dependencies: {
        '@acme/web-demo': 'workspace:*'
      }
    })
    writeManifest(root, 'packages/shared-b', {
      name: '@acme/shared-b',
      private: true,
      devDependencies: {
        '@acme/interweave-frontend': 'workspace:*'
      }
    })

    const error = await failure(boundaries, root)
    assert.deepEqual(error.split('\n'), [
      'deps: non-application workspace @acme/shared-a (packages/shared-a) cannot depend on application workspace @acme/web-demo (apps/web-demo) in dependencies',
      'deps: non-application workspace @acme/shared-b (packages/shared-b) cannot depend on application workspace @acme/interweave-frontend (apps/interweave/frontend) in devDependencies'
    ])
  })

  it('scans workspace containers whose direct directory is named build, coverage, or dist while still ignoring nested build artifacts', async () => {
    const root = makeFixture()
    writeManifest(root, 'apps/dist', {
      name: '@acme/dist-app',
      private: true
    })
    writeManifest(root, 'packages/build', {
      name: '@acme/build-pkg',
      private: true,
      dependencies: {
        '@acme/dist-app': 'workspace:*'
      }
    })
    writeManifest(root, 'packages/build/dist', {
      name: '@acme/ignored-nested-dist',
      private: true
    })

    const error = await failure(boundaries, root)
    assert.equal(
      error,
      'deps: non-application workspace @acme/build-pkg (packages/build) cannot depend on application workspace @acme/dist-app (apps/dist) in dependencies'
    )
  })

  it('reports duplicate workspace package names instead of silently overwriting earlier nodes', async () => {
    const root = makeFixture()
    writeManifest(root, 'packages/first', {
      name: '@acme/dup',
      private: true
    })
    writeManifest(root, 'packages/second', {
      name: '@acme/dup',
      private: true
    })
    writeManifest(root, 'packages/third', {
      name: '@acme/dup',
      private: true
    })

    const error = await failure(boundaries, root)
    assert.equal(error, 'deps: duplicate workspace package name "@acme/dup"')
  })

  it('fails closed when no workspace manifests are found', async () => {
    const empty = makeFixture()
    const error = await failure(boundaries, empty)
    assert.equal(error, 'deps: cannot run: workspace scan found 0 package.json manifests')
  })
})

afterAll(() => {
  fs.rmSync(tempRoot, { recursive: true, force: true })
})
