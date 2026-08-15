// 平台分发构建脚本：
// - macOS：交叉编译 macOS DMG + Windows EXE（开发者机器）
// - Windows：仅编译 Windows EXE
// - Linux：仅构建前端（CI 环境，不编译 Go）
//
// Go/Wails 桌面编译由 wails-verify.yml 单独覆盖（macOS/Windows runner）。
// Linux CI 无需安装 GTK/WebKit 系统库。
import { spawnSync } from 'node:child_process'

const scripts =
  process.platform === 'darwin'
    ? ['build:macos', 'build:windows']
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
