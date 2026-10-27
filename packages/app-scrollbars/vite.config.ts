import type { UserConfig } from 'vite-plus'

export default {
  pack: {
    dts: true,
    // 样式由入口模块 `import './style.css'` 带入：保留这行 import，消费方导入本包就会拿到样式，
    // 不必再单独引用一个 CSS subpath。
    css: {
      inject: true
    }
  }
} satisfies UserConfig
