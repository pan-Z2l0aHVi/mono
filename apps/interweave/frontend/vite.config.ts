import depsReload from '@greypan/deps-reload/vite'
import unpluginWebComponents from '@greypan/unplugin-web-components/vite'
import { webUiOptimizeDeps } from '@greypan/web-ui/vite'
import tailwindcss from '@tailwindcss/vite'
import legacy from '@vitejs/plugin-legacy'
import vue from '@vitejs/plugin-vue'
import wails from '@wailsio/runtime/plugins/vite'
import autoImport from 'unplugin-auto-import/vite'
import { searchForWorkspaceRoot, type UserConfig } from 'vite-plus'
import { playwright } from 'vite-plus/test/browser-playwright'
import { VueRouterAutoImports } from 'vue-router/unplugin'
import vueRouter from 'vue-router/vite'

export default {
  resolve: {
    tsconfigPaths: true
  },
  optimizeDeps: {
    // file-based 路由把 `src/pages/**` 折进 `vue-router/vite` 生成的虚拟模块，依赖扫描器跟不进去，
    // 路由页经 `unplugin-web-components` 生成的组件导入就不可见。web-ui 的裸依赖由
    // `@greypan/web-ui/vite` 提供，跟随组件库自己的运行时依赖，不要在这里抄一份。
    include: [...webUiOptimizeDeps]
  },
  test: {
    /*
     * 两个 project 共用同一份 vite 配置（plugins / resolve）。
     *
     * jsdom 覆盖不了「右键重命名后焦点必须落到名称编辑器并全选」这条：它没有真实模态
     * `<dialog>`，合成事件的派发也不触发监听器之间的微任务检查点，而缺陷恰恰落在后者
     * （见 context-menu 的 `_onMenuItemActivation`）。所以这条交互放在 browser project，
     * 由真实输入驱动；其余 spec 仍在 jsdom。
     */
    setupFiles: ['./test-helper.ts'],
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
          // test-helper 补的是 jsdom 特有的 localStorage 漏洞，浏览器里有真实实现，不加载。
          setupFiles: [],
          browser: {
            enabled: true,
            headless: true,
            provider: playwright(),
            instances: [{ browser: 'chromium' }]
          }
        }
      }
    ]
  },
  server: {
    host: true,
    port: Number(process.env.WAILS_VITE_PORT) || 9245,
    strictPort: true,
    fs: {
      allow: [searchForWorkspaceRoot(process.cwd())]
    }
  },
  plugins: [
    vueRouter(),
    vue({
      template: {
        compilerOptions: {
          isCustomElement: tag => tag.startsWith('web-ui-') || tag.startsWith('WebUi')
        }
      }
    }),
    autoImport({
      dts: true,
      imports: ['vue', VueRouterAutoImports],
      ignore: ['h']
    }),
    wails('./bindings'),
    unpluginWebComponents({
      tagPrefix: 'web-ui',
      packageName: '@greypan/web-ui',
      sideEffects: true
    }),
    depsReload([
      { name: '@greypan/web-ui', path: '../../../packages/web-ui' },
      { name: '@greypan/js-kit', path: '../../../packages/js-kit' },
      { name: '@greypan/browser-kit', path: '../../../packages/browser-kit' }
    ]),
    tailwindcss(),
    legacy({
      modernTargets: ['Chrome >=111', 'Edge >=111', 'Safari >=16.4', 'iOS >=16.4', 'Firefox >=128'],
      renderLegacyChunks: false,
      modernPolyfills: true
    })
  ],
  css: {
    transformer: 'lightningcss'
  }
} satisfies UserConfig
