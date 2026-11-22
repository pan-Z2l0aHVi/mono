import { defineCatch, defineRunner, getWorkspaceRoot } from '@greypan/monorepo-kit'

import { commandConventions } from '../policies/command-conventions.mjs'
import { noMutualLinks } from '../policies/no-mutual-links.mjs'
import { readmeLocales } from '../policies/readme-locales.mjs'
import { stagedClean } from '../policies/staged-clean.mjs'
import { turboCacheInvariant } from '../policies/turbo-cache-invariant.mjs'
import { turboInputPaths } from '../policies/turbo-input-paths.mjs'
import { webUiDocsInputs } from '../policies/web-ui-docs-inputs.mjs'

import { runCheck } from './run-check.mjs'

// 提交边界。stagedClean 排最后：它按暂存文件跑工具链，代价最高，前面的判定先拦住便宜的失效。
await runCheck(() =>
  defineRunner()
    .use(commandConventions)
    .use(noMutualLinks)
    .use(readmeLocales)
    .use(turboCacheInvariant)
    .use(turboInputPaths)
    .use(webUiDocsInputs)
    .use(stagedClean)
    .use(defineCatch())
    .make({ root: getWorkspaceRoot(import.meta.dirname), env: process.env })
)
