import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { afterAll, it } from 'vite-plus/test'

import { defineCatch } from '../../../runner/catch'
import { defineRunner } from '../../../runner/runner'
import { defineTurboCacheInvariant } from '../turbo-cache-invariant'

const turboCacheInvariant = defineTurboCacheInvariant()

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'greypan-turbo-invariant-'))
let fixture = 0

function config() {
  const root = path.join(tempRoot, `fixture-${fixture++}`)
  fs.mkdirSync(root, { recursive: true })
  return root
}

// 链尾带 defineCatch：turbo.json 缺失或不是合法 JSON 由 ctx.config 抛出，属于装配故障，
// 走 `throw: ` 而不是某个域名前缀。
function kit(root: string) {
  return defineRunner()
    .use(turboCacheInvariant)
    .use(defineCatch())
    .make({ root, env: { ...process.env } })
}

async function writeTurbo(root: string, turbo: unknown) {
  fs.writeFileSync(path.join(root, 'turbo.json'), JSON.stringify(turbo, null, 2) + '\n')
  return kit(root).run()
}

async function failure(turbo: unknown): Promise<string> {
  const result = await writeTurbo(config(), turbo)
  if (result.ok) assert.fail('expected turbo-cache-invariant to fail')
  return result.error
}

async function failureAt(root: string): Promise<string> {
  const result = await kit(root).run()
  if (result.ok) assert.fail('expected turbo-cache-invariant to fail')
  return result.error
}

async function fails(turbo: unknown, pattern: RegExp): Promise<void> {
  assert.match(await failure(turbo), pattern)
}

it('turbo-cache-invariant', async () => {
  const valid = {
    tasks: {
      test: { dependsOn: ['^build'], inputs: ['$TURBO_DEFAULT$', '!**/*.md'] },
      build: { outputs: ['dist/**', 'bin/**', '!bin/**'] }
    }
  }
  assert.ok((await writeTurbo(config(), valid)).ok)

  await fails({ tasks: { test: {}, build: { outputs: ['dist/**'] } } }, /^turbo: tasks\.test\.dependsOn is missing/)
  await fails(
    { tasks: { test: { dependsOn: ['build'] }, build: { outputs: ['dist/**'] } } },
    /^turbo: tasks\.test\.dependsOn must include "\^build"/
  )
  await fails({ tasks: { test: { dependsOn: ['^build'] }, build: {} } }, /^turbo: tasks\.build\.outputs is missing/)
  await fails(
    { tasks: { test: { dependsOn: ['^build'] }, build: { outputs: ['bin/**'] } } },
    /^turbo: tasks\.build\.outputs must include "dist\/\*\*"/
  )
  await fails(
    { tasks: { test: { dependsOn: ['^build'] }, build: { outputs: ['dist/**', '!dist/**'] } } },
    /^turbo: tasks\.build\.outputs: negative pattern "!dist\/\*\*" may exclude dist/
  )
  await fails(
    { tasks: { test: { dependsOn: ['^build'], inputs: ['dist/**'] }, build: { outputs: ['dist/**'] } } },
    /^turbo: tasks\.test\.inputs: positive pattern "dist\/\*\*" may include dist/
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
    /^turbo: tasks\.build\.outputs: unsupported pattern item/
  )

  // 配置读不出来时抛出，由链尾的 defineCatch 收敛成 `throw: `。
  const missing = config()
  assert.match(await failureAt(missing), /^throw: turbo\.json not found in /)

  const malformed = config()
  fs.writeFileSync(path.join(malformed, 'turbo.json'), '{ nope\n')
  assert.match(await failureAt(malformed), /^throw: cannot parse /)
})

afterAll(() => {
  fs.rmSync(tempRoot, { recursive: true, force: true })
})
