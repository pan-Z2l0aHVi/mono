import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { afterAll, it } from 'vite-plus/test'

import { run } from '../turbo-cache-invariant'

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'greypan-turbo-invariant-'))
let fixture = 0

function config() {
  const root = path.join(tempRoot, `fixture-${fixture++}`)
  fs.mkdirSync(root, { recursive: true })
  return root
}

function writeTurbo(root: string, turbo: unknown): Promise<string> {
  fs.writeFileSync(path.join(root, 'turbo.json'), JSON.stringify(turbo, null, 2) + '\n')
  return run({ root })
}

async function fails(turbo: unknown, pattern: RegExp): Promise<void> {
  await assert.rejects(writeTurbo(config(), turbo), pattern)
}

it('turbo-cache-invariant', async () => {
  const valid = {
    tasks: {
      test: { dependsOn: ['^build'], inputs: ['$TURBO_DEFAULT$', '!**/*.md'] },
      build: { outputs: ['dist/**', 'bin/**', '!bin/**'] }
    }
  }
  assert.match(await writeTurbo(config(), valid), /consistent/)

  await fails({ tasks: { test: {}, build: { outputs: ['dist/**'] } } }, /dependsOn is missing/)
  await fails({ tasks: { test: { dependsOn: ['build'] }, build: { outputs: ['dist/**'] } } }, /must include "\^build"/)
  await fails({ tasks: { test: { dependsOn: ['^build'] }, build: {} } }, /outputs is missing/)
  await fails(
    { tasks: { test: { dependsOn: ['^build'] }, build: { outputs: ['bin/**'] } } },
    /must include "dist\/\*\*"/
  )
  await fails(
    { tasks: { test: { dependsOn: ['^build'] }, build: { outputs: ['dist/**', '!dist/**'] } } },
    /negative pattern "!dist\/\*\*" may exclude dist/
  )
  await fails(
    { tasks: { test: { dependsOn: ['^build'], inputs: ['dist/**'] }, build: { outputs: ['dist/**'] } } },
    /positive pattern "dist\/\*\*" may include dist/
  )
  await fails(
    {
      tasks: {
        test: { dependsOn: ['^build'], inputs: ['$TURBO_DEFAULT$', '*/dist/**'] },
        build: { outputs: ['dist/**'] }
      }
    },
    /may include dist/
  )
  await fails(
    {
      tasks: {
        test: { dependsOn: ['^build'] },
        build: { outputs: ['{dist,bin}/**'] }
      }
    },
    /unsupported pattern item/
  )

  const missing = config()
  await assert.rejects(run({ root: missing }), /turbo.json not found/)

  const malformed = config()
  fs.writeFileSync(path.join(malformed, 'turbo.json'), '{ nope\n')
  await assert.rejects(run({ root: malformed }), /cannot parse/)
})

afterAll(() => {
  fs.rmSync(tempRoot, { recursive: true, force: true })
})
