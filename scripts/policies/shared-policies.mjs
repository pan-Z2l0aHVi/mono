import { commandConventions } from './command-conventions.mjs'
import { noMutualLinks } from './no-mutual-links.mjs'
import { readmeLocales } from './readme-locales.mjs'
import { turboCacheInvariant } from './turbo-cache-invariant.mjs'
import { turboInputPaths } from './turbo-input-paths.mjs'
import { webUiDocsInputs } from './web-ui-docs-inputs.mjs'

/**
 * `check-pre-commit` 与 `check-policy` 共用的 6 条本地/全仓策略插件：
 * 按代价与依赖面排序，由 `check-pre-commit` 组合成单条短路链，由 `check-policy` 逐项独立执行。
 */
export const sharedPolicies = [
  commandConventions,
  noMutualLinks,
  readmeLocales,
  turboCacheInvariant,
  turboInputPaths,
  webUiDocsInputs
]
