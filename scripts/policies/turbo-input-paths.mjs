import { defineTurboInputPaths } from '@greypan/monorepo-kit'

/** 各 `turbo.json` 的 `$TURBO_ROOT$` 正模式输入必须命中文件；配置与条目全部从仓库配置派生，无需传参。 */
export const turboInputPaths = defineTurboInputPaths()
