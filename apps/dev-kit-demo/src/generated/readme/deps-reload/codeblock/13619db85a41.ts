// vite.config.ts
import depsReload from '@greypan/deps-reload/vite'

export default defineConfig({
  plugins: [
    depsReload([
      {
        name: '@greypan/web-ui',
        path: '../../packages/web-ui',
        extensions: ['.js', '.css']
      }
    ])
  ]
})
