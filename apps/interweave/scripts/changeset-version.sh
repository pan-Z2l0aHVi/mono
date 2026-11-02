#!/bin/sh
# 版本 PR 编排入口（changeset-version.yml 的 version-script）：必须以仓库根为 cwd 运行。
# 先 `changeset version` 升级全部 workspace；本 app 版本被升级时（privatePackages.version: true）
# 调用同目录 sync:version 把新版本追平进 Wails 构建产物；`packages/web-ui/CHANGELOG.md` 是 demo
# 文档 meta 的输入，被改写时要重生成两端 demo 的 `src/generated/**`，否则版本 PR 的 CI 校验会红。
set -eu

pnpm exec changeset version

status=0
git diff --quiet -- apps/interweave/package.json || status=$?

if [ "$status" -eq 1 ]; then
  pnpm --filter @greypan/interweave run sync:version
elif [ "$status" -ne 0 ]; then
  exit "$status"
fi

changelog=0
git diff --quiet -- packages/web-ui/CHANGELOG.md || changelog=$?

if [ "$changelog" -eq 1 ]; then
  pnpm --filter @greypan/md-to-meta run build
  node scripts/generate/regenerate-md-to-meta-artifacts.mjs \
    apps/react-web-ui-demo apps/vue-web-ui-demo
elif [ "$changelog" -ne 0 ]; then
  exit "$changelog"
fi
