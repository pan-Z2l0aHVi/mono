import { resolve } from 'node:path'

import { defineConfig } from 'vite-plus'
import { playwright } from 'vite-plus/test/browser-playwright'

import { generateIcons } from './scripts/generate-icons'

export default defineConfig({
  resolve: {
    tsconfigPaths: true
  },
  pack: {
    entry: {
      'components/index': resolve(import.meta.dirname, 'src/components/index.ts'),
      'classes/style': resolve(import.meta.dirname, 'src/classes/style.css'),
      'icons/index': resolve(import.meta.dirname, 'src/icons/index.ts'),
      'vite/index': resolve(import.meta.dirname, 'src/vite/index.ts'),
      // `./types/*` 是对外类型入口，这些文件不在 JS 图里，必须显式列为入口才会产出 `.d.ts`。
      'types/iconify': resolve(import.meta.dirname, 'src/types/iconify.ts'),
      'types/react': resolve(import.meta.dirname, 'src/types/react.ts'),
      'types/utils': resolve(import.meta.dirname, 'src/types/utils.ts'),
      'types/vue': resolve(import.meta.dirname, 'src/types/vue.ts')
    },
    // 产物保持与源码树一一对应：`./components/*` 这类通配导出依赖这个目录结构。
    unbundle: true,
    root: resolve(import.meta.dirname, 'src'),
    platform: 'browser',
    // 与 package.json 的 `browserslist` 同一组下限。顶层 target 同时驱动 JS 语法降级和
    // CSS 的 lightningcss 前缀/特性降级，`classes/style.css` 因此与 Vite 管线逐字节一致。
    target: ['chrome111', 'edge111', 'safari16.4', 'ios16.4', 'firefox128'],
    css: {
      minify: true
    },
    sourcemap: true,
    dts: {
      // 顶层 sourcemap 会给 `.d.ts` 也写 sourceMappingURL，只有同时打开声明映射才不会
      // 留下指向不存在文件的引用。
      sourcemap: true
    },
    tsconfig: './tsconfig.app.json',
    deps: {
      // `types/iconify.ts` 只是 `export type *`，打包会让 rolldown 把依赖里的
      // `@iconify/types` 声明文件按 node_modules 路径写进产物。
      neverBundle: ['@iconify/types']
    },
    plugins: [
      {
        name: 'generate-icons',
        async buildStart() {
          const count = await generateIcons(import.meta.dirname)
          this.info(`generated ${count} icons`)
        }
      }
    ]
  },
  test: {
    // Vitest 5 把默认附件目录从 `.vitest-attachments` 改成 `.vitest/attachments`；
    // 仓库在 `.gitignore` 与 docs/agents 里把测试证据路径固定为前者，这里跟着钉住。
    attachmentsDir: '.vitest-attachments',
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
  // 测试与 dev server 仍走 Vite 的 CSS 管线（组件 `?inline` 样式在测试里要用同一套转换）。
  css: {
    transformer: 'lightningcss'
  }
})
