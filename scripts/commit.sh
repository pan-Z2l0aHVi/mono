#!/usr/bin/env bash
# commit.sh — 非交互式 conventional commit，绕过 git-cz 的 TTY 依赖
#
# 用法:
#   bash scripts/commit.sh <type> <scope> <subject> [body_line...]
#
# type 白名单（与 commitlint.config.js 同步）:
#   build | chore | ci | docs | feat | fix | perf | refactor | revert | style | test
#
# scope 白名单:
#   root | js-kit | browser-kit | web-ui | unplugin-web-components |
#   vite-plugin-full-reload | react-app-demo | vue-app-demo
#   支持逗号分隔多 scope: "browser-kit,web-ui"

set -euo pipefail

if [ $# -lt 3 ]; then
  echo "用法: bash scripts/commit.sh <type> <scope> <subject> [body_line...]" >&2
  exit 1
fi

# ── stash 泄漏守卫 ──
# vp staged 的 git stash push/pop 可能将旧的未提交变更残留到工作区。
# 如果出现预期外的 delete/rename，很可能是 stash 泄漏，应拒绝提交。
LEAKED=$(git diff --name-status --diff-filter=DR 2>/dev/null || true)
if [ -n "$LEAKED" ]; then
  echo "❌ 检测到 stash 泄漏，以下文件不在本次提交范围内：" >&2
  echo "$LEAKED" >&2
  echo "" >&2
  echo "   请先手动清理这些变更（git stash / git restore / git clean），再重新提交。" >&2
  exit 1
fi

TYPE="$1"
SCOPE="$2"
SUBJECT="$3"
shift 3

HEADER="${TYPE}(${SCOPE}): ${SUBJECT}"

BODY_ARGS=()
for line in "$@"; do
  BODY_ARGS+=(-m "$line")
done

GIT_EDITOR=true git commit -m "$HEADER" "${BODY_ARGS[@]}"
