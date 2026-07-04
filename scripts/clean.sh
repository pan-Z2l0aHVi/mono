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
pkill -f "vite" || true
pkill -f "wails" || true

# 2. 清理核心构建产物与缓存
# 使用 find 替代 globstar，兼容性更好且更精确
echo "🧹 清理构建产物与开发缓存..."
# 清理所有 dist, build, .vite, .turbo 文件夹
find . -type d \( -name "dist" -o -name "build" -o -name ".vite" -o -name ".turbo" -o -name "out" \) \
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
