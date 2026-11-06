import { defineCatch, defineRunner, getWorkspaceRoot } from '@greypan/monorepo-kit'

import { packageContract } from '../policies/package-contract.mjs'

// 发布包契约：`pnpm pack --dry-run` 的实际产物必须与各自 `package.json` 的声明一致。
const kit = defineRunner()
  .use(packageContract)
  .use(defineCatch())
  .make({ root: getWorkspaceRoot(import.meta.dirname), env: process.env })

const result = await kit.run()
if (!result.ok) {
  process.stderr.write(`${result.error}\n`)
  process.exitCode = 1
}
