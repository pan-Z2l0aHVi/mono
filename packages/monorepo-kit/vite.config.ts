import { resolve } from 'node:path'

import type { UserConfig } from 'vite-plus'

export default {
  resolve: {
    tsconfigPaths: true
  },
  pack: {
    entry: {
      index: resolve(import.meta.dirname, 'src/index.ts'),
      // 键写成 `vite/index`：unbundle 下产物落点由键决定（写成 `vite` 会得到 `dist/vite.js`），
      // 而 `exports["./vite"]` 指向 `dist/vite/index.js`。
      'vite/index': resolve(import.meta.dirname, 'src/vite/index.ts')
    },
    // 产物与源码树一一对应：unbundle 让 dist 下的栈帧落回具体模块，而不是一个整包文件。
    unbundle: true,
    root: resolve(import.meta.dirname, 'src'),
    // pack 在 node 平台默认输出 `.mjs` / `.d.mts`，而 exports 指向 `.js` / `.d.ts`。
    fixedExtension: false,
    sourcemap: true,
    dts: {
      sourcemap: true
    },
    tsconfig: './tsconfig.app.json'
  }
} satisfies UserConfig
