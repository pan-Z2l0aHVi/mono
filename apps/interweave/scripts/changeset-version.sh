#!/bin/sh
# 版本 PR 编排入口（changeset-version.yml 的 version-script）：必须以仓库根为 cwd 运行。
# 先 `changeset version` 升级全部 workspace；本 app 版本被升级时（privatePackages.version: true）
# 调用同目录 sync:version 把新版本追平进 Wails 构建产物。
set -eu

pnpm exec changeset version

status=0
git diff --quiet -- apps/interweave/package.json || status=$?

if [ "$status" -eq 1 ]; then
  pnpm --filter @greypan/interweave run sync:version
elif [ "$status" -ne 0 ]; then
  exit "$status"
fi
