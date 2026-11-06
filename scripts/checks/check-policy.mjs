import { defineCatch, defineRunner, getWorkspaceRoot } from '@greypan/monorepo-kit'

import { commandConventions } from '../policies/command-conventions.mjs'
import { fullCheckout } from '../policies/full-checkout.mjs'
import { interweaveTurboInputs } from '../policies/interweave-turbo-inputs.mjs'
import { noMutualLinks } from '../policies/no-mutual-links.mjs'
import { readmeLocales } from '../policies/readme-locales.mjs'
import { testPortCallSites } from '../policies/test-port-call-sites.mjs'
import { turboCacheInvariant } from '../policies/turbo-cache-invariant.mjs'
import { turboInputPaths } from '../policies/turbo-input-paths.mjs'
import { webUiDocsInputs } from '../policies/web-ui-docs-inputs.mjs'

// 触发层只排顺序：`.use()` 的先后就是判定的先后，首个 `Err` 短路，能力接线在插件内部。
// 这里的失败语义只有一条——stderr 一行 `Err` 文案加非零退出码；静默通过不产出任何证据。
const kit = defineRunner()
  .use(commandConventions)
  .use(fullCheckout)
  .use(interweaveTurboInputs)
  .use(noMutualLinks)
  .use(readmeLocales)
  .use(testPortCallSites)
  .use(turboCacheInvariant)
  .use(turboInputPaths)
  .use(webUiDocsInputs)
  .use(defineCatch())
  .make({ root: getWorkspaceRoot(import.meta.dirname), env: process.env })

const result = await kit.run()
if (!result.ok) {
  process.stderr.write(`${result.error}\n`)
  process.exitCode = 1
}
