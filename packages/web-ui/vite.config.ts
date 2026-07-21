import { resolve } from 'node:path'

import dts from 'vite-plugin-dts'
import type { Plugin, UserConfig } from 'vite-plus'

import { generateIcons } from './scripts/generate-icons'

/** 构建时自动生成图标模块 */
function iconsPlugin(): Plugin {
  return {
    name: 'generate-icons',
    async buildStart() {
      const count = await generateIcons(import.meta.dirname)
      this.info(`generated ${count} icons`)
    }
  }
}

export default {
  resolve: {
    tsconfigPaths: true
  },
  plugins: [
    iconsPlugin(),
    dts({
      tsconfigPath: './tsconfig.app.json',
      include: ['src/components/**/*', 'src/icons/**/*', 'src/types/**/*']
    })
  ],
  test: {
    environment: 'jsdom'
  },
  css: {
    transformer: 'lightningcss'
  },
  build: {
    sourcemap: true,
    lib: {
      entry: {
        'components/index': resolve(import.meta.dirname, 'src/components/index.ts'),
        'icons/index': resolve(import.meta.dirname, 'src/icons/index.ts')
      },
      formats: ['es']
    },
    rollupOptions: {
      external: [
        /^@greypan\//,

        /^lit($|\/)/,
        /^@lit($|\/)/,

        /^react($|\/)/,
        /^react-dom($|\/)/,

        /^vue($|\/)/
      ],
      output: {
        preserveModules: true,
        // 指定源码根目录，这样 dist 下就不会多出一层 'src' 目录
        preserveModulesRoot: 'src',
        dir: 'dist',
        entryFileNames: '[name].js'
      }
    }
  }
} satisfies UserConfig
