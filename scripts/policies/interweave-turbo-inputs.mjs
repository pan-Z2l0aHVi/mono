import { defineTurboInputs } from '@greypan/monorepo-kit'

/**
 * 前端构建从 Go 工具链恢复生成物，缓存键必须覆盖 Go 源码、绑定生成器与 mise pin，
 * 又不能被文档和 Go 测试文件污染。判据在包里的隔离 workspace 副本上跑 Turbo dry-run，
 * 这里只给本仓的包名、目录与输入清单。
 */
export const interweaveTurboInputs = defineTurboInputs({
  name: 'interweave-turbo-inputs',
  packageName: '@greypan/interweave-frontend',
  packageDir: 'apps/interweave/frontend',
  copiedFiles: [
    'turbo.json',
    'apps/interweave/frontend/turbo.json',
    'apps/interweave/go.mod',
    'apps/interweave/go.sum'
  ],
  requiredInputs: [
    {
      path: 'apps/interweave/backend/model.go',
      contents: 'package backend\n\ntype Model struct{}\n',
      label: 'Go production source',
      change: 'package backend\n\n// production change\ntype Model struct{}\n'
    },
    {
      path: 'apps/interweave/scripts/generate-bindings.mjs',
      contents: 'export const bindings = 1\n',
      label: 'bindings generator',
      change: 'export const bindings = 2\n'
    },
    {
      path: '.mise.toml',
      contents: '[tools]\nnode = "24"\n',
      label: 'mise toolchain pin',
      change: '[tools]\nnode = "24"\n# toolchain fixture change\n'
    }
  ],
  ignoredInputs: [
    {
      path: 'apps/interweave/frontend/README.md',
      contents: 'frontend documentation\n',
      label: 'Markdown',
      change: 'documentation-only edit\n'
    },
    {
      path: 'apps/interweave/backend/model_test.go',
      contents: 'package backend\n\n// test input\n',
      label: 'Go *_test.go files',
      change: 'package backend\n\n// test-only change\n'
    }
  ]
})
