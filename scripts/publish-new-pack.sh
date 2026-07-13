#!/usr/bin/env bash
# scripts/publish-new-pack.sh — 新增子包的首次发版（直接发布 1.0.0）
#
# 用法:
#   bash scripts/publish-new-pack.sh <package-dir>
#
# 示例:
#   bash scripts/publish-new-pack.sh my-new-kit
#
# 前提: 已执行 npm login --registry https://registry.npmjs.org/
# 或本地 .npmrc 已配置 Automation token。

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# ── 参数校验 ──
if [ $# -lt 1 ]; then
  echo "用法: bash scripts/publish-new-pack.sh <package-dir>" >&2
  exit 1
fi

PKG_NAME="$1"
PKG_DIR="packages/$PKG_NAME"

if [ ! -d "$PKG_DIR" ]; then
  echo -e "${RED}❌ 包目录不存在: $PKG_DIR${NC}" >&2
  exit 1
fi

PACKAGE_JSON="$PKG_DIR/package.json"

if [ ! -f "$PACKAGE_JSON" ]; then
  echo -e "${RED}❌ package.json 不存在: $PACKAGE_JSON${NC}" >&2
  exit 1
fi

# 用 node 提取版本号
PKG_VERSION=$(node -e "console.log(require('./$PACKAGE_JSON').version)")

if [ "$PKG_VERSION" != "1.0.0" ]; then
  echo -e "${RED}❌ 版本号必须是 1.0.0，当前: $PKG_VERSION${NC}" >&2
  echo "   新包首次发版固定为 1.0.0" >&2
  exit 1
fi

echo -e "${GREEN}📦 首次发布 @greypan/$PKG_NAME@1.0.0${NC}"

# ── 构建 ──
echo "→ 构建..."
mise x -- pnpm build

# ── 发布 ──
echo "→ 发布..."
cd "$PKG_DIR"
mise x -- npm publish --registry https://registry.npmjs.org/
cd -

echo ""
echo -e "${GREEN}✅ @greypan/$PKG_NAME@1.0.0 发布成功！${NC}"
echo ""
echo "🔐 接下来去 npmjs.com → @greypan/$PKG_NAME → Settings → Trusted Publisher 配置："
echo "   Organization: pan-Z2l0aHVi"
echo "   Repository:   mono"
echo "   Workflow:     release.yml"
echo ""
echo "   配好之后，后续所有发版只需 git tag && git push --tags。"
