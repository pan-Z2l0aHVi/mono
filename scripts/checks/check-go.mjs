import { defineCatch, defineRunner, getWorkspaceRoot } from '@greypan/monorepo-kit'

import { goCheck } from '../policies/go-check.mjs'

const kit = defineRunner()
  .use(goCheck)
  .use(defineCatch())
  .make({ root: getWorkspaceRoot(import.meta.dirname), env: process.env })

const result = await kit.run()
if (!result.ok) {
  process.stderr.write(`${result.error}\n`)
  process.exitCode = 1
}
