import { resolve } from 'node:path'

import type { UserConfig } from 'vite-plus'

export default {
  resolve: {
    tsconfigPaths: true
  },
  pack: {
    entry: {
      index: resolve(import.meta.dirname, 'src/index.ts')
    },
    // 产物保持与源码树一一对应：exports 的 `./*` 通配依赖这个目录结构。
    unbundle: true,
    root: resolve(import.meta.dirname, 'src'),
    // pack 在 node 平台默认输出 `.mjs` / `.d.mts`，而 exports 指向 `.js` / `.d.ts`。
    fixedExtension: false,
    sourcemap: true,
    dts: {
      // 顶层 sourcemap 会给 `.d.ts` 也写 sourceMappingURL，只有同时打开声明映射才不会
      // 留下指向不存在文件的引用。
      sourcemap: true
    },
    tsconfig: './tsconfig.app.json'
  }
} satisfies UserConfig
