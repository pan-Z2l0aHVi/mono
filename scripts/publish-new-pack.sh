#!/usr/bin/env bash
# scripts/publish-new-pack.sh — 新增子包的首次手动发版
#
# 用法:
#   bash scripts/publish-new-pack.sh <package-dir>
#
# 示例:
#   bash scripts/publish-new-pack.sh my-new-kit
#
# 前提: 已执行 npm login --registry https://registry.npmjs.org/

set -euo pipefail

if [ $# -lt 1 ]; then
  echo "用法: bash scripts/publish-first.sh <package-dir>" >&2
  exit 1
fi

PKG_DIR="packages/$1"

if [ ! -d "$PKG_DIR" ]; then
  echo "❌ 包目录不存在: $PKG_DIR" >&2
  exit 1
fi

echo "📦 首次发布 @greypan/$1 ..."

echo "→ 构建..."
pnpm build

echo "→ 发布..."
(cd "$PKG_DIR" && npm publish --access public --registry https://registry.npmjs.org/)

echo ""
echo "✅ @greypan/$1 发布成功！"
echo ""
echo "🔐 接下来去 npmjs.com → @greypan/$1 → Settings → Trusted Publisher 配置："
echo "   Organization: pan-Z2l0aHVi"
echo "   Repository:   mono"
echo "   Workflow:     release.yml"
echo ""
echo "   配好之后，后续所有发版只需 git tag && git push --tags。"
