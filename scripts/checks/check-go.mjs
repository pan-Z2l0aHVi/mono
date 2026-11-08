import { defineCatch, defineRunner, getWorkspaceRoot } from '@greypan/monorepo-kit'

import { goCheck } from '../policies/go-check.mjs'

import { runCheck } from './run-check.mjs'

await runCheck(() =>
  defineRunner()
    .use(goCheck)
    .use(defineCatch())
    .make({ root: getWorkspaceRoot(import.meta.dirname), env: process.env })
)
