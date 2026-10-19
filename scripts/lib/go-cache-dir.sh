#!/bin/sh
# 供 .mise.toml 的 [env] 模板在 Node 可用前调用：选择跨 worktree 共享的 Go 构建缓存目录。
# Tera 要求该命令永远 exit 0 且只输出一行；降级顺序与测试要求见 docs/agents/worktree.md。
set -u

home=${HOME:-/nonexistent}
if [ "$(uname -s 2>/dev/null)" = Darwin ]; then
  first="$home/Library/Caches/go-build"
  second="$home/.cache/go-build"
else
  first="$home/.cache/go-build"
  second="$home/Library/Caches/go-build"
fi
fallback="${TMPDIR:-/tmp}/greypan/go-build"
probe=".herdr-gocache-probe.$$"

for dir in "$first" "$second"; do
  if (mkdir -p "$dir" && touch "$dir/$probe") 2>/dev/null; then
    rm -f "$dir/$probe" 2>/dev/null
    printf '%s\n' "$dir"
    exit 0
  fi
done

printf '%s\n' "$fallback"
