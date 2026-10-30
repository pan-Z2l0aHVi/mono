import { defineReadmeLocales } from '@greypan/monorepo-kit'

/**
 * 发布包的 README 译文面：`README.CN.md` 必填。扫描时整棵跳过依赖、产物与夹具目录，
 * 它们要么不是本仓源码，要么不是给读者看的入口。
 */
export const readmeLocales = defineReadmeLocales({
  locales: ['CN'],
  skippedDirectories: ['node_modules', 'dist', '__tests__']
})
