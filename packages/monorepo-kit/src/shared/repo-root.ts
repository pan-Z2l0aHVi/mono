import fs from 'node:fs'
import path from 'node:path'

// 仓库根的唯一定义：向上查找 pnpm-workspace.yaml。
// 按目录深度写 `../..` 在文件搬家时会静默指向别处——迁移期已经在这个维度上错过一次
// （`apps/interweave/frontend` 比 `packages/web-ui` 深一层）。门禁的失败语义必须是
// 「检查不通过」，不能是「检查跑在了错的目录上」。
const WORKSPACE_FILE = 'pnpm-workspace.yaml'

export function findRepoRoot(start: string = import.meta.dirname): string {
  let directory = path.resolve(start)
  for (;;) {
    if (fs.existsSync(path.join(directory, WORKSPACE_FILE))) return directory
    const parent = path.dirname(directory)
    if (parent === directory) throw new Error(`monorepo-kit: cannot find ${WORKSPACE_FILE} above ${start}`)
    directory = parent
  }
}
