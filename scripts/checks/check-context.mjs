import { defineCatch, defineRunner, getWorkspaceRoot } from '@greypan/monorepo-kit'

import { contextCorpus } from '../policies/context-corpus.mjs'
import { fullCheckout } from '../policies/full-checkout.mjs'

// fullCheckout 排在语料判定之前：稀疏检出的工作区上语料只覆盖 cone 子集，那种「全部通过」是假绿。
const kit = defineRunner()
  .use(fullCheckout)
  .use(contextCorpus)
  .use(defineCatch())
  .make({ root: getWorkspaceRoot(import.meta.dirname), env: process.env })

const result = await kit.run()
if (!result.ok) {
  process.stderr.write(`${result.error}\n`)
  process.exitCode = 1
}
