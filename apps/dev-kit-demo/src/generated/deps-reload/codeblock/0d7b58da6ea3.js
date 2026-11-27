import depsReload from '@greypan/deps-reload/vite'

depsReload([
  {
    name: '@greypan/app-scrollbars',
    path: '../../packages/app-scrollbars',
    extensions: ['.mjs', '.css']
  },
  {
    name: '@greypan/web-ui',
    path: '../../packages/web-ui',
    outputDir: 'dist',
    extensions: ['.js', '.css']
  },
  {
    // 解析为 node_modules/my-linked-lib/build
    name: 'my-linked-lib',
    outputDir: 'build'
  }
])
