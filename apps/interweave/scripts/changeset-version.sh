#!/bin/sh
# 版本 PR 编排入口（changeset-version.yml 的 version-script）：必须以仓库根为 cwd 运行。
# 先 `changeset version` 升级全部 workspace；本 app 版本被升级时（privatePackages.version: true）
# 调用同目录 sync:version 把新版本追平进 Wails 构建产物；`packages/{web-ui,js-kit,browser-kit}/CHANGELOG.md`
# 是各 demo 文档 meta 的输入，被改写时要重生成对应 demo 的 `src/generated/**`，否则版本 PR 的 CI 校验会红。
set -eu

pnpm exec changeset version

status=0
git diff --quiet -- apps/interweave/package.json || status=$?

if [ "$status" -eq 1 ]; then
  pnpm --filter @greypan/interweave run sync:version
elif [ "$status" -ne 0 ]; then
  exit "$status"
fi

web_ui_changelog=0
git diff --quiet -- packages/web-ui/CHANGELOG.md || web_ui_changelog=$?

if [ "$web_ui_changelog" -eq 1 ]; then
  # 重生成脚本要求值宿主 vite.config.ts，而版本 job 不跑宿主 build；只构建两端 demo 的依赖闭包
  # （不含 demo 自身），workspace 包的 dist 才齐全。
  pnpm exec turbo run build \
    --filter='@greypan/react-web-ui-demo^...' \
    --filter='@greypan/vue-web-ui-demo^...'
  node scripts/generate/regenerate-md-to-meta-artifacts.mjs \
    apps/react-web-ui-demo apps/vue-web-ui-demo
elif [ "$web_ui_changelog" -ne 0 ]; then
  exit "$web_ui_changelog"
fi

dev_kit_changelog=0
git diff --quiet -- packages/js-kit/CHANGELOG.md packages/browser-kit/CHANGELOG.md || dev_kit_changelog=$?

if [ "$dev_kit_changelog" -eq 1 ]; then
  pnpm exec turbo run build --filter='@greypan/dev-kit-demo^...'
  node scripts/generate/regenerate-md-to-meta-artifacts.mjs apps/dev-kit-demo
elif [ "$dev_kit_changelog" -ne 0 ]; then
  exit "$dev_kit_changelog"
fi
