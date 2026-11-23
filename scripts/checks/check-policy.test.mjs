import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import path from 'node:path'

import { parsePolicyOptions, runPolicyChecks } from './check-policy.mjs'
import { runCheck } from './run-check.mjs'

const ctx = { root: '/policy-test-root', env: {} }

function makeMockPolicy(name, trace, outcome) {
  return {
    make: incoming => {
      trace.push(name)
      if (outcome.type === 'make-throw') throw new Error(outcome.message)
      return {
        ...incoming,
        run: async () => {
          if (outcome.type === 'ok') return { ok: true }
          if (outcome.type === 'err') return { ok: false, error: outcome.error }
          throw new Error(outcome.message)
        }
      }
    }
  }
}

// 1. fullCheckout 失败即停：即使默认全量收集，稀疏工作区门禁失败后也不继续跑任何 policy。
{
  const trace = []
  const result = await runPolicyChecks({
    ctx,
    failFast: false,
    fullCheckoutPolicy: makeMockPolicy('fullCheckout', trace, {
      type: 'err',
      error: 'git: sparse checkout active'
    }),
    policies: [
      makeMockPolicy('first', trace, { type: 'err', error: 'turbo: should not run' }),
      makeMockPolicy('second', trace, { type: 'ok' })
    ]
  })
  assert.deepEqual(result, { ok: false, error: 'git: sparse checkout active' })
  assert.deepEqual(trace, ['fullCheckout'])
}

// 2. 默认全量收集多 Err：经独立子链跑完所有 policy，并将全部 Err 以 \n 拼接为一个 Err 交由 runCheck 输出。
{
  const trace = []
  const fullCheckoutPolicy = makeMockPolicy('fullCheckout', trace, { type: 'ok' })
  const policies = [
    makeMockPolicy('p1', trace, { type: 'ok' }),
    makeMockPolicy('p2', trace, { type: 'err', error: 'turbo: broken inputs' }),
    makeMockPolicy('p3', trace, { type: 'ok' }),
    makeMockPolicy('p4', trace, { type: 'err', error: 'deps: cycle\ndeps: private' })
  ]

  const result = await runPolicyChecks({ ctx, fullCheckoutPolicy, policies })
  assert.deepEqual(result, {
    ok: false,
    error: 'turbo: broken inputs\ndeps: cycle\ndeps: private'
  })
  assert.deepEqual(trace, ['fullCheckout', 'p1', 'p2', 'p3', 'p4'])

  const stderrLines = []
  const originalWrite = process.stderr.write.bind(process.stderr)
  const originalExitCode = process.exitCode
  process.stderr.write = chunk => {
    stderrLines.push(String(chunk))
    return true
  }
  try {
    await runCheck(() => ({
      run: () => runPolicyChecks({ ctx, fullCheckoutPolicy, policies: policies.slice(1) })
    }))
    assert.equal(process.exitCode, 1)
    assert.deepEqual(stderrLines, ['turbo: broken inputs\ndeps: cycle\ndeps: private\n'])
  } finally {
    process.stderr.write = originalWrite
    process.exitCode = originalExitCode
  }
}

// 3. --fail-fast 提前停止：过滤 pnpm 透传的字面 '--' 分隔符后解析参数，遇首错立即中止后续 policy。
{
  assert.deepEqual(parsePolicyOptions([]), { failFast: false })
  assert.deepEqual(parsePolicyOptions(['--']), { failFast: false })
  assert.deepEqual(parsePolicyOptions(['--', '--fail-fast']), { failFast: true })

  const trace = []
  const result = await runPolicyChecks({
    ctx,
    failFast: parsePolicyOptions(['--', '--fail-fast']).failFast,
    fullCheckoutPolicy: makeMockPolicy('fullCheckout', trace, { type: 'ok' }),
    policies: [
      makeMockPolicy('p1', trace, { type: 'ok' }),
      makeMockPolicy('p2', trace, { type: 'err', error: 'theme: token mismatch' }),
      makeMockPolicy('p3', trace, { type: 'err', error: 'deps: should not run' })
    ]
  })
  assert.deepEqual(result, { ok: false, error: 'theme: token mismatch' })
  assert.deepEqual(trace, ['fullCheckout', 'p1', 'p2'])
}

// 4. .make() 同步抛错收敛：单条政策装配期抛错记为 `throw: <msg>`，不中断后续全量收集。
{
  const trace = []
  const result = await runPolicyChecks({
    ctx,
    failFast: false,
    fullCheckoutPolicy: makeMockPolicy('fullCheckout', trace, { type: 'ok' }),
    policies: [
      makeMockPolicy('p1', trace, { type: 'make-throw', message: 'missing turbo.json' }),
      makeMockPolicy('p2', trace, { type: 'err', error: 'deps: invalid edge' }),
      makeMockPolicy('p3', trace, { type: 'run-throw', message: 'async boom' })
    ]
  })
  assert.deepEqual(result, {
    ok: false,
    error: 'throw: missing turbo.json\ndeps: invalid edge\nthrow: async boom'
  })
  assert.deepEqual(trace, ['fullCheckout', 'p1', 'p2', 'p3'])
}

// 5. 未知 flag 报错：解析器显式抛错，CLI 入口非零退出（exit 2）并输出错误定位。
{
  assert.throws(() => parsePolicyOptions(['--unknown']), /unexpected argument: --unknown/)
  assert.throws(() => parsePolicyOptions(['--', '--bogus']), /unexpected argument: --bogus/)

  const cliPath = path.join(import.meta.dirname, 'check-policy.mjs')
  const run = spawnSync(process.execPath, [cliPath, '--', '--unknown'], { encoding: 'utf8' })
  assert.equal(run.status, 2)
  assert.match(run.stderr, /^check-policy: unexpected argument: --unknown\n$/)
}

console.log('scripts/checks/check-policy.test.mjs: all assertions passed')
