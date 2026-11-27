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
