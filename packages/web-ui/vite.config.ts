import { resolve } from 'node:path'

import dts from 'vite-plugin-dts'
import type { Plugin, UserConfig } from 'vite-plus'
import { playwright } from 'vite-plus/test/browser-playwright'

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
    projects: [
      {
        extends: true,
        test: {
          name: 'jsdom',
          environment: 'jsdom',
          setupFiles: ['./test-helper.ts'],
          include: ['src/**/*.spec.ts'],
          exclude: ['src/**/*.browser.spec.ts']
        }
      },
      {
        extends: true,
        test: {
          name: 'browser',
          include: ['src/**/*.browser.spec.ts'],
          exclude: ['src/**/reduced-motion.browser.spec.ts'],
          browser: {
            enabled: true,
            headless: true,
            screenshotFailures: true,
            provider: playwright(),
            instances: [{ browser: 'chromium' }]
          }
        }
      },
      {
        extends: true,
        test: {
          name: 'browser-reduced-motion',
          include: ['src/**/reduced-motion.browser.spec.ts'],
          browser: {
            enabled: true,
            headless: true,
            screenshotFailures: true,
            provider: playwright({ contextOptions: { reducedMotion: 'reduce' } }),
            instances: [{ browser: 'chromium' }]
          }
        }
      }
    ]
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
