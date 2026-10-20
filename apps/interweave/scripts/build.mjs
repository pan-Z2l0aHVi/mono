// 平台分发构建脚本（开发者默认路径）：
// - macOS：编译宿主原生二进制并打成 `.app` bundle
// - Windows：仅编译 Windows EXE
// - Linux：仅构建前端（CI 环境，不编译 Go）
//
// 两条事实决定了这个默认形状。两条都由 .github/scripts/lib/workflow-topology.test.mjs 的断言钉住，改这里之前先看那份测试：
//
// 1. 只做宿主平台。`build:windows` 在 darwin 上是交叉编译，而它的消费者只有
//    `wails-verify.yml` / `wails-release.yml` 矩阵里的 `windows-latest` runner——那两边在矩阵里直接调
//    `build:windows`，在 Windows 宿主上原生编译。
// 2. 默认不做 DMG 打包。`.dmg` 的消费者同样只有上面那个 `macos-14` 矩阵项；本地启动用 `.app`
//    bundle 就够，而 `hdiutil` 打包是单步最贵的一段。需要 DMG 时显式跑 `build:macos`。
//
// 「CI 完全不碰这个脚本」不是这里的前提，恰恰相反：`ci.yml` 在 ubuntu runner 上跑根 `pnpm run build`，
// turbo 会把它扇出到 `node scripts/build.mjs`——在 Linux 上取 `build:frontend` 这一支，不编译 Go。
// 真正的前提是**没有任何 CI runner 执行到 darwin 这一支**：桌面产物的验证面固定为上面两条矩阵，
// 它们不走聚合脚本。聚合脚本一旦被改成宿主相关（例如上面第 1 条裁掉的交叉编译），矩阵必须继续
// 直接调子脚本，否则 Windows 产物就不再被构建——workflow-topology.test.mjs 为此断言矩阵命令不是 `build`。
//
// Go/Wails 桌面编译仍由 wails-verify.yml 单独覆盖（macOS/Windows runner）。
// Linux CI 无需安装 GTK/WebKit 系统库。
import { spawnSync } from 'node:child_process'

const scripts =
  process.platform === 'darwin'
    ? ['build:macos:app']
    : process.platform === 'win32'
      ? ['build:windows']
      : ['build:frontend']

const pnpm = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm'

for (const script of scripts) {
  const result = spawnSync(pnpm, ['run', script], { stdio: 'inherit' })

  if (result.error) {
    throw result.error
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }
}
