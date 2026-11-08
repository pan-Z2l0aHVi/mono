import { defineCatch, defineRunner, getWorkspaceRoot } from '@greypan/monorepo-kit'

import { contextCorpus } from '../policies/context-corpus.mjs'
import { fullCheckout } from '../policies/full-checkout.mjs'

import { runCheck } from './run-check.mjs'

// fullCheckout 排在语料判定之前：稀疏检出的工作区上语料只覆盖 cone 子集，那种「全部通过」是假绿。
await runCheck(() =>
  defineRunner()
    .use(fullCheckout)
    .use(contextCorpus)
    .use(defineCatch())
    .make({ root: getWorkspaceRoot(import.meta.dirname), env: process.env })
)
