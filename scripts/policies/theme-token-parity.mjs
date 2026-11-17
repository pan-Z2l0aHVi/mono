import { defineThemeTokenParity } from '@greypan/monorepo-kit'

/**
 * 静止档 scrollbar 颜色 token 的权威值在 `@greypan/web-ui` 的 theme 里；`@greypan/app-scrollbars`
 * 刻意不依赖 web-ui，回退值只能写成字面量，与 theme 浅色分支的 `--wui-scrollbar-handle` 必须同值，
 * 且本包不得自行声明同名 token。文件与变量名是本仓事实，判据在包里。
 */
export const themeTokenParity = defineThemeTokenParity({
  consumerFile: 'packages/app-scrollbars/src/style.css',
  consumerVar: 'os-handle-bg',
  authorityFile: 'packages/web-ui/src/components/theme/style.css',
  authorityVar: 'wui-scrollbar-handle',
  authorityBlock: /:host\(\[appearance='light'\]\)[\s\S]*?\{([\s\S]*?)\}/
})
