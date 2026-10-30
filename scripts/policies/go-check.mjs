import { defineGoCheck } from '@greypan/monorepo-kit'

/** 全仓 Go 修复入口；格式化失败时用它提示下一步。 */
export const goCheck = defineGoCheck({ fixCommand: 'pnpm run fix-go' })
