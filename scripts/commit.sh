#!/usr/bin/env bash
# commit.sh — 非交互式 conventional commit，绕过 git-cz 的 TTY 依赖
#
# 用法:
#   bash scripts/commit.sh <type> <scope> <subject> [-b "body line"]
#
# 参数:
#   type     - 提交类型（必填）
#   scope    - 作用域（必填）
#   subject  - 提交描述（必填）
#   -b       - 可选 body（可多次使用，每次一行）
#   --dry    - 仅显示 commit message，不实际提交
#
# type 白名单（与 commitlint.config.js 同步）:
#   build | chore | ci | docs | feat | fix | perf | refactor | revert | style | test
#
# scope 白名单:
#   root | apps | packages | js-kit | browser-kit | web-ui | unplugin-web-components |
#   vite-plugin-full-reload | react-app-demo | vue-app-demo
#   支持逗号分隔多 scope: "browser-kit,web-ui"
#
# emoji 前缀（自动添加，与 git-cz 风格一致）:
#   feat: ✨  fix: 🐛  docs: 📚  style: 💎  refactor: 📦
#   perf: 🚀  test: 🚨  build: 🛠  ci: ⚙️  chore: ♻️  revert: 🗑

set -euo pipefail

# ── 解析参数 ──
BODY_LINES=()
DRY_RUN=false

parse_args() {
  while [ $# -gt 0 ]; do
    case "$1" in
      -b)
        shift
        BODY_LINES+=("$1")
        ;;
      --dry)
        DRY_RUN=true
        ;;
      *)
        if [ -z "${TYPE:-}" ]; then
          TYPE="$1"
        elif [ -z "${SCOPE:-}" ]; then
          SCOPE="$1"
        elif [ -z "${SUBJECT:-}" ]; then
          SUBJECT="$1"
        fi
        ;;
    esac
    shift
  done
}

parse_args "$@"

if [ -z "${TYPE:-}" ] || [ -z "${SCOPE:-}" ] || [ -z "${SUBJECT:-}" ]; then
  echo "用法: bash scripts/commit.sh <type> <scope> <subject> [-b \"body\"] [--dry]" >&2
  echo "" >&2
  echo "示例:" >&2
  echo "  bash scripts/commit.sh feat js-kit \"add url parser utility\"" >&2
  echo "  bash scripts/commit.sh fix web-ui,js-kit \"resolve hydration mismatch\" -b \"Fix race condition in SSR\"" >&2
  echo "" >&2
  echo "type 白名单: build | chore | ci | docs | feat | fix | perf | refactor | revert | style | test" >&2
  echo "scope 白名单: root | apps | packages | js-kit | browser-kit | web-ui | unplugin-web-components | vite-plugin-full-reload | react-app-demo | vue-app-demo" >&2
  exit 1
fi

# ── emoji 映射（与 commitlint.config.js 的 prompt.questions.type.enum 同步） ──
get_emoji() {
  case "$1" in
    feat)     echo "✨" ;;
    fix)      echo "🐛" ;;
    docs)     echo "📚" ;;
    style)    echo "💎" ;;
    refactor) echo "📦" ;;
    perf)     echo "🚀" ;;
    test)     echo "🚨" ;;
    build)    echo "🛠" ;;
    ci)       echo "⚙️" ;;
    chore)    echo "♻️" ;;
    revert)   echo "🗑" ;;
    *)        echo "" ;;
  esac
}

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

# ── 构建 commit message ──
EMOJI=$(get_emoji "$TYPE")
HEADER="${TYPE}(${SCOPE}): ${SUBJECT}"

# ── 显示预览 ──
echo "" >&2
echo "📝 Commit message:" >&2
if [ -n "$EMOJI" ]; then
  echo "   ${EMOJI} ${HEADER}" >&2
else
  echo "   ${HEADER}" >&2
fi

if [ ${#BODY_LINES[@]} -gt 0 ]; then
  echo "" >&2
  echo "   Body:" >&2
  for line in "${BODY_LINES[@]}"; do
    echo "   ${line}" >&2
  done
fi
echo "" >&2

# ── dry-run 模式 ──
if [ "$DRY_RUN" = true ]; then
  echo "(dry-run, 未实际提交)" >&2
  exit 0
fi

# ── 提交 ──
# 注意：commitlint 不支持 emoji 前缀，所以实际提交时只用 HEADER
BODY_ARGS=()
for line in "${BODY_LINES[@]}"; do
  BODY_ARGS+=(-m "$line")
done

GIT_EDITOR=true git commit -m "${HEADER}" "${BODY_ARGS[@]}"
