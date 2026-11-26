import { homedir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import depsReload from '@greypan/deps-reload/vite'
import { mdToMeta, type MdToMetaOptions } from '@greypan/md-to-meta'
import { devHttpsPlugin, testPorts } from '@greypan/monorepo-kit/vite'
import unpluginWebComponents from '@greypan/unplugin-web-components/vite'
import { webUiOptimizeDeps } from '@greypan/web-ui/vite'
import tailwindcss from '@tailwindcss/vite'
import legacy from '@vitejs/plugin-legacy'
import vue from '@vitejs/plugin-vue'
import autoImport from 'unplugin-auto-import/vite'
import { defineConfig, searchForWorkspaceRoot } from 'vite-plus'
import { playwright } from 'vite-plus/test/browser-playwright'
import { VueRouterAutoImports } from 'vue-router/unplugin'
import vueRouter from 'vue-router/vite'
import { wuchale } from 'wuchale/vite'

const devCertDir = process.env.GREYPAN_DEV_CERT_DIR ?? join(homedir(), '.config', 'greypan', 'dev-certs')
const DARK_SELECTOR = "web-ui-theme[resolved-appearance='dark']"

export const mdToMetaOptions: MdToMetaOptions = {
  input: '../../packages/js-kit/docs/*.md',
  output: 'src/generated/js-kit',
  exec: [],
  darkSelector: DARK_SELECTOR
}

export const mdToMetaAdditionalOptions: MdToMetaOptions[] = [
  {
    input: '../../packages/browser-kit/docs/*.md',
    output: 'src/generated/browser-kit',
    exec: [],
    darkSelector: DARK_SELECTOR
  },
  {
    input: '../../packages/js-kit/CHANGELOG.md',
    output: 'src/generated/changelog/js-kit',
    exec: [],
    darkSelector: DARK_SELECTOR
  },
  {
    input: '../../packages/browser-kit/CHANGELOG.md',
    output: 'src/generated/changelog/browser-kit',
    exec: [],
    darkSelector: DARK_SELECTOR
  },
  {
    input: '../../packages/js-kit/README*.md',
    output: 'src/generated/readme/js-kit',
    exec: [],
    darkSelector: DARK_SELECTOR
  },
  {
    input: '../../packages/browser-kit/README*.md',
    output: 'src/generated/readme/browser-kit',
    exec: [],
    darkSelector: DARK_SELECTOR
  }
]

export default defineConfig({
  resolve: {
    tsconfigPaths: true
  },
  optimizeDeps: {
    include: [...webUiOptimizeDeps]
  },
  build: {
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        historyNavSandbox: fileURLToPath(new URL('./sandbox/history-nav.html', import.meta.url))
      }
    }
  },
  test: {
    attachmentsDir: '.vitest-attachments',
    projects: [
      {
        extends: true,
        test: {
          name: 'jsdom',
          environment: 'jsdom',
          setupFiles: ['./test-helper.ts', './src/i18n/__tests__/setup.ts'],
          include: ['src/**/*.spec.ts'],
          exclude: ['src/**/*.browser.spec.ts']
        }
      },
      {
        extends: true,
        test: {
          name: 'browser',
          setupFiles: ['./src/i18n/__tests__/setup.ts'],
          include: ['src/**/*.browser.spec.ts'],
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
  plugins: [
    testPorts({ project: 'dev-kit-demo', testName: 'browser' }),
    wuchale({ configPath: fileURLToPath(new URL('./wuchale.config.js', import.meta.url)) }),
    mdToMeta(mdToMetaOptions),
    ...mdToMetaAdditionalOptions.map(mdToMeta),
    vueRouter({
      importMode: filepath => (/[/\\]pages[/\\]home(?:[/\\]|$)/.test(filepath) ? 'sync' : 'async')
    }),
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
      ignore: ['h'],
      exclude: [/sandbox[/\\]/, /node_modules/]
    }),
    unpluginWebComponents({
      tagPrefix: 'web-ui',
      packageName: '@greypan/web-ui',
      sideEffects: true
    }),
    depsReload([
      {
        name: '@greypan/app-scrollbars',
        path: '../../packages/app-scrollbars',
        extensions: ['.mjs', '.css']
      },
      {
        name: '@greypan/doc-demo-kit',
        path: '../../packages/doc-demo-kit',
        extensions: ['.mjs']
      },
      {
        name: '@greypan/route-progress',
        path: '../../packages/route-progress',
        extensions: ['.mjs']
      },
      {
        name: '@greypan/web-ui',
        path: '../../packages/web-ui'
      },
      {
        name: '@greypan/js-kit',
        path: '../../packages/js-kit'
      },
      {
        name: '@greypan/browser-kit',
        path: '../../packages/browser-kit'
      }
    ]),
    tailwindcss(),
    devHttpsPlugin({ certDir: devCertDir }),
    legacy({
      modernTargets: ['Chrome >=111', 'Edge >=111', 'Safari >=16.4', 'iOS >=16.4', 'Firefox >=128'],
      renderLegacyChunks: false,
      modernPolyfills: true
    })
  ],
  base: process.env.GITHUB_BASE_PATH || '/',
  css: {
    transformer: 'lightningcss'
  },
  server: {
    host: true,
    fs: {
      allow: [searchForWorkspaceRoot(process.cwd())]
    }
  }
})
