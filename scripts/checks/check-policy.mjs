import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

import { defineCatch, defineRunner, getWorkspaceRoot } from '@greypan/monorepo-kit'

import { changesetIgnoreCoverage } from '../policies/changeset-ignore-coverage.mjs'
import { fullCheckout } from '../policies/full-checkout.mjs'
import { interweaveTurboInputs } from '../policies/interweave-turbo-inputs.mjs'
import { sharedPolicies } from '../policies/shared-policies.mjs'
import { themeTokenParity } from '../policies/theme-token-parity.mjs'
import { workspaceDepBoundaries } from '../policies/workspace-dep-boundaries.mjs'

import { runCheck } from './run-check.mjs'

export const policyOnlyPolicies = [
  changesetIgnoreCoverage,
  interweaveTurboInputs,
  themeTokenParity,
  workspaceDepBoundaries
]

/**
 * 解析 `check-policy` 的命令行参数：过滤 pnpm 透传的字面 `--` 分隔符，仅接受 `--fail-fast`。
 *
 * @param {readonly string[]} argv
 * @returns {{ failFast: boolean }}
 */
export function parsePolicyOptions(argv) {
  let failFast = false
  for (const arg of argv.filter(item => item !== '--')) {
    if (arg === '--fail-fast') {
      failFast = true
      continue
    }
    throw new Error(`unexpected argument: ${arg}`)
  }
  return { failFast }
}

async function runSinglePolicy(policy, ctx) {
  try {
    return await defineRunner().use(policy).use(defineCatch()).make(ctx).run()
  } catch (error) {
    return {
      ok: false,
      error: `throw: ${error instanceof Error ? error.message : String(error)}`
    }
  }
}

/**
 * 先独立运行 `fullCheckout`（稀疏工作区失败即停），再逐项构造独立子链运行各政策插件；
 * 默认收集全部失败并以 `\n` 拼接为一个 `Err`，传入 `failFast: true` 时遇首错即停。
 *
 * @param {{
 *   ctx: { root: string, env: NodeJS.ProcessEnv },
 *   failFast?: boolean,
 *   fullCheckoutPolicy?: unknown,
 *   policies?: readonly unknown[]
 * }} options
 * @returns {Promise<{ ok: boolean, error?: string }>}
 */
export async function runPolicyChecks({
  ctx,
  failFast = false,
  fullCheckoutPolicy = fullCheckout,
  policies = [...sharedPolicies, ...policyOnlyPolicies]
}) {
  const checkoutResult = await runSinglePolicy(fullCheckoutPolicy, ctx)
  if (!checkoutResult.ok) return checkoutResult

  const errors = []
  for (const policy of policies) {
    const result = await runSinglePolicy(policy, ctx)
    if (result.ok) continue
    if (failFast) return result
    errors.push(result.error)
  }

  return errors.length > 0 ? { ok: false, error: errors.join('\n') } : { ok: true }
}

function isMain() {
  if (!process.argv[1]) return false
  try {
    return (
      pathToFileURL(fs.realpathSync(path.resolve(process.argv[1]))).href ===
      pathToFileURL(fs.realpathSync(fileURLToPath(import.meta.url))).href
    )
  } catch {
    return path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
  }
}

if (isMain()) {
  let options
  try {
    options = parsePolicyOptions(process.argv.slice(2))
  } catch (error) {
    process.stderr.write(`check-policy: ${error instanceof Error ? error.message : String(error)}\n`)
    process.exit(2)
  }

  await runCheck(() => {
    const ctx = { root: getWorkspaceRoot(import.meta.dirname), env: process.env }
    return {
      run: () => runPolicyChecks({ ctx, failFast: options.failFast })
    }
  })
}
