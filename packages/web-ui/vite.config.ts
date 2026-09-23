import { resolve } from 'node:path'

import dts from 'vite-plugin-dts'
import type { Plugin, UserConfig } from 'vite-plus'
import { playwright } from 'vite-plus/test/browser-playwright'

import { generateIcons } from './scripts/generate-icons'

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
  optimizeDeps: {
    // workspace 依赖未构建（fresh clone）时 dep scan 会失败并跳过预打包；
    // expect-type 是 browser 运行时当前已知唯一的 CJS 依赖，必须显式预打包，
    // 否则浏览器直接加载裸 CJS 报 "does not provide an export named 'expectTypeOf'" 并挂起。
    // vitest 仅由 vite-plus 间接提供，需要从 vite-plus 上下文逐级解析。
    include: ['vite-plus > vitest > expect-type']
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
            provider: playwright({
              launchOptions: {
                // 逐像素比对要求文本光栅化跨平台可复现：文本进入合成层后会丢掉 LCD
                // 子像素 AA（编辑层的 textarea 就会），与主层文本产生平台相关的边缘差，
                // CI 上曾表现为两层 5365 像素、最大通道差 102 的错位。强制灰度 AA 让
                // 两层一致；Chromium 自己的表单控件跨平台像素测试
                // （content/browser/form_controls_browsertest.cc）采用同样处理。
                args: ['--disable-lcd-text']
              }
            }),
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
