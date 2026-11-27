# API

[English](./api.md) | 简体中文

`@greypan/deps-reload` 的完整配置参考与路径/扩展名匹配规则。

## 子路径导出

| 入口                           | 目标打包器 | 导出形式                  |
| ------------------------------ | ---------- | ------------------------- |
| `@greypan/deps-reload/vite`    | Vite       | 默认导出（`deps => ...`） |
| `@greypan/deps-reload/webpack` | Webpack    | 默认导出（`deps => ...`） |

## `depsReload(deps)`

创建对应打包器的插件实例。

| 参数   | 类型    | 说明                               |
| ------ | ------- | ---------------------------------- |
| `deps` | `Dep[]` | 待监听的本地包或链接依赖配置列表。 |

## `Dep`

```ts
export interface Dep {
  /** npm 包名，未提供 path 时用于定位 node_modules 路径 */
  name: string
  /** 本地包根目录，适用于 monorepo 或 npm link */
  path?: string
  /** 相对于包根目录的构建产物目录 */
  outputDir?: string
  /** 触发刷新的构建产物文件扩展名列表 */
  extensions?: string[]
}
```

| 属性         | 类型       | 默认值            | 说明                                                                  |
| ------------ | ---------- | ----------------- | --------------------------------------------------------------------- |
| `name`       | `string`   | -                 | 包名。省略 `path` 时按 `resolve('node_modules', name)` 解析包根目录。 |
| `path`       | `string`   | -                 | 本地包根目录（相对或绝对路径），适用于 monorepo 或 `npm link`。       |
| `outputDir`  | `string`   | `'dist'`          | 相对于包根目录的构建产物目录。                                        |
| `extensions` | `string[]` | `['.js', '.css']` | 在 Vite 中会触发整页刷新的文件扩展名。                                |

## 匹配与归一化规则

- **包根目录解析**：提供 `path` 时使用 `resolve(path)`；未提供时回退到 `resolve('node_modules', name)`。
- **路径比较**：路径分隔符统一为 `/`，去除末尾斜杠并按小写比较，避免配置大小写与文件系统返回不一致（如 `../Packages/Foo` 与 `packages/foo`）导致漏触发。
- **扩展名归一化**：自动去除首尾空白和多余前导点并转小写——`'mjs'`、`'.mjs'`、`' .MJS '` 均会归一化为 `'.mjs'`；空字符串会被过滤。
- **忽略 sourcemap**：在 Vite 中，所有以 `.map` 结尾的文件都会被跳过。

## 多包配置示例

```ts
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
```

```js
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
```
