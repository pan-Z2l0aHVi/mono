// vite.config.js
import depsReload from '@greypan/deps-reload/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [
    depsReload([
      {
        name: '@greypan/web-ui',
        path: '../../packages/web-ui',
        extensions: ['.js', '.css']
      },
      {
        name: '@greypan/doc-demo-kit',
        path: '../../packages/doc-demo-kit',
        extensions: ['.mjs']
      }
    ])
  ]
})
