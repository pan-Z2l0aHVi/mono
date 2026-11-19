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
  },
  test: {
    // git 夹具（staged-clean / git-hooks-status / changeset-required）每个用例都要 spawn
    // 几十次 git 子进程，默认逐用例 5s 超时；与同包其它文件并行时会因 CPU 抢占超时，
    // 串行执行换取稳定。
    fileParallelism: false
  }
} satisfies UserConfig
