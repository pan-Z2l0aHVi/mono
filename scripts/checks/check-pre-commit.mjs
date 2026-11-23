import { defineCatch, defineRunner, getWorkspaceRoot } from '@greypan/monorepo-kit'

import { sharedPolicies } from '../policies/shared-policies.mjs'
import { stagedClean } from '../policies/staged-clean.mjs'

import { runCheck } from './run-check.mjs'

// 提交边界。stagedClean 排最后：它按暂存文件跑工具链，代价最高，前面的判定先拦住便宜的失效。
await runCheck(() =>
  sharedPolicies
    .reduce((chain, policy) => chain.use(policy), defineRunner())
    .use(stagedClean)
    .use(defineCatch())
    .make({ root: getWorkspaceRoot(import.meta.dirname), env: process.env })
)
