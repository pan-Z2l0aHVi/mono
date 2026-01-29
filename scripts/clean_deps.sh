#!/usr/bin/env bash
# scripts/clean.sh
# 用途: 清理 pnpm + turborepo monorepo 常见的缓存、依赖、锁文件等
# 使用方式:
# bash scripts/clean.sh          ← 普通清理
# bash scripts/clean.sh --full   ← 更彻底的清理（包括所有子包 node_modules）

set -euo pipefail

echo "开始清理项目..."

# =====================================
# 核心清理目标（几乎所有项目都适用）
# =====================================
rm -rf node_modules                     2>/dev/null || true
rm -rf .turbo/cache                     2>/dev/null || true
rm -rf node_modules/.cache/turbo        2>/dev/null || true
rm -rf .vite                            2>/dev/null || true
rm -f   pnpm-lock.yaml                  2>/dev/null || true

# vite 相关缓存（开发&构建）
rm -rf **/.vite                         2>/dev/null || true

# 常见构建产物（可选，根据项目需要保留或删除）
# rm -rf **/dist **/build **/.next        2>/dev/null || true

echo "已清理根目录 node_modules、turbo 缓存、vite 缓存、pnpm-lock.yaml"

# =====================================
# 更彻底的清理（--full 参数触发）
# =====================================
if [[ "${1:-}" == "--full" || "${1:-}" == "-f" ]]; then
  echo "执行彻底清理（包括所有子包的 node_modules）..."

  # 清理所有子包的 node_modules 和 .vite 缓存
  find . -type d \( -name "node_modules" -o -name ".vite" -o -name ".turbo" \) \
    -not -path "./node_modules/*" \
    -exec rm -rf {} + 2>/dev/null || true

  # 再次清理根目录（以防 find 漏掉）
  rm -rf node_modules .turbo .vite 2>/dev/null || true

  echo "彻底清理完成"
else
  echo "只清理了主要缓存。如需清理所有子包 node_modules，请使用："
  echo "  bash scripts/clean.sh --full"
fi

echo ""
echo "清理完毕！接下来建议执行："
echo "  pnpm install"
