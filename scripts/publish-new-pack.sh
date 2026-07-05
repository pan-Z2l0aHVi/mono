#!/usr/bin/env bash
# scripts/publish-new-pack.sh — 新增子包的首次手动发版（走 changeset 流程）
#
# 用法:
#   bash scripts/publish-new-pack.sh <package-dir> [bump-type]
#
# 示例:
#   bash scripts/publish-new-pack.sh my-new-kit          # 默认 major → 1.0.0
#   bash scripts/publish-new-pack.sh my-new-kit minor    # → 0.1.0
#
# bump-type: major | minor | patch（默认 major）
#
# 前提: 已执行 npm login --registry https://registry.npmjs.org/

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

if [ $# -lt 1 ]; then
  echo "用法: bash scripts/publish-new-pack.sh <package-dir> [major|minor|patch]" >&2
  exit 1
fi

PKG_NAME="$1"
PKG_DIR="packages/$PKG_NAME"
BUMP="${2:-major}"

if [ ! -d "$PKG_DIR" ]; then
  echo -e "${RED}❌ 包目录不存在: $PKG_DIR${NC}" >&2
  exit 1
fi

PACKAGE_JSON="$PKG_DIR/package.json"
PKG_VERSION=$(grep '"version"' "$PACKAGE_JSON" | sed 's/.*"\(.*\)".*/\1/')

echo -e "${GREEN}📦 首次发布 @greypan/$PKG_NAME${NC}"
echo "   当前版本: $PKG_VERSION"
echo "   bump 类型: $BUMP"

# 生成 changeset
CHANGESET_FILE=".changeset/publish-$PKG_NAME.md"
cat > "$CHANGESET_FILE" <<EOF
---
"@greypan/$PKG_NAME": $BUMP
---

首次发布 @greypan/$PKG_NAME
EOF

echo -e "${YELLOW}→ 创建 changeset: $CHANGESET_FILE${NC}"

# 消耗 changeset，更新版本号
echo "→ 更新版本号..."
mise x -- pnpm changeset version

NEW_VERSION=$(grep '"version"' "$PACKAGE_JSON" | sed 's/.*"\(.*\)".*/\1/')
echo "   新版本: $NEW_VERSION"

# 构建
echo "→ 构建..."
mise x -- pnpm build

# 发布
echo "→ 发布..."
mise x -- pnpm changeset publish

echo ""
echo -e "${GREEN}✅ @greypan/$PKG_NAME@$NEW_VERSION 发布成功！${NC}"
echo ""
echo "🔐 接下来去 npmjs.com → @greypan/$PKG_NAME → Settings → Trusted Publisher 配置："
echo "   Organization: pan-Z2l0aHVi"
echo "   Repository:   mono"
echo "   Workflow:     release.yml"
echo ""
echo "   配好之后，后续所有发版只需 git tag && git push --tags。"
echo ""
echo "⚠️  别忘了提交 changeset 产生的 CHANGELOG 和版本变更："
echo "   git add -A && git commit -m 'chore: publish @greypan/$PKG_NAME' && git push"
