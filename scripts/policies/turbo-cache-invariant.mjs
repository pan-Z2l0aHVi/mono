import { defineTurboCacheInvariant } from '@greypan/monorepo-kit'

/** 根 `turbo.json` 的缓存形状：test 依赖上游 build、build 恢复 dist、test 不把 dist 拉进 key。 */
export const turboCacheInvariant = defineTurboCacheInvariant()
