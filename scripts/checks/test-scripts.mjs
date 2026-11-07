import { defineCatch, defineRunner, getWorkspaceRoot } from '@greypan/monorepo-kit'

import { fullCheckout } from '../policies/full-checkout.mjs'
import { scriptTests } from '../policies/script-tests.mjs'

// fullCheckout 在前：稀疏检出下 `git ls-files` 只给出 cone 内的脚本，测试面会静默变窄。
const kit = defineRunner()
  .use(fullCheckout)
  .use(scriptTests)
  .use(defineCatch())
  .make({ root: getWorkspaceRoot(import.meta.dirname), env: process.env })

const result = await kit.run()
if (!result.ok) {
  process.stderr.write(`${result.error}\n`)
  process.exitCode = 1
}
