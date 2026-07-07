import { resolve } from 'node:path'

import dts from 'vite-plugin-dts'
import { type UserConfig } from 'vite-plus'

export default {
  resolve: {
    tsconfigPaths: true
  },
  plugins: [
    dts({
      tsconfigPath: './tsconfig.app.json'
    })
  ],
  build: {
    sourcemap: true,
    lib: {
      entry: resolve(import.meta.dirname, 'src/index.ts'),
      fileName: 'index',
      formats: ['es']
    },
    rollupOptions: {
      external: [/^node:/, '@greypan/js-kit', 'unplugin']
    }
  }
} satisfies UserConfig
