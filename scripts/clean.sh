#!/usr/bin/env bash

# scripts/clean.sh — 清理本仓库的构建产物、依赖与可再生缓存。
#
# 用法:
#   pnpm clean              默认 = 全量：构建产物 + node_modules + 全部缓存（含 turbo cache）
#   pnpm clean --locks      额外删除 pnpm-lock.yaml
#   pnpm clean --dry-run    只打印将要删除的路径，不执行删除
#
# 为什么默认不含 pnpm-lock.yaml:
#   它是 tracked 文件，且 AGENTS.md 把「依赖与 lockfile」列为需逐次授权的操作。旧实现在
#   `--full` 下顺手删掉它，等于把「全量清空」悄悄升级成「删锁」这一默认行为升级，不该默认发生。
#   想要重置 lockfile 必须显式 `--locks`。
#
# 兼容性：package.json 用 `bash scripts/clean.sh` 调用，macOS 自带 /bin/bash 是 3.2，因此本脚本
# 只用 bash 3.2 可用的语法（无 mapfile / declare -A / ${var^^}）。

set -euo pipefail

usage() {
  cat <<'EOF'
用法: pnpm clean [--locks] [--dry-run]

两档语义（第二档必须显式 opt-in）:
  (默认)    构建产物 + node_modules + 全部可再生缓存（含 git common dir 下的 turbo cache）
  --locks   额外删除 pnpm-lock.yaml（tracked 文件，需逐次授权，默认不做）

选项:
  --dry-run    只打印将要删除的路径，不执行删除
  -h, --help   显示本帮助

示例:
  pnpm clean                 # 全量清空，保留 pnpm-lock.yaml
  pnpm clean --dry-run       # 先看会删什么
  pnpm clean --locks         # 连 pnpm-lock.yaml 一起删
EOF
}

# ---------------------------------------------------------------- 参数解析

DO_LOCKS=0
DRY_RUN=0

for arg in "$@"; do
  case "$arg" in
    --locks)
      DO_LOCKS=1
      ;;
    --dry-run)
      DRY_RUN=1
      ;;
    -h | --help)
      usage
      exit 0
      ;;
    --full | -f)
      echo "❌ 错误: --full 已移除。默认档现在就是全量清空。" >&2
      echo "   如需一并删除 pnpm-lock.yaml，请显式使用 --locks。" >&2
      exit 1
      ;;
    *)
      echo "❌ 错误: 未知参数 '$arg'" >&2
      echo >&2
      usage >&2
      exit 1
      ;;
  esac
done

# ---------------------------------------------------------------- 前置检查

# 安全检查：确保在项目根目录执行
if [ ! -f "pnpm-workspace.yaml" ]; then
  echo "❌ 错误: 请在项目根目录下运行此脚本" >&2
  exit 1
fi

# turbo cache 按 .mise.toml 的 TURBO_CACHE_DIR 锚定在 git common dir（主仓与全部 worktree 共享），
# 不在工作目录里，find 摸不到，必须用同一套 git rev-parse 逻辑解析。
#
# 上面那个检查只保证「是 monorepo 根」，不保证「在 git 仓里」：一份 git archive 或一份拷贝出来的
# 目录树同样带 pnpm-workspace.yaml，而 git rev-parse 在非 git 目录直接失败。默认档承诺清掉 turbo
# cache，所以这里必须 fail-fast 并说清原因，而不是让 git 的报错漏到后面某一行。
if ! GIT_COMMON_DIR=$(git rev-parse --path-format=absolute --git-common-dir 2>/dev/null); then
  echo "❌ 错误: 无法解析 git common dir，当前目录不在 git 仓库/worktree 内。" >&2
  echo "   turbo cache 锚定在 <git-common-dir>/turbo-cache（见 .mise.toml 的 TURBO_CACHE_DIR），" >&2
  echo "   没有它就无法定位并清理共享缓存。请在 git 仓库内运行本脚本。" >&2
  exit 1
fi

TURBO_CACHE_DIR="$GIT_COMMON_DIR/turbo-cache"

echo "🧹 开始清理项目..."
echo "   git common dir: $GIT_COMMON_DIR"
if [ "$DO_LOCKS" -eq 1 ]; then
  echo "   附加档: --locks（删除 pnpm-lock.yaml）"
fi
if [ "$DRY_RUN" -eq 1 ]; then
  echo "   模式: --dry-run（只打印，不删除）"
fi

# ---------------------------------------------------------------- 停进程

# 1. 停止可能占用文件的进程 (可选，按需开启)
# 裸 "vite"/"wails" 会匹配命令行任意位置的子串（如编辑器在名为 vite 的目录中打开的会话），
# 因此用仓库根路径锚定本仓库的开发进程：根路径先经 ERE 转义再拼入模式，并要求其后跟
# 分隔符，避免误匹配共享路径前缀的其他目录。wails3 主进程的二进制在仓库外（mise shim），
# 命令行不含仓库路径，改用精确进程名匹配（-x 不做子串匹配）兜底。
# --dry-run 下必须跳过：它的契约是「只打印将删什么，不产生任何副作用」，而 pkill 是杀进程这种
# 不可逆的副作用——在只读预览里把开发者的 dev server 弄停，恰恰是这个模式要避免的那种意外。
if [ "$DRY_RUN" -eq 1 ]; then
  echo "🔎 dry-run: 不停止 vite/wails 进程"
else
  REPO_ROOT_RE=$(printf '%s' "$PWD" | sed 's/[][\\.*^$()+?{}|]/\\&/g')
  pkill -f "${REPO_ROOT_RE}[/[:space:]].*(vite|wails)" || true
  pkill -x wails3 || true
fi

# ---------------------------------------------------------------- 删除辅助

# 把 find 的结果收进数组，拿到确切计数后再删：既满足「输出要能看出清了什么」，也避免为了计数把
# find 跑两遍。目标本来就不存在时 find 静默返回空，数组为空即「本来就没有」，天然幂等可重跑。
collect() {
  COLLECTED=()
  local line
  while IFS= read -r line; do
    [ -n "$line" ] || continue
    COLLECTED[${#COLLECTED[@]}]="$line"
  done
}

# 打印摘要：计数 + 少量样例路径。样例封顶 5 条，避免 node_modules 这种几十项的清单刷屏。
report() {
  local label="$1"
  shift
  local -a items=("$@")
  local total=${#items[@]}
  if [ "$total" -eq 0 ]; then
    printf '   %-16s 无\n' "$label"
    return 0
  fi
  printf '   %-16s %d 项\n' "$label" "$total"
  local i=0
  for item in "${items[@]}"; do
    [ "$i" -ge 5 ] && break
    printf '     - %s\n' "$item"
    i=$((i + 1))
  done
  if [ "$total" -gt 5 ]; then
    printf '     - ...（另有 %d 项）\n' "$((total - 5))"
  fi
}

remove_all() {
  [ "$#" -eq 0 ] && return 0
  [ "$DRY_RUN" -eq 1 ] && return 0
  rm -rf -- "$@" 2>/dev/null || true
}

# ---------------------------------------------------------------- 1. 构建产物与工作区缓存

# 使用 find 替代 globstar，兼容性更好且更精确
# Wails 的 build 目录包含 Taskfile、平台模板和打包资源，必须保留。
# .git 一并 prune：它在 find 的遍历开销里占比最大（worktree 下 .git 是文件，主仓下是对象库），
# 而且绝不该把对象库里的目录名当产物删掉。
echo "🧹 清理构建产物与开发缓存..."
collect < <(
  find . \
    -path "./apps/interweave/build" -prune -o \
    -name ".git" -prune -o \
    \( -type d \( -name "dist" -o -name "dist-ssr" -o -name "dev-dist" -o -name "build" \
    -o -name "out" -o -name "coverage" -o -name ".turbo" -o -name ".vite" \
    -o -name ".cache" -o -name ".temp" -o -name ".storage" \) \
    -o -type f \( -name "*.tsbuildinfo" -o -name ".eslintcache" -o -name ".stylelintcache" \
    -o -name ".cspellcache" -o -name ".prettiercache" \) \) \
    -not -path "*/node_modules/*" \
    -print 2>/dev/null || true
)
report "构建产物/缓存" ${COLLECTED[@]+"${COLLECTED[@]}"}
remove_all ${COLLECTED[@]+"${COLLECTED[@]}"}

# ---------------------------------------------------------------- 2. node_modules

# vp（vite-plus）的 task cache 落在 <root>/node_modules/.vite/task-cache（见 vite-plus 文档
# guide/cache.md），也就是在 node_modules 里面，所以本档顺带覆盖了它，不需要单独一条清理项。
#
# 全局目录 ~/.vite-plus 不在此列：那是 vite-plus 自己的工具链安装（node runtime、package
# manager、版本目录，量级在 GB），不是本仓库的可再生缓存，由项目级 clean 去删会毁掉用户工具链。
echo "🧹 清理 node_modules..."
collect < <(find . -name "node_modules" -type d -prune -print 2>/dev/null || true)
report "node_modules" ${COLLECTED[@]+"${COLLECTED[@]}"}
remove_all ${COLLECTED[@]+"${COLLECTED[@]}"}

# ---------------------------------------------------------------- 3. turbo cache（共享目录）

echo "🧹 清理 turbo cache..."
if [ -d "$TURBO_CACHE_DIR" ]; then
  report "turbo cache" "$TURBO_CACHE_DIR"
  remove_all "$TURBO_CACHE_DIR"
else
  # 注意：report 按参数个数计数，传空串会被算成 1 项并打印出一条空路径，所以「没有」要一个参数都不传。
  report "turbo cache"
fi

# ---------------------------------------------------------------- 4. lockfile（需 --locks）

if [ "$DO_LOCKS" -eq 1 ]; then
  echo "🧹 删除 pnpm-lock.yaml（--locks）..."
  if [ -f "pnpm-lock.yaml" ]; then
    report "pnpm-lock.yaml" "pnpm-lock.yaml"
    remove_all "pnpm-lock.yaml"
  else
    report "pnpm-lock.yaml"
  fi
else
  echo "🔔 保留 pnpm-lock.yaml（如需删除请用 --locks）"
fi

echo ""
if [ "$DRY_RUN" -eq 1 ]; then
  echo "✨ dry-run 结束，未删除任何文件。"
else
  echo "✨ 清理完毕！"
  echo "🔨 建议执行: pnpm install"
fi
