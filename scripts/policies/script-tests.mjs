import { defineScriptTests } from '@greypan/monorepo-kit'

/** 全仓 tracked 的 `*.test.mjs`；包内测试是 `.spec.ts`，由 turbo 的 `test` 承担。 */
export const scriptTests = defineScriptTests()
