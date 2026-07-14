import { unpluginWebComponents } from '@greypan/unplugin-web-components'
import { fullReload } from '@greypan/vite-plugin-full-reload'
import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import basicSsl from '@vitejs/plugin-basic-ssl'
import legacy from '@vitejs/plugin-legacy'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import { visualizer } from 'rollup-plugin-visualizer'
import { type PluginOption, searchForWorkspaceRoot, type UserConfig } from 'vite-plus'

export default {
  resolve: {
    tsconfigPaths: true
  },
  plugins: [
    tanstackRouter({
      target: 'react',
      autoCodeSplitting: true
    }),
    react(),
    babel({
      presets: [reactCompilerPreset()]
    }),
    unpluginWebComponents.vite({
      tagPrefix: 'web-ui',
      packageName: '@greypan/web-ui',
      sideEffects: true
    }) as PluginOption,
    fullReload.vite([
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
    basicSsl(),
    legacy({
      targets: ['defaults', 'not IE 11', 'Android >= 9', 'iOS >= 15']
    }),
    visualizer({
      filename: 'stats.html',
      gzipSize: true,
      brotliSize: true
    })
  ],
  test: {
    environment: 'jsdom'
  },
  build: {},
  css: {
    transformer: 'lightningcss'
  },
  server: {
    host: true,
    fs: {
      allow: [searchForWorkspaceRoot(process.cwd())]
    }
  }
} satisfies UserConfig
