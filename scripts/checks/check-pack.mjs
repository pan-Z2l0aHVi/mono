import { defineCatch, defineRunner, getWorkspaceRoot } from '@greypan/monorepo-kit'

import { packageContract } from '../policies/package-contract.mjs'

import { runCheck } from './run-check.mjs'

// 发布包契约：`pnpm pack --dry-run` 的实际产物必须与各自 `package.json` 的声明一致。
await runCheck(() =>
  defineRunner()
    .use(packageContract)
    .use(defineCatch())
    .make({ root: getWorkspaceRoot(import.meta.dirname), env: process.env })
)
