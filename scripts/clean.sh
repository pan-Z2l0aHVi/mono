#!/usr/bin/env bash
# scripts/clean.sh

set -euo pipefail

# 安全检查：确保在项目根目录执行
if [ ! -f "pnpm-workspace.yaml" ]; then
  echo "❌ 错误: 请在项目根目录下运行此脚本"
  exit 1
fi

echo "🧹 开始清理项目..."

# 1. 停止可能占用文件的进程 (可选，按需开启)
# 裸 "vite"/"wails" 会匹配命令行任意位置的子串（如编辑器在名为 vite 的目录中打开的会话），
# 因此用仓库根路径锚定本仓库的开发进程：根路径先经 ERE 转义再拼入模式，并要求其后跟
# 分隔符，避免误匹配共享路径前缀的其他目录。wails3 主进程的二进制在仓库外（mise shim），
# 命令行不含仓库路径，改用精确进程名匹配（-x 不做子串匹配）兜底。
REPO_ROOT_RE=$(printf '%s' "$PWD" | sed 's/[][\\.*^$()+?{}|]/\\&/g')
pkill -f "${REPO_ROOT_RE}[/[:space:]].*(vite|wails)" || true
pkill -x wails3 || true

# 2. 清理核心构建产物与缓存
# 使用 find 替代 globstar，兼容性更好且更精确
echo "🧹 清理构建产物与开发缓存..."
# 清理所有 dist, build, .vite, .turbo 文件夹。
# Wails 的 build 目录包含 Taskfile、平台模板和打包资源，必须保留。
find . \
  -path "./apps/interweave/build" -prune -o \
  -type d \( -name "dist" -o -name "build" -o -name ".vite" -o -name ".turbo" -o -name "out" \) \
  -not -path "*/node_modules/*" \
  -exec rm -rf {} + 2>/dev/null || true

# 3. 更彻底的清理 (--full)
if [[ "${1:-}" == "--full" || "${1:-}" == "-f" ]]; then
  echo "🧹 模式: 彻底清理 (node_modules & locks)..."

  # 清理所有 node_modules
  find . -name "node_modules" -type d -prune -exec rm -rf {} +

  # 清理锁文件
  rm -f pnpm-lock.yaml 2>/dev/null || true

  echo "🔔 彻底清理完成"
else
  echo "🔔 提示: 子包 node_modules 已保留。如需全量重置，请使用 --full"
fi

echo "✨ 清理完毕！"
echo "🔨 建议执行: pnpm install"
