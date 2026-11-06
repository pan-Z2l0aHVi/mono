import fs from 'node:fs'
import path from 'node:path'

/** `pnpm-workspace.yaml` 所在目录就是仓库根；这份文件名的唯一定义在这里。 */
export const WORKSPACE_FILE = 'pnpm-workspace.yaml'

/**
 * 从 `start` 逐级向上找到 `pnpm-workspace.yaml`，返回它所在的目录。
 *
 * 不按目录深度写 `../..`：那种写法在文件搬家时静默指向别处，读到的就是另一份配置。
 * 门禁的失败语义必须是「检查不通过」，不能是「检查跑在了错的目录上」，所以找不到就抛。
 */
export function getWorkspaceRoot(start: string): string {
  let directory = path.resolve(start)
  for (;;) {
    if (fs.existsSync(path.join(directory, WORKSPACE_FILE))) return directory
    const parent = path.dirname(directory)
    if (parent === directory) throw new Error(`monorepo-kit: cannot find ${WORKSPACE_FILE} above ${start}`)
    directory = parent
  }
}
