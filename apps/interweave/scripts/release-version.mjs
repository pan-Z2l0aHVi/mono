// 版本 PR 编排入口（changeset-version.yml 的 version-script）：必须以仓库根为 cwd 运行。
// 先 `changeset version` 升级全部 workspace；本 app 版本被升级时（privatePackages.version: true）
// 调用同目录 sync:version 把新版本追平进 Wails 构建产物。
import { spawnSync } from 'node:child_process'

function run(command, args) {
  const result = spawnSync(command, args, { stdio: 'inherit' })

  if (result.error) {
    throw result.error
  }
  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }
}

run('pnpm', ['exec', 'changeset', 'version'])

const versionChanged = spawnSync('git', ['diff', '--quiet', '--', 'apps/interweave/package.json'])

if (versionChanged.error) {
  throw versionChanged.error
}
if (versionChanged.status === 1) {
  run('pnpm', ['--filter', '@greypan/interweave', 'run', 'sync:version'])
} else if (versionChanged.status !== 0) {
  process.exit(versionChanged.status ?? 1)
}
